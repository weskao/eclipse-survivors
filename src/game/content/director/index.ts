/**
 * Deterministic, run-scoped encounter scheduling. This module NEVER mutates
 * GameState or spawns entities. The integration owner adapts SpawnRequest to
 * spawn.ts, shows WaveEvent in the HUD and supplies terrain collision checks.
 *
 * Integration:
 *   const director = createWaveDirector({ mode: state.runMode, seed: runSeed })
 *   const plan = director.advance({
 *     timeSeconds: state.time, activeMobs: state.mobs.length,
 *     hero: { x: hero.x, y: hero.y }, viewport: { width: state.W, height: state.H },
 *     bossSpawned: state.bossSpawned, bossDefeated: state.bossDefeated,
 *     canSpawnAt: (x, y, radius) => isWalkable(x, y, radius),
 *   })
 *   // Respect plan.spawns, positions, elite flags, telegraphs and plan.events.
 *   // Do not also invoke legacy tickSpawning after enabling this director.
 *   // One required boss per run; integration marks bossSpawned after spawning it.
 */
import { MAX_MOBS } from '../../constants'
import { getMode } from '../../../meta/modes'
import type { RunModeId } from '../../../meta/types'
import type { MobType } from '../../types'

export const WAVE_CYCLE_SECONDS = 48
const BOSS_PREP_SECONDS = 12
const BOSS_ENCOUNTER_SECONDS = 14
const MINI_BOSS_FIRST = 60
const MINI_BOSS_INTERVAL = 80
const MAX_SPAWN_BUDGET = 10
const PATTERNS = ['swarm', 'elite', 'ranged'] as const
const STAGES = [
  { stage: 'build-up', from: 0, to: 14 },
  { stage: 'assault', from: 14, to: 34 },
  { stage: 'reward', from: 34, to: 40 },
  { stage: 'recovery', from: 40, to: WAVE_CYCLE_SECONDS },
] as const

export type WaveStage = 'build-up' | 'assault' | 'reward' | 'recovery' | 'boss-prep' | 'boss'
export type WavePattern = 'swarm' | 'elite' | 'ranged' | 'mixed'
export type SpawnRole = 'normal' | 'mini-boss' | 'boss'

export interface WaveSnapshot {
  readonly stage: WaveStage
  readonly pattern: WavePattern
  readonly cycle: number
  readonly startsAt: number
  readonly endsAt: number
  readonly danger: number
  readonly spawnBudget: number
  readonly spawnIntervalSeconds: number
}

export interface WaveEvent {
  readonly id: string
  readonly kind: 'stage' | 'reward' | 'boss-prep' | 'mini-boss' | 'boss'
  readonly title: string
  readonly atSeconds: number
  readonly durationSeconds: number
  readonly danger: number
}

export interface SpawnRequest {
  readonly type: MobType
  readonly elite: boolean
  readonly role: SpawnRole
  readonly formation: 'arc' | 'flanks' | 'ring'
  readonly x: number
  readonly y: number
  /** Minimum warning before damage is allowed; integration must enforce this. */
  readonly telegraphSeconds: number
}

export interface WaveFrame {
  readonly timeSeconds: number
  /** All living ordinary mobs; a boss may use one additional reserved slot. */
  readonly activeMobs: number
  readonly hero: { readonly x: number; readonly y: number }
  readonly viewport: { readonly width: number; readonly height: number }
  readonly bossSpawned?: boolean
  readonly bossDefeated?: boolean
  /** Reject walls, hazards, blocked terrain or other gameplay restrictions. */
  readonly canSpawnAt?: (x: number, y: number, radius: number) => boolean
}

export interface WaveDecision extends WaveSnapshot {
  readonly spawns: readonly SpawnRequest[]
  readonly events: readonly WaveEvent[]
}

export interface WaveDirector {
  readonly mode: RunModeId
  inspect(timeSeconds: number): WaveSnapshot
  advance(frame: WaveFrame): WaveDecision
  reset(): void
}

