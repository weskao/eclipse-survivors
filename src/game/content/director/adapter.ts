/**
 * Explicit integration bridge for the legacy engine.
 *
 * The integration owner must disable tickSpawning when enabling this adapter,
 * and supply a spawn callback that actually inserts exactly one configured
 * mob into state.mobs (position, type, elite and telegraph included).
 * Registration alone does not activate the adapter or bypass boss controllers.
 */
import { MAX_MOBS } from '../../constants'
import type { GameState, Mob } from '../../types'
import {
  createWaveDirector,
  type SpawnRequest, type WaveDecision, type WaveEvent, type WaveFrame, type WaveModeId,
} from './index'

export interface WaveEngineOptions {
  readonly mode: WaveModeId
  readonly seed: number
  /** Return the newly inserted actor, or null to reject the placement. */
  readonly spawn: (state: GameState, request: SpawnRequest) => Mob | null
  readonly onEvent?: (event: WaveEvent) => void
  /** This callback is only dispatched after every accepted wave actor has died. */
  readonly onWaveCleared?: (index: number) => void
}

export interface WaveEngineAdvanceOptions {
  readonly canSpawnAt?: WaveFrame['canSpawnAt']
  readonly pendingActors?: number
  /** Actual pickup counter from the Relic Hunt objective reducer. */
  readonly completedRelics?: number
}

export interface WaveEngineAdapter {
  readonly clearedWaves: number
  readonly defeatedBosses: number
  advance(
    state: GameState,
    options?: WaveEngineAdvanceOptions,
  ): WaveDecision | null
  /** Call after a finalized kill; unrelated, duplicate or living actors are ignored. */
  killed(mob: Mob): boolean
  reset(): void
}

export function createWaveEngineAdapter(options: WaveEngineOptions): WaveEngineAdapter {
  const director = createWaveDirector(options)
  const waveActors = new Set<Mob>()
  let bossActor: Mob | null = null
  let clearedWaves = 0
  let defeatedBosses = 0

  function reset(): void {
    director.reset()
    waveActors.clear()
    bossActor = null
    clearedWaves = 0
    defeatedBosses = 0
  }

  function killed(mob: Mob): boolean {
    if (!Number.isFinite(mob.hp) || mob.hp > 0) return false
    if (mob === bossActor) {
      bossActor = null
      defeatedBosses++
      return true
    }
    if (!waveActors.delete(mob)) return false
    if (waveActors.size === 0) {
      clearedWaves++
      options.onWaveCleared?.(clearedWaves)
    }
    return true
  }

  function advance(
    state: GameState,
    input: WaveEngineAdvanceOptions = {},
  ): WaveDecision | null {
    const hero = state.hero
    if (!hero || state.mode !== 'play' || hero.hp <= 0) return null
    const legacy = director.mode === 'quick' || director.mode === 'standard' ||
      director.mode === 'endless' || director.mode === 'challenge'
    const frame: WaveFrame = {
      timeSeconds: state.time,
      // Include actors already in the legacy engine array: dead objects may still
      // occupy slots until the shared step cleanup.
      activeMobs: state.mobs.length,
      hero: { x: hero.x, y: hero.y },
      viewport: { width: state.W, height: state.H },
      bossSpawned: legacy && state.bossSpawned,
      bossDefeated: legacy && state.bossDefeated,
      bossActive: state.mobs.some(m => m.type === 'boss' && m.hp > 0),
      completedBosses: defeatedBosses,
      completedWaves: clearedWaves,
      completedRelics: input.completedRelics,
      activeWave: waveActors.size > 0,
      pendingActors: input.pendingActors,
      canSpawnAt: input.canSpawnAt,
    }
    const plan = director.advance(frame)
    const spawns: SpawnRequest[] = []
    let acceptedBoss = false
    let acceptedWave = false
    try {
      for (const request of plan.spawns) {
        // Check live array before each callback; other systems share the same cap.
        if (state.mobs.length + (input.pendingActors ?? 0) >= MAX_MOBS) break
        const before = state.mobs.length
        const mob = options.spawn(state, request)
        if (mob && (state.mobs.length !== before + 1 || !state.mobs.includes(mob) ||
            !Number.isFinite(mob.hp) || mob.hp <= 0)) {
          throw new Error('Wave spawn callback must insert exactly one living returned actor')
        }
        if (state.mobs.length > MAX_MOBS) throw new Error('Shared actor cap exceeded')
        if (!mob) {
          if (state.mobs.length !== before) throw new Error('Rejected wave spawn changed actor count')
          continue
        }
        spawns.push(request)
        if (request.role === 'boss') {
          acceptedBoss = true
          bossActor = mob
        }
        if (request.waveIndex !== undefined) {
          acceptedWave = true
          waveActors.add(mob)
        }
      }
    } catch (error) {
      // A failing callback must not permanently consume an unaccepted encounter.
      const boss = plan.spawns.find(req => req.role === 'boss')
      if (boss && !acceptedBoss) director.retryBoss(boss.encounterIndex ?? 1)
      if (plan.waveIndex !== undefined && !acceptedWave) director.retryWave(plan.waveIndex)
      throw error
    }
    const boss = plan.spawns.find(s => s.role === 'boss')
    if (boss && !acceptedBoss) director.retryBoss(boss.encounterIndex ?? 1)
    if (plan.waveIndex !== undefined && !acceptedWave) director.retryWave(plan.waveIndex)

    // Never announce an encounter that the engine rejected.
    const events = plan.events.filter(event =>
      (event.kind !== 'boss' || acceptedBoss) &&
      (event.kind !== 'wave' || acceptedWave))
    for (const event of events) options.onEvent?.(event)
    return { ...plan, spawns, events }
  }

  return {
    get clearedWaves() { return clearedWaves },
    get defeatedBosses() { return defeatedBosses },
    advance, killed, reset,
  }
}
