import { MAX_MOBS } from '../../constants'
import type { Mob } from '../../types'
import { getObjectiveMode, type ObjectiveModeId } from '../modes/definitions'
import {
  advanceObjective, createObjectiveState, evaluateObjective, getObjectiveDifficulty,
  type ObjectiveDifficulty, type ObjectiveEvaluation, type ObjectiveState,
} from './evaluator'

export interface ObjectiveSpawnPlan {
  readonly bossStage: number | null
  readonly waveIndex: number | null
  readonly relicIndex: number | null
  readonly eventIndex: number | null
}

export interface ObjectiveRuntime {
  snapshot(): ObjectiveState
  evaluate(): ObjectiveEvaluation
  difficulty(): ObjectiveDifficulty
  /** Readiness is NOT spawn/completion. The host must actually create the encounter/item. */
  plan(): ObjectiveSpawnPlan
  /** Only call with active simulation dt. Passing false pauses the entire objective bridge. */
  tick(seconds: number, playing?: boolean): void
  /** Call only after the corresponding real actor/item/event was created. */
  spawnBoss(stage: number, actor: Mob): boolean
  spawnWave(index: number, actors: readonly Mob[]): boolean
  registerRelic(index: number, pickup: object): boolean
  registerEvent(index: number, event: object): boolean
  /** Invoke after the existing combat 'kill' event and XP attribution are finalized. */
  defeatMob(actor: Mob): boolean
  /** Invoke after the real pickup was consumed; object identity prevents phantom credits. */
  collectRelic(pickup: object): boolean
  /** Real damage to an already collected protected relic. */
  damageRelic(amount: number): boolean
  /** Only committed world-event transactions count. */
  resolveEvent(event: object, committed: boolean): boolean
  heroDefeated(hero: { readonly hp: number } | null): boolean
  withdraw(): void
  reset(): void
}

type Tracked<T> = { readonly index: number; readonly entity: T }

/**
 * Per-run, bounded adapter between real gameplay evidence and the pure mode evaluator.
 * It does not simulate or fabricate spawns, XP, item grants, boss rewards or saves.
 * No module-level state: parallel/restarted runs never share an objective ledger.
 */