function validTime(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid wave time')
}

const clamp = (value: number, maximum: number): number => Math.max(0, Math.min(value, maximum))

/** O(1), no per-frame RNG, stored timeline, or difficulty dependence on graphics settings. */
export function describeWave(mode: RunModeId, seed: number, timeSeconds: number): WaveSnapshot {
  validTime(timeSeconds)
  if (!Number.isSafeInteger(seed)) throw new RangeError('Wave seed must be a safe integer')
  const config = getMode(mode)
  const cycle = Math.floor(timeSeconds / WAVE_CYCLE_SECONDS)
  const offset = timeSeconds - cycle * WAVE_CYCLE_SECONDS
  const phase = STAGES.find(p => offset >= p.from && offset < p.to)!
  let stage: WaveStage = phase.stage
  let startsAt = cycle * WAVE_CYCLE_SECONDS + phase.from
  let endsAt = cycle * WAVE_CYCLE_SECONDS + phase.to
  if (timeSeconds >= config.bossAt - BOSS_PREP_SECONDS && timeSeconds < config.bossAt) {
    stage = 'boss-prep'
    startsAt = config.bossAt - BOSS_PREP_SECONDS
    endsAt = config.bossAt
  } else if (timeSeconds >= config.bossAt && timeSeconds < config.bossAt + BOSS_ENCOUNTER_SECONDS) {
    stage = 'boss'
    startsAt = config.bossAt
    endsAt = config.bossAt + BOSS_ENCOUNTER_SECONDS
  }
  // Boss staging takes precedence over the normal cycle, including boundary overlap.
  if (stage !== 'boss' && stage !== 'boss-prep') {
    if (startsAt < config.bossAt && endsAt > config.bossAt - BOSS_PREP_SECONDS) {
      endsAt = config.bossAt - BOSS_PREP_SECONDS
    }
    if (startsAt < config.bossAt + BOSS_ENCOUNTER_SECONDS && endsAt > config.bossAt) {
      startsAt = Math.max(startsAt, config.bossAt + BOSS_ENCOUNTER_SECONDS)
    }
  }

  const pattern: WavePattern = stage === 'assault'
    ? PATTERNS[(cycle + ((seed % PATTERNS.length) + PATTERNS.length) % PATTERNS.length) % PATTERNS.length]!
    : 'mixed'
  // Escalate pacing/composition, not only enemy HP; all live-count budgets remain bounded.
  const danger = 1 + Math.floor(timeSeconds / (mode === 'endless' ? 65 : 85))
    + (mode === 'challenge' ? 2 : 0)
  const base = stage === 'assault' ? 4 : stage === 'build-up' ? 2 : 0
  const spawnBudget = clamp(base + (base ? Math.floor(danger / 3) + (mode === 'challenge' ? 1 : 0) : 0), MAX_SPAWN_BUDGET)
  const interval = stage === 'assault' ? 3.6 : 5.5
  const spawnIntervalSeconds = interval / config.modifiers.spawnFrequency
  return { stage, pattern, cycle, startsAt, endsAt, danger, spawnBudget, spawnIntervalSeconds }
}

/** Small integer mixer; generated once per spawn pulse, never in an animation frame loop. */
function mix(a: number, b: number, c: number): number {
  let n = (a ^ Math.imul(b + 1, 0x9e3779b1) ^ Math.imul(c + 1, 0x85ebca6b)) >>> 0
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d)
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b)
  return (n ^ (n >>> 16)) >>> 0
}

function composition(pattern: WavePattern, pulse: number, index: number, danger: number): { type: MobType; elite: boolean } {
  const position = (pulse + index) % 3
  if (pattern === 'swarm') return { type: (['slime', 'bat', 'goblin'] as const)[position]!, elite: false }
  if (pattern === 'ranged') {
    return { type: position === 0 ? 'warlock' : position === 1 ? 'goblin' : 'slime', elite: false }
  }
  if (pattern === 'elite') {
    return { type: position === 0 ? 'golem' : position === 1 ? 'goblin' : 'slime',
      elite: position !== 2 && (danger >= 2 || position === 0) }
  }
  return { type: (['slime', 'bat', 'goblin'] as const)[position]!, elite: false }
}

