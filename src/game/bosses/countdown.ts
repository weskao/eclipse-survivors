import { getMode, isObjectiveModeId } from '../../meta/modes'
import { getObjectiveMode } from '../content/modes/definitions'
import type { ObjectiveState } from '../content/objectives/evaluator'
import type { BossId } from '../content/bosses/definitions'
import { BOSS_DEFINITIONS } from '../content/bosses/definitions'
import type { GameState } from '../types'

export const BOSS_WARNING_SECONDS = 15
const BOSS_IDS = Object.keys(BOSS_DEFINITIONS) as BossId[]

export interface BossArrivalWarning {
  readonly bossId: BossId | null
  readonly seconds: number
  readonly progress: number
  readonly urgent: boolean
}

/** Pure projection of the existing simulation clock. Never sets a wall-clock timer. */
export function getBossArrivalWarning(
  state: GameState, objective: ObjectiveState | null, timedBossId: BossId | null = null,
): BossArrivalWarning | null {
  if (state.mode !== 'play' ||
    state.mobs.some(mob => mob.type === 'boss' && mob.hp > 0)) return null

  let readyAt: number
  let bossId: BossId | null = null
  if (isObjectiveModeId(state.runMode)) {
    if (!objective || objective.mode !== state.runMode || objective.status !== 'active') return null
    const rule = getObjectiveMode(state.runMode)
    // Do not promise an arrival until all required relics/waves were earned.
    if ((state.runMode === 'relic-hunt' && objective.relics < rule.relicReadySeconds.length) ||
      (state.runMode === 'chaos-arena' && objective.waves < rule.waveReadySeconds.length)) return null
    const next = rule.bossReadySeconds[objective.bosses]
    if (next === undefined) return null
    readyAt = next
    bossId = BOSS_IDS[objective.bosses % BOSS_IDS.length]!
  } else {
    const mode = getMode(state.runMode)
    if (state.bossSpawned || mode.victory === 'objective' || !Number.isFinite(mode.bossAt)) return null
    readyAt = mode.bossAt
    // The engine owns the rotation; standalone legacy encounters have no authored identity.
    bossId = timedBossId
  }
  const left = readyAt - state.time
  if (!Number.isFinite(left) || left > BOSS_WARNING_SECONDS) return null
  const seconds = Math.max(0, Math.ceil(left))
  return {
    bossId, seconds, urgent: seconds <= 5,
    progress: Math.max(0, Math.min(1, (BOSS_WARNING_SECONDS - Math.max(0, left)) / BOSS_WARNING_SECONDS)),
  }
}