export function createObjectiveRuntime(
  mode: ObjectiveModeId,
  onComplete?: (state: ObjectiveState, evaluation: ObjectiveEvaluation) => void,
): ObjectiveRuntime {
  let state = createObjectiveState(mode)
  let playing = true
  let completed = false
  let pendingBoss: Tracked<Mob> | null = null
  let pendingRelic: Tracked<object> | null = null
  let pendingWave: { readonly index: number; readonly remaining: Set<Mob> } | null = null
  let pendingEvent: Tracked<object> | null = null
  let completedEvents = new WeakSet<object>() // Prevent replay without retaining Endless event objects.
  const collectedRelics = new Set<object>() // Four at most; reset on every run.

  function active(): boolean { return playing && state.status === 'active' }

  function apply(event: Parameters<typeof advanceObjective>[1]): boolean {
    const next = advanceObjective(state, event)
    if (next === state) return false
    state = next
    if (!completed && state.status !== 'active') {
      completed = true
      onComplete?.(state, evaluateObjective(state))
    }
    return true
  }

  function nextReady(times: readonly number[], count: number, pending: boolean): number | null {
    const readyAt = times[count]
    return state.status === 'active' && !pending && readyAt !== undefined && state.seconds >= readyAt
      ? count + 1 : null
  }

  function plan(): ObjectiveSpawnPlan {
    const def = getObjectiveMode(mode)
    const relicIndex = mode === 'relic-hunt'
      ? nextReady(def.relicReadySeconds, state.relics, pendingRelic !== null) : null
    const waveIndex = mode === 'chaos-arena'
      ? nextReady(def.waveReadySeconds, state.waves, pendingWave !== null) : null
    const prerequisites = (mode !== 'relic-hunt' || state.relics === def.relicReadySeconds.length)
      && (mode !== 'chaos-arena' || state.waves === def.waveReadySeconds.length)
    const bossStage = prerequisites
      ? nextReady(def.bossReadySeconds, state.bosses, pendingBoss !== null) : null
    const interval = def.majorEventIntervalSeconds
    const eventIndex = state.status === 'active' && mode === 'endless-eclipse'
      && interval !== null && pendingEvent === null
      && state.seconds >= (state.majorEvents + 1) * interval ? state.majorEvents + 1 : null
    return { bossStage, waveIndex, relicIndex, eventIndex }
  }

  return {
    snapshot: () => state,
    evaluate: () => evaluateObjective(state),
    difficulty: () => getObjectiveDifficulty(state),
    plan,
    tick(seconds, isPlaying = true) {
      playing = isPlaying
      if (active()) apply({ type: 'tick', seconds })
    },
    spawnBoss(stage, actor) {
      if (!active() || plan().bossStage !== stage || actor?.type !== 'boss'
        || !Number.isFinite(actor.hp) || actor.hp <= 0) return false
      pendingBoss = { index: stage, entity: actor }
      return true
    },
    spawnWave(index, actors) {
      if (!active() || plan().waveIndex !== index || actors.length < 1 || actors.length > MAX_MOBS) return false
      const unique = new Set(actors)
      if (unique.size !== actors.length || actors.some(actor => !actor || actor.type === 'boss'
        || !Number.isFinite(actor.hp) || actor.hp <= 0)) return false
      pendingWave = { index, remaining: unique }
      return true
    },
    registerRelic(index, pickup) {
      if (!active() || plan().relicIndex !== index || !pickup || typeof pickup !== 'object'
        || collectedRelics.has(pickup)) return false
      pendingRelic = { index, entity: pickup }
      return true
    },
    registerEvent(index, event) {
      if (!active() || plan().eventIndex !== index || !event || typeof event !== 'object'
        || completedEvents.has(event)) return false
      pendingEvent = { index, entity: event }
      return true
    },
    defeatMob(actor) {
      if (!active() || !actor || !Number.isFinite(actor.hp) || actor.hp > 0) return false
      if (pendingBoss?.entity === actor && actor.type === 'boss') {
        const stage = pendingBoss.index
        pendingBoss = null
        return apply({ type: 'boss-defeated', stage })
      }
      if (pendingWave?.remaining.has(actor)) {
        pendingWave.remaining.delete(actor)
        if (pendingWave.remaining.size === 0) {
          const index = pendingWave.index
          pendingWave = null
          return apply({ type: 'wave-cleared', index })
        }
        return true
      }
      return false
    },
    collectRelic(pickup) {
      if (!active() || pendingRelic?.entity !== pickup) return false
      const index = pendingRelic.index
      pendingRelic = null
      collectedRelics.add(pickup)
      return apply({ type: 'relic-collected', index })
    },
    damageRelic(amount) {
      if (!active() || state.mode !== 'relic-hunt' || state.relics === 0
        || !Number.isFinite(amount) || amount <= 0) return false
      return apply({ type: 'relic-damaged', amount })
    },
    resolveEvent(event, committed) {
      if (!active() || !committed || pendingEvent?.entity !== event) return false
      const index = pendingEvent.index
      pendingEvent = null
      completedEvents.add(event)
      return apply({ type: 'major-event-cleared', index })
    },
    heroDefeated(hero) {
      if (!active() || !hero || !Number.isFinite(hero.hp) || hero.hp > 0) return false
      return apply({ type: 'player-defeated' })
    },
    withdraw() {
      if (state.status === 'active') apply({ type: 'abandon' })
    },
    reset() {
      state = createObjectiveState(mode)
      playing = true
      completed = false
      pendingBoss = null
      pendingWave = null
      pendingRelic = null
      pendingEvent = null
      completedEvents = new WeakSet<object>()
      collectedRelics.clear()
    },
  }
}
