/**
 * Deterministic, run-scoped encounter planner. Neither this planner nor the
 * engine adapter replaces the legacy spawn loop automatically. Integration
 * must enable exactly one spawn policy per run, honor telegraphs and forward
 * finalized kill evidence. Objective modes may schedule multiple bosses.
 * See ./INTEGRATION.md for the handoff contract.
 */
import { MAX_MOBS } from '../../constants'
import { getMode } from '../../../meta/modes'
import { getObjectiveMode, objectiveModeIds, type ObjectiveModeId } from '../modes/definitions'
import type { RunModeId } from '../../../meta/types'
import type { MobType } from '../../types'

export type WaveModeId = RunModeId | ObjectiveModeId

const LEGACY_MODES: readonly RunModeId[] = ['quick', 'standard', 'challenge', 'endless']
function isLegacy(mode: WaveModeId): mode is RunModeId {
  return LEGACY_MODES.some(id => id === mode)
}

interface ModeSchedule {
  readonly bossTimes: readonly number[]
  readonly waveTimes: readonly number[]
  readonly spawnFrequency: number
}

/** Static per-mode contracts: no arrays/objects allocated while advancing a frame. */
const MODE_SCHEDULES = new Map<WaveModeId, ModeSchedule>()
for (const mode of LEGACY_MODES) {
  const config = getMode(mode)
  MODE_SCHEDULES.set(mode, {
    bossTimes: [config.bossAt], waveTimes: [],
    spawnFrequency: config.modifiers.spawnFrequency,
  })
}
for (const mode of objectiveModeIds) {
  const config = getObjectiveMode(mode)
  MODE_SCHEDULES.set(mode, {
    bossTimes: config.bossReadySeconds, waveTimes: config.waveReadySeconds,
    spawnFrequency: config.spawnFrequency,
  })
}
function schedule(mode: WaveModeId): ModeSchedule {
  const config = MODE_SCHEDULES.get(mode)
  if (!config) throw new RangeError('Invalid run mode')
  return config
}

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
  readonly kind: 'stage' | 'reward' | 'boss-prep' | 'mini-boss' | 'boss' | 'wave'
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
  /** 1–8 for Chaos Arena; the adapter assigns only accepted actors to this wave. */
  readonly waveIndex?: number
  /** 1-based scheduled boss stage, for multi-boss objective modes. */
  readonly encounterIndex?: number
}

export interface WaveFrame {
  readonly timeSeconds: number
  /** Every actor sharing the 130-slot budget, including any living boss. */
  readonly activeMobs: number
  readonly hero: { readonly x: number; readonly y: number }
  readonly viewport: { readonly width: number; readonly height: number }
  readonly bossSpawned?: boolean
  readonly bossDefeated?: boolean
  /** True while an accepted boss remains alive, regardless of its scheduled window. */
  readonly bossActive?: boolean
  /** Number of genuinely killed scheduled bosses, reported by the engine adapter. */
  readonly completedBosses?: number
  /** Only genuine, fully defeated actor cohorts count as completed waves. */
  readonly completedWaves?: number
  /** Relic Hunt's guardian is locked until four actual relic pickups. */
  readonly completedRelics?: number
  readonly activeWave?: boolean
  /** Reserved but not yet fully materialized actors (telegraphs/spawn queues). */
  readonly pendingActors?: number
  readonly playing?: boolean
  /** Reject walls, hazards, blocked terrain or other gameplay restrictions. */
  readonly canSpawnAt?: (x: number, y: number, radius: number) => boolean
}

export interface WaveDecision extends WaveSnapshot {
  readonly spawns: readonly SpawnRequest[]
  readonly events: readonly WaveEvent[]
  readonly waveIndex?: number
}

export interface WaveDirector {
  readonly mode: WaveModeId
  inspect(timeSeconds: number): WaveSnapshot
  advance(frame: WaveFrame): WaveDecision
  reset(): void
  /** Release a rejected spawn reservation so the same encounter can retry. */
  retryBoss(index: number): void
  retryWave(index: number): void
}

function validTime(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > Number.MAX_SAFE_INTEGER) throw new RangeError('Invalid wave time')
}

const clamp = (value: number, maximum: number): number => Math.max(0, Math.min(value, maximum))

