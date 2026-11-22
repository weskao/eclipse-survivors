import { getObjectiveMode, type ObjectiveModeId } from '../modes/definitions'

export type ObjectiveStatus = 'active' | 'victory' | 'defeat' | 'withdrawn'
export type ObjectiveDefeatReason = 'fallen' | 'abandoned' | 'timeout' | 'relic-lost'

/** Small, serializable per-run state; no history arrays or unbounded IDs. */
export interface ObjectiveState {
  readonly mode: ObjectiveModeId
  readonly status: ObjectiveStatus
  readonly defeatReason: ObjectiveDefeatReason | null
  readonly seconds: number
  readonly bosses: number
  readonly relics: number
  readonly relicIntegrity: number
  readonly waves: number
  readonly majorEvents: number
}

/**
 * Integration emits these ONLY after verified gameplay transitions:
 * - boss-defeated: after the real boss kill/reward event, using its scheduled stage number;
 * - relic-collected / wave-cleared / major-event-cleared: after real objective completion;
 * - player-defeated: after real hero health reaches zero.
 * No event alone is a victory signal; the evaluator checks all required objectives.
 */
export type ObjectiveEvent =
  | { readonly type: 'tick'; readonly seconds: number }
  | { readonly type: 'boss-defeated'; readonly stage: number }
  | { readonly type: 'relic-collected'; readonly index: number }
  | { readonly type: 'relic-damaged'; readonly amount: number }
  | { readonly type: 'wave-cleared'; readonly index: number }
  | { readonly type: 'major-event-cleared'; readonly index: number }
  | { readonly type: 'player-defeated' }
  | { readonly type: 'abandon' }

export interface ObjectiveEvaluation {
  readonly status: ObjectiveStatus
  readonly defeatReason: ObjectiveDefeatReason | null
  readonly progress: { readonly current: number; readonly required: number | null; readonly label: string }
  readonly rewards: { readonly embers: number; readonly achievements: readonly string[] }
}

export interface ObjectiveDifficulty {
  readonly enemyHp: number
  readonly enemyDamage: number
  readonly spawnFrequency: number
  /** The integration owner applies the corresponding combat/world effect. */
  readonly activeModifier: string | null
}

export function createObjectiveState(mode: ObjectiveModeId): ObjectiveState {
  return {
    mode, status: 'active', defeatReason: null, seconds: 0,
    bosses: 0, relics: 0, relicIntegrity: 100, waves: 0, majorEvents: 0,
  }
}

function victorySatisfied(s: ObjectiveState): boolean {
  const config = getObjectiveMode(s.mode)
  switch (s.mode) {
    case 'boss-rush': return s.bosses === config.bossReadySeconds.length
    case 'endless-eclipse': return false
    case 'relic-hunt': return s.relics === config.relicReadySeconds.length && s.relicIntegrity > 0 && s.bosses === 1
    case 'cursed-expedition': return s.bosses === config.bossReadySeconds.length && s.seconds >= (config.surviveSeconds ?? Infinity)
    case 'chaos-arena': return s.waves === config.waveReadySeconds.length && s.bosses === 1
  }
}

function validIndex(value: number, expected: number, readyAt: number | undefined, seconds: number): boolean {
  return Number.isSafeInteger(value) && value === expected && readyAt !== undefined && seconds >= readyAt
}

function finish(s: ObjectiveState): ObjectiveState {
  if (s.mode === 'relic-hunt' && s.relicIntegrity <= 0) {
    return { ...s, status: 'defeat', defeatReason: 'relic-lost' }
  }
  // A late jump beyond a hard deadline must never produce a victory.
  const limit = getObjectiveMode(s.mode).timeLimitSeconds
  if (limit !== null && s.seconds > limit) {
    return { ...s, status: 'defeat', defeatReason: 'timeout' }
  }
  if (victorySatisfied(s)) return { ...s, status: 'victory' }
  if (limit !== null && s.seconds >= limit) {
    return { ...s, status: 'defeat', defeatReason: 'timeout' }
  }
  return s
}

