import type { GameState } from '../../../game/types'
import type { WaveEvent } from '../../../game/content/director'
import type { ObjectiveEvaluation } from '../../../game/content/objectives/evaluator'
import type { inventorySnapshot } from '../../../game/content/relics/runtime'
import { RELIC_BY_ID } from '../../../game/content/relics/catalog'
import { RELIC_CAPACITY } from '../../../game/content/relics/runtime'
import type { CombatHudFeed, CombatHudSnapshot } from './model'

/** The host passes ALREADY-CONFIRMED runtime data at its existing HUD update cadence.
 * Merely importing the wave director/objective evaluator does not activate them.
 * No polling, alternative game state, or self-generated gameplay events exist here.
 */
export interface LiveHudSources {
  readonly state: Pick<GameState, 'mode' | 'mobs' | 'time'>
  readonly snapshot: CombatHudSnapshot
  /** Only from the authoritative boss encounter metadata. */
  readonly bossName?: string
  readonly totalBossPhases?: number
  /** Only from an active WaveDirector decision; NEVER derive a wave from elapsed time. */
  readonly wave?: { readonly cycle: number; readonly startsAt?: number; readonly endsAt?: number;
    readonly events: readonly Pick<WaveEvent, 'id' | 'title'>[] }
  /** Only from the objective evaluator after real gameplay events. */
  readonly objective?: Pick<ObjectiveEvaluation, 'status' | 'progress'>
  /** Only from the real combo counter, if installed. */
  readonly comboCount?: number
  /** Only from inventorySnapshot(state) when the relic runtime is installed. */
  readonly relicInventory?: Pick<ReturnType<typeof inventorySnapshot>, 'items'>
  /** Active status effects with remaining SIMULATION time (pause-safe). */
  readonly statuses?: CombatHudFeed['statuses']
  /** Real combat/treasure event ring, already expired and keyed by stable event IDs. */
  readonly notices?: CombatHudFeed['notices']
}

/** Pure projection; the host must call this when engine.ui.hud is replaced (~8 Hz). */
export function buildLiveCombatHudFeed(source: LiveHudSources): CombatHudFeed {
  const { state, snapshot } = source
  if (state.mode === 'menu' || state.mode === 'result') return { snapshot }

  const boss = state.mobs.find(mob => mob.type === 'boss' && mob.hp > 0 && Number.isFinite(mob.max) && mob.max > 0)
  const bossPhase = boss?.bossPhase
  const total = source.totalBossPhases
  const wave = source.wave
  const progress = source.objective?.progress
  const waveProgress = wave && wave.startsAt !== undefined && wave.endsAt !== undefined &&
    Number.isFinite(state.time) && Number.isFinite(wave.startsAt) && Number.isFinite(wave.endsAt) &&
    wave.endsAt > wave.startsAt
    ? Math.max(0, Math.min(100, Math.round((state.time - wave.startsAt) / (wave.endsAt - wave.startsAt) * 100)))
    : undefined
  const relics = source.relicInventory?.items.slice(0, RELIC_CAPACITY).flatMap(({ id, stacks }) => {
    const definition = RELIC_BY_ID.get(id)
    if (!definition || !Number.isSafeInteger(stacks) || stacks <= 0) return []
    return [{
      id, title: definition.title, icon: definition.icon, rarity: definition.rarity,
      stacks,
    }]
  })

  return {
    snapshot,
    ...(boss ? { boss: {
      name: source.bossName?.trim() || '首領',
      ...(bossPhase !== undefined ? { phase: bossPhase } : {}),
      ...(total !== undefined && Number.isSafeInteger(total) && total > 0 ? { totalPhases: total } : {}),
    } } : {}),
    ...(wave && Number.isSafeInteger(wave.cycle) && wave.cycle >= 0
      ? { wave: { number: wave.cycle + 1, ...(wave.events.at(-1)?.title ? { announcement: wave.events.at(-1)!.title } : {}),
        ...(waveProgress !== undefined ? { progressPct: waveProgress } : {}) } }
      : {}),
    ...(source.comboCount !== undefined && Number.isSafeInteger(source.comboCount) && source.comboCount > 1
      ? { combo: { count: source.comboCount } } : {}),
    ...(relics ? { relics } : {}),
    ...(source.statuses ? { statuses: source.statuses } : {}),
    ...(progress && Number.isFinite(progress.current) && progress.current >= 0 ? { objectives: [{
      id: 'mode-objective', title: progress.label, progress: progress.current,
      ...(progress.required !== null && Number.isFinite(progress.required) && progress.required >= 0
        ? { target: progress.required } : {}),
      complete: source.objective?.status === 'victory',
    }] } : {}),
    ...(source.notices ? { notices: source.notices } : {}),
  }
}