/** O(1), no per-frame RNG, stored timeline, or difficulty dependence on graphics settings. */
export function describeWave(mode: WaveModeId, seed: number, timeSeconds: number): WaveSnapshot {
  validTime(timeSeconds)
  if (!Number.isSafeInteger(seed)) throw new RangeError('Wave seed must be a safe integer')
  const config = schedule(mode)
  const cycle = Math.floor(timeSeconds / WAVE_CYCLE_SECONDS)
  const offset = timeSeconds - cycle * WAVE_CYCLE_SECONDS
  const phase = STAGES.find(p => offset >= p.from && offset < p.to)!
  let stage: WaveStage = phase.stage
  let startsAt = cycle * WAVE_CYCLE_SECONDS + phase.from
  let endsAt = cycle * WAVE_CYCLE_SECONDS + phase.to
  if (mode === 'chaos-arena') {
    // Eight explicit readiness gates, with recovery between encounters.
    let waveIndex = -1
    for (let i = 0; i < config.waveTimes.length; i++) {
      if (timeSeconds >= config.waveTimes[i]!) waveIndex = i
    }
    if (waveIndex >= 0) {
      const ready = config.waveTimes[waveIndex]!
      const next = config.waveTimes[waveIndex + 1] ?? Infinity
      stage = timeSeconds < ready + 12 ? 'assault' : 'recovery'
      startsAt = timeSeconds < ready + 12 ? ready : ready + 12
      endsAt = Math.min(timeSeconds < ready + 12 ? ready + 12 : next, next)
    }
  }
  // Later scheduled bosses take precedence over ordinary and Chaos waves.
  for (const bossAt of config.bossTimes) {
    if (timeSeconds >= bossAt - BOSS_PREP_SECONDS && timeSeconds < bossAt) {
      stage = 'boss-prep'
      startsAt = bossAt - BOSS_PREP_SECONDS
      endsAt = bossAt
      break
    }
    if (timeSeconds >= bossAt && timeSeconds < bossAt + BOSS_ENCOUNTER_SECONDS) {
      stage = 'boss'
      startsAt = bossAt
      endsAt = bossAt + BOSS_ENCOUNTER_SECONDS
      break
    }
    if (startsAt < bossAt && endsAt > bossAt - BOSS_PREP_SECONDS) {
      endsAt = bossAt - BOSS_PREP_SECONDS
    }
  }

  const pattern: WavePattern = stage === 'assault'
    ? PATTERNS[(cycle + ((seed % PATTERNS.length) + PATTERNS.length) % PATTERNS.length) % PATTERNS.length]!
    : 'mixed'
  // Escalate pacing/composition, not only enemy HP; all live-count budgets remain bounded.
  const danger = 1 + Math.floor(timeSeconds / (
    mode === 'endless' || mode === 'endless-eclipse' ? 65 : mode === 'chaos-arena' ? 35 : 85
  )) + (mode === 'challenge' || mode === 'chaos-arena' ? 2 : 0)
  const base = stage === 'assault' ? 4 : stage === 'build-up' ? 2 : 0
  const spawnBudget = clamp(base + (base ? Math.floor(danger / 3) +
    (mode === 'challenge' || mode === 'chaos-arena' ? 1 : 0) : 0), MAX_SPAWN_BUDGET)
  const interval = stage === 'assault' ? 3.6 : 5.5
  const spawnIntervalSeconds = interval / config.spawnFrequency
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

export function createWaveDirector(opts: { mode: WaveModeId; seed: number }): WaveDirector {
  const { mode, seed } = opts
  // Validate mode / seed at construction rather than failing during combat.
  if (!isLegacy(mode) && !objectiveModeIds.includes(mode as ObjectiveModeId)) throw new RangeError('Invalid run mode')
  describeWave(mode, seed, 0)
  const bossTimes = schedule(mode).bossTimes
  const waveTimes = schedule(mode).waveTimes
  let lastTime = -1
  let lastStageKey = ''
  let lastSpawnKey = ''
  let bossIssued = false
  let bossIssuedIndex = 0
  let lastChaosWave = 0

  function reset(): void {
    lastTime = -1
    lastStageKey = ''
    lastSpawnKey = ''
    bossIssued = false
    bossIssuedIndex = 0
    lastChaosWave = 0
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
    if (!Number.isInteger(frame.pendingActors ?? 0) || (frame.pendingActors ?? 0) < 0 ||
        !Number.isInteger(frame.completedWaves ?? 0) || (frame.completedWaves ?? 0) < 0 ||
        !Number.isInteger(frame.completedBosses ?? 0) || (frame.completedBosses ?? 0) < 0 ||
        !Number.isInteger(frame.completedRelics ?? 0) || (frame.completedRelics ?? 0) < 0 ||
        (mode === 'chaos-arena' && (frame.completedWaves ?? 0) > waveTimes.length) ||
        (frame.completedBosses ?? 0) > bossTimes.length) {
      throw new RangeError('Invalid wave progress')
    }
    if (frame.playing === false) return { ...wave, spawns: [], events: [] }
    const events: WaveEvent[] = []
    const spawns: SpawnRequest[] = []
    const stageKey = wave.stage + ':' + wave.startsAt
    if (stageKey !== lastStageKey) {
      // Announce a boss only when it exists or when placement succeeds below.
      if (wave.stage !== 'boss') {
        events.push({
          id: 'waves:' + wave.stage, kind: wave.stage === 'reward' ? 'reward'
            : wave.stage === 'boss-prep' ? 'boss-prep' : 'stage',
          title: LABELS[wave.stage], atSeconds: wave.startsAt,
          durationSeconds: Math.max(0, wave.endsAt - wave.startsAt), danger: wave.danger,
        })
      }
      lastStageKey = stageKey
    }

    const completedBosses = frame.completedBosses ?? 0
    const bossIndex = isLegacy(mode) ? 1 : completedBosses + 1
    const bossAt = bossTimes[bossIndex - 1] ?? Infinity
    const available = clamp(MAX_MOBS - frame.activeMobs - (frame.pendingActors ?? 0), MAX_MOBS)
    if (isLegacy(mode) && (frame.bossSpawned || frame.bossDefeated)) bossIssued = true
    const bossDue = t >= bossAt && !frame.bossActive &&
      (mode !== 'chaos-arena' || (frame.completedWaves ?? 0) === waveTimes.length) &&
      (mode !== 'relic-hunt' || frame.completedRelics === 4) &&
      (isLegacy(mode)
        ? !bossIssued && !frame.bossSpawned && !frame.bossDefeated
        : bossIssuedIndex !== bossIndex)
    // A late boss request must not simultaneously announce an ordinary wave.
    if (bossDue || frame.bossActive) events.length = 0

    function add(type: MobType, elite: boolean, role: SpawnRole, i: number, total: number, pulse: number, waveIndex?: number): boolean {
      const pos = place(frame, seed, wave.cycle, pulse, i, total, type, spawns)
      if (!pos) return false
      spawns.push({
        type, elite, role, x: pos.x, y: pos.y, waveIndex,
        encounterIndex: role === 'boss' ? bossIndex : undefined,
        formation: wave.pattern === 'elite' ? 'flanks' : wave.pattern === 'ranged' ? 'arc' : 'ring',
        telegraphSeconds: role === 'boss' ? 2.5 : role === 'mini-boss' ? 2 : 1.2,
      })
      return true
    }

    let waveIndex: number | undefined
    // The same 130 actor slots are shared by legacy mobs, elites and every boss.
    // A due boss takes precedence, but cannot exceed the same hard cap.
    if (bossDue) {
      if (available > 0 && add('boss', false, 'boss', 0, 1, Math.floor(t))) {
        bossIssued = true
        bossIssuedIndex = bossIndex
        events.push({ id: 'waves:boss:' + bossIndex, kind: 'boss', title: LABELS.boss,
          atSeconds: bossAt, durationSeconds: BOSS_ENCOUNTER_SECONDS, danger: wave.danger })
      }
    } else if (!frame.bossActive && wave.stage !== 'boss' && wave.stage !== 'boss-prep') {
      if (mode === 'chaos-arena') {
        const nextWave = (frame.completedWaves ?? 0) + 1
        if (nextWave <= waveTimes.length && t >= waveTimes[nextWave - 1]! &&
            !frame.activeWave && lastChaosWave !== nextWave && available > 0) {
          const count = Math.min(6 + Math.floor(nextWave / 2), MAX_SPAWN_BUDGET, available)
          const pattern = PATTERNS[(nextWave - 1 + (seed % 3) + 3) % 3]!
          for (let i = 0; i < count; i++) {
            const enemy = composition(pattern, nextWave, i, wave.danger)
            add(enemy.type, enemy.elite, 'normal', i, count, nextWave, nextWave)
          }
          if (spawns.length) {
            waveIndex = nextWave
            lastChaosWave = nextWave
            events.push({ id: 'waves:wave:' + nextWave, kind: 'wave',
              title: '競技場第 ' + nextWave + ' 波', atSeconds: waveTimes[nextWave - 1]!,
              durationSeconds: 12, danger: wave.danger })
          }
        }
      } else {
        const lastMini = t >= MINI_BOSS_FIRST
          ? MINI_BOSS_FIRST + Math.floor((t - MINI_BOSS_FIRST) / MINI_BOSS_INTERVAL) * MINI_BOSS_INTERVAL
          : -1
        const miniDue = available > 0 && lastMini > lastTime && t - lastMini <= 4 &&
          bossTimes.every(at => Math.abs(lastMini - at) > BOSS_PREP_SECONDS) &&
          wave.stage !== 'recovery'
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
    }

    lastTime = t
    return { ...wave, spawns, events, waveIndex }
  }

  return Object.freeze({
    mode, inspect: (t: number) => describeWave(mode, seed, t), advance, reset,
    retryBoss(index: number): void {
      if (bossIssuedIndex === index) bossIssuedIndex = 0
      if (isLegacy(mode) && index === 1) bossIssued = false
    },
    retryWave(index: number): void {
      if (lastChaosWave === index) lastChaosWave = 0
    },
  })
}