/** Pure reducer: same state + event always yields same result. All terminal states are final. */
export function advanceObjective(state: ObjectiveState, event: ObjectiveEvent): ObjectiveState {
  if (state.status !== 'active') return state
  const rule = getObjectiveMode(state.mode)
  switch (event.type) {
    case 'player-defeated':
      return { ...state, status: 'defeat', defeatReason: 'fallen' }
    case 'abandon':
      return { ...state, status: 'withdrawn', defeatReason: 'abandoned' }
    case 'tick': {
      if (!Number.isFinite(event.seconds) || event.seconds <= 0) return state
      const nextSeconds = state.seconds + event.seconds
      if (!Number.isFinite(nextSeconds) || nextSeconds > Number.MAX_SAFE_INTEGER) return state
      return finish({ ...state, seconds: nextSeconds })
    }
    case 'boss-defeated': {
      const stage = state.bosses + 1
      if (!validIndex(event.stage, stage, rule.bossReadySeconds[state.bosses], state.seconds)) return state
      if (state.mode === 'relic-hunt' && state.relics !== rule.relicReadySeconds.length) return state
      if (state.mode === 'chaos-arena' && state.waves !== rule.waveReadySeconds.length) return state
      return finish({ ...state, bosses: stage })
    }
    case 'relic-collected': {
      if (state.mode !== 'relic-hunt'
        || !validIndex(event.index, state.relics + 1, rule.relicReadySeconds[state.relics], state.seconds)) return state
      return finish({ ...state, relics: state.relics + 1 })
    }
    case 'relic-damaged': {
      if (state.mode !== 'relic-hunt' || state.relics === 0
        || !Number.isFinite(event.amount) || event.amount <= 0) return state
      return finish({ ...state, relicIntegrity: Math.max(0, state.relicIntegrity - event.amount) })
    }
    case 'wave-cleared': {
      if (state.mode !== 'chaos-arena'
        || !validIndex(event.index, state.waves + 1, rule.waveReadySeconds[state.waves], state.seconds)) return state
      return finish({ ...state, waves: state.waves + 1 })
    }
    case 'major-event-cleared': {
      const interval = rule.majorEventIntervalSeconds
      if (state.mode !== 'endless-eclipse' || interval === null
        || !validIndex(event.index, state.majorEvents + 1, event.index * interval, state.seconds)) return state
      return { ...state, majorEvents: state.majorEvents + 1 }
    }
  }
}

export function evaluateObjective(s: ObjectiveState): ObjectiveEvaluation {
  const config = getObjectiveMode(s.mode)
  let current: number, required: number | null, label: string
  switch (s.mode) {
    case 'boss-rush':
      current = s.bosses; required = config.bossReadySeconds.length; label = '連續首領擊敗'; break
    case 'endless-eclipse':
      current = s.majorEvents; required = null; label = '完成星蝕事件'; break
    case 'relic-hunt':
      current = s.relics + s.bosses; required = config.relicReadySeconds.length + 1; label = '聖物與守護首領'; break
    case 'cursed-expedition':
      current = s.bosses + Number(s.seconds >= (config.surviveSeconds ?? Infinity))
      required = config.bossReadySeconds.length + 1; label = '雙守衛與生存目標'; break
    case 'chaos-arena':
      current = s.waves + s.bosses; required = config.waveReadySeconds.length + 1; label = '波次與最終首領'; break
  }

  let embers = 0
  const achievements: string[] = []
  if (s.status !== 'active' && s.mode === 'endless-eclipse') {
    // Bound reward size and integer arithmetic even for extremely long runs.
    embers = Math.min(1500, Math.floor(s.seconds / 180) * config.rewardEmbers + s.majorEvents * 18)
    if (s.seconds >= 900 && s.majorEvents >= 4) achievements.push(config.achievementId)
  } else if (s.status === 'victory') {
    embers = config.rewardEmbers
    achievements.push(config.achievementId)
    if (s.mode === 'boss-rush' && s.seconds <= 360) {
      achievements.push('objectives:boss-rush-speedrun')
    }
    if (s.mode === 'relic-hunt' && s.relicIntegrity >= 80) {
      embers += 60
      achievements.push('objectives:relic-hunt-pristine')
    }
    if (s.mode === 'cursed-expedition' && s.seconds <= 390) {
      achievements.push('objectives:cursed-expedition-master')
    }
    if (s.mode === 'chaos-arena' && s.seconds <= 230) {
      achievements.push('objectives:chaos-arena-speedrun')
    }
  }

  return {
    status: s.status,
    defeatReason: s.defeatReason,
    progress: { current, required, label },
    rewards: { embers, achievements },
  }
}

const CURSES = ['blood-price', 'nightfall', 'frenzy'] as const
const CHAOS = ['swarm', 'armor', 'berserk'] as const
const round2 = (n: number): number => Math.round(n * 100) / 100

/** Read once on phase/encounter change, not once per enemy or draw call. */
export function getObjectiveDifficulty(s: ObjectiveState): ObjectiveDifficulty {
  const def = getObjectiveMode(s.mode)
  const phase = Math.floor(s.seconds / 60)
  const escalation = Math.min(1.8, 1 + phase * 0.05 + (s.bosses + s.waves + s.majorEvents) * 0.035)
  let hp = def.enemyHp * escalation
  let damage = def.enemyDamage * escalation
  let frequency = def.spawnFrequency * escalation
  let activeModifier: string | null = null
  if (s.mode === 'cursed-expedition') {
    activeModifier = CURSES[phase % CURSES.length]!
    if (activeModifier === 'blood-price') damage *= 1.2
    if (activeModifier === 'nightfall') hp *= 1.2
    if (activeModifier === 'frenzy') frequency *= 1.2
  } else if (s.mode === 'chaos-arena') {
    activeModifier = CHAOS[s.waves % CHAOS.length]!
    if (activeModifier === 'swarm') frequency *= 1.22
    if (activeModifier === 'armor') hp *= 1.24
    if (activeModifier === 'berserk') damage *= 1.22
  }
  return {
    enemyHp: round2(Math.min(8, hp)),
    enemyDamage: round2(Math.min(8, damage)),
    spawnFrequency: round2(Math.min(8, frequency)),
    activeModifier,
  }
}