function radiusOf(type: MobType): number {
  return type === 'boss' ? 48 : type === 'golem' ? 30 : type === 'warlock' ? 22 : type === 'goblin' ? 20 : 18
}

/** Deterministic off-screen arc with at most eight terrain attempts per request. */
function place(
  frame: WaveFrame, seed: number, cycle: number, pulse: number, index: number,
  total: number, type: MobType, alreadyPlaced: readonly SpawnRequest[],
): { x: number; y: number } | null {
  const halfW = frame.viewport.width / 2
  const halfH = frame.viewport.height / 2
  // Ordinary mobs are culled at 1700 world units by the existing engine.
  // On very large CSS viewports, prefer a long-range telegraphed onscreen spawn
  // over placing enemies where the legacy engine instantly removes them.
  const offscreenDistance = Math.max(270, Math.hypot(halfW + 64, halfH + 64) + 32)
  const safeDistance = Math.min(1600, offscreenDistance)
  const requireOffscreen = offscreenDistance <= 1600
  const angle = (mix(seed, cycle, pulse) / 0x100000000) * Math.PI * 2
    + (index - (total - 1) / 2) * 0.26
  const radius = radiusOf(type)
  for (let attempt = 0; attempt < 8; attempt++) {
    const a = angle + attempt * 0.51
    const x = frame.hero.x + Math.cos(a) * safeDistance
    const y = frame.hero.y + Math.sin(a) * safeDistance
    const dx = x - frame.hero.x
    const dy = y - frame.hero.y
    if (requireOffscreen && Math.abs(dx) <= halfW + 32 && Math.abs(dy) <= halfH + 32) continue
    if (alreadyPlaced.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < (radius + radiusOf(p.type) + 32) ** 2)) continue
    if (frame.canSpawnAt && !frame.canSpawnAt(x, y, radius)) continue
    return { x, y }
  }
  return null // Never bypass terrain veto to fill a quota.
}

const LABELS: Record<WaveStage, string> = {
  'build-up': '暗潮湧動',
  assault: '魔物突襲',
  reward: '戰利品時刻',
  recovery: '短暫喘息',
  'boss-prep': '首領即將降臨',
  boss: '首領決戰',
}

