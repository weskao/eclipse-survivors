import { BALANCE } from '../game/config'
import type { RunModeId } from './types'
import { getObjectiveMode, objectiveModeIds, type ObjectiveModeId } from '../game/content/modes/definitions'

export interface ModeConfig {
  id: RunModeId
  /** Presentation only; true enables the shared HOT recommendation badge. */
  hot?: boolean
  label: string
  description: string
  duration: number | null
  bossAt: number
  victory: 'timed-boss' | 'endless' | 'objective'
  modifiers: { enemyHp: number; enemyDamage: number; spawnFrequency: number }
}

export const modeIds: readonly RunModeId[] = ['quick', 'standard', 'endless', 'challenge']
const normal = BALANCE.modes.normalModifiers
export const isObjectiveModeId = (mode: RunModeId): mode is ObjectiveModeId =>
  objectiveModeIds.includes(mode as ObjectiveModeId)

/** ES2 modes use actual objective receipts, never the legacy timed-boss victory flag. */
const objectiveConfig = (id: ObjectiveModeId): ModeConfig => {
  const rule = getObjectiveMode(id)
  return {
    id, label: rule.title, description: rule.description,
    duration: rule.timeLimitSeconds, bossAt: Number.POSITIVE_INFINITY,
    victory: 'objective',
    modifiers: { enemyHp: rule.enemyHp, enemyDamage: rule.enemyDamage, spawnFrequency: rule.spawnFrequency },
  }
}
export const MODES: Record<RunModeId, ModeConfig> = {
  quick: { id: 'quick', label: '迅捷遠征', description: '150 秒決戰 · 擊敗首領迎接黎明', duration: BALANCE.modes.classic.quick.duration, bossAt: BALANCE.modes.classic.quick.bossAt, victory: 'timed-boss', modifiers: normal },
  standard: { id: 'standard', label: '王國征途', description: '8 分鐘遠征 · 征服深淵魔王', duration: BALANCE.modes.classic.standard.duration, bossAt: BALANCE.modes.classic.standard.bossAt, victory: 'timed-boss', modifiers: normal },
  endless: { id: 'endless', label: '無盡生存', description: '沒有時間限制 · 魔物愈來愈強', duration: BALANCE.modes.classic.endless.duration, bossAt: BALANCE.modes.classic.endless.bossAt, victory: 'endless', modifiers: { ...normal, spawnFrequency: BALANCE.modes.classic.endless.spawnFrequency } },
  challenge: { id: 'challenge', label: '詛咒試煉', description: '210 秒 · 強敵侵襲與高壓戰鬥', duration: BALANCE.modes.classic.challenge.duration, bossAt: BALANCE.modes.classic.challenge.bossAt, victory: 'timed-boss', modifiers: { enemyHp: BALANCE.modes.classic.challenge.enemyHp, enemyDamage: BALANCE.modes.classic.challenge.enemyDamage, spawnFrequency: BALANCE.modes.classic.challenge.spawnFrequency } },
  'boss-rush': { ...objectiveConfig('boss-rush'), hot: true },
  'endless-eclipse': objectiveConfig('endless-eclipse'),
  'relic-hunt': objectiveConfig('relic-hunt'),
  'cursed-expedition': objectiveConfig('cursed-expedition'),
  'chaos-arena': objectiveConfig('chaos-arena'),
}

export const getMode = (id: RunModeId): ModeConfig => MODES[id]

// Compact presentation copy for both the board and selected-expedition dock.
const objectiveBriefs: Readonly<Record<ObjectiveModeId, string>> = {
  'boss-rush': '依序挑戰五位首領，敵人逐戰增強。',
  'endless-eclipse': '無盡求生，迎戰週期性星蝕事件。',
  'relic-hunt': '回收四件聖物，擊敗守護首領。',
  'cursed-expedition': '承受輪替詛咒，擊敗兩位守衛。',
  'chaos-arena': '突破八波遭遇戰，挑戰混沌首領。',
}
export const getModeBrief = (id: RunModeId): string => isObjectiveModeId(id) ? objectiveBriefs[id] : MODES[id].description

/** A timed victory requires the boss death event, never just a cleared mob array. */
export function hasWonRun(
  id: RunModeId,
  run: { seconds: number; bossSpawned: boolean; bossDefeated: boolean },
): boolean {
  const mode = getMode(id)
  return mode.victory === 'timed-boss'
    && mode.duration !== null
    && run.seconds >= mode.duration
    && run.bossSpawned
    && run.bossDefeated
}