export function createWaveDirector(opts: { mode: RunModeId; seed: number }): WaveDirector {
  const { mode, seed } = opts
  // Validate mode / seed at construction rather than failing during combat.
  if (!['quick', 'standard', 'challenge', 'endless'].includes(mode)) throw new RangeError('Invalid run mode')
  describeWave(mode, seed, 0)
  const bossAt = getMode(mode).bossAt
  let lastTime = -1
  let lastStageKey = ''
  let lastSpawnKey = ''
  let bossIssued = false

  function reset(): void {
    lastTime = -1
    lastStageKey = ''
    lastSpawnKey = ''
    bossIssued = false
  }

  function advance(frame: WaveFrame): WaveDecision {
    const t = frame.timeSeconds
    validTime(t)
    if (t < lastTime) throw new RangeError('Wave time cannot move backwards; call reset()')
    if (!Number.isInteger(frame.activeMobs) || frame.activeMobs < 0 ||
        ![frame.hero.x, frame.hero.y, frame.viewport.width, frame.viewport.height].every(Number.isFinite) ||
        frame.viewport.width <= 0 || frame.viewport.height <= 0) {
      throw new RangeError('Invalid wave spawn inputs')
    }
    const wave = describeWave(mode, seed, t)
    const events: WaveEvent[] = []
    const spawns: SpawnRequest[] = []
    const stageKey = wave.stage + ':' + wave.startsAt
    if (stageKey !== lastStageKey) {
      // Announce a boss only when it exists or when placement succeeds below.
      if (wave.stage !== 'boss' || frame.bossSpawned) {
        events.push({
          id: 'waves:' + wave.stage, kind: wave.stage === 'reward' ? 'reward'
            : wave.stage === 'boss-prep' ? 'boss-prep' : wave.stage === 'boss' ? 'boss' : 'stage',
          title: LABELS[wave.stage], atSeconds: wave.startsAt,
          durationSeconds: Math.max(0, wave.endsAt - wave.startsAt), danger: wave.danger,
        })
      }
      lastStageKey = stageKey
    }

    const bossDue = t >= bossAt && frame.activeMobs <= MAX_MOBS &&
      !bossIssued && !frame.bossSpawned && !frame.bossDefeated
    if (frame.bossSpawned || frame.bossDefeated) bossIssued = true

    function add(type: MobType, elite: boolean, role: SpawnRole, i: number, total: number, pulse: number): boolean {
      const pos = place(frame, seed, wave.cycle, pulse, i, total, type, spawns)
      if (!pos) return false
      spawns.push({
        type, elite, role, x: pos.x, y: pos.y,
        formation: wave.pattern === 'elite' ? 'flanks' : wave.pattern === 'ranged' ? 'arc' : 'ring',
        telegraphSeconds: role === 'boss' ? 2.5 : role === 'mini-boss' ? 2 : 1.2,
      })
      return true
    }

    // Boss slot is reserved above MAX_MOBS, matching existing spawnMob(boss).
    // Retry on a later tick if every candidate was terrain-blocked.
    if (bossDue) {
      if (add('boss', false, 'boss', 0, 1, Math.floor(t))) {
        bossIssued = true
        if (!events.some(e => e.kind === 'boss')) {
          events.push({ id: 'waves:boss', kind: 'boss', title: LABELS.boss,
            atSeconds: bossAt, durationSeconds: BOSS_ENCOUNTER_SECONDS, danger: wave.danger })
        }
      }
    } else {
      const available = clamp(MAX_MOBS - frame.activeMobs, MAX_MOBS)
      const lastMini = t >= MINI_BOSS_FIRST
        ? MINI_BOSS_FIRST + Math.floor((t - MINI_BOSS_FIRST) / MINI_BOSS_INTERVAL) * MINI_BOSS_INTERVAL
        : -1
      // Drop stale optional encounters on resume; never dump a backlog in one tick.
      const miniDue = available > 0 && lastMini > lastTime && t - lastMini <= 4 && lastMini <= t &&
        Math.abs(lastMini - bossAt) > BOSS_PREP_SECONDS &&
        // Do not surprise the player with elite encounters during recovery or a boss fight.
        wave.stage !== 'boss-prep' && wave.stage !== 'boss' && wave.stage !== 'recovery'
      if (miniDue && add('golem', true, 'mini-boss', 0, 1, Math.floor(lastMini))) {
        events.push({ id: 'waves:mini-boss', kind: 'mini-boss', title: '精英首領襲來',
          atSeconds: lastMini, durationSeconds: 12, danger: wave.danger })
      }

      if (wave.spawnBudget > 0 && spawns.length < available) {
        const pulse = Math.floor((t - wave.startsAt) / wave.spawnIntervalSeconds)
        const spawnKey = stageKey + ':' + pulse
        if (spawnKey !== lastSpawnKey) {
          lastSpawnKey = spawnKey
          const count = Math.min(wave.spawnBudget - spawns.length, available - spawns.length)
          for (let i = 0; i < count; i++) {
            const enemy = composition(wave.pattern, pulse, i, wave.danger)
            add(enemy.type, enemy.elite, 'normal', i, count, pulse)
          }
        }
      }
    }

    lastTime = t
    return { ...wave, spawns, events }
  }

  return Object.freeze({ mode, inspect: (t: number) => describeWave(mode, seed, t), advance, reset })
}
