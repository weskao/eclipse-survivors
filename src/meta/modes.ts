import type { RunModeId } from './types'
import { getObjectiveMode, objectiveModeIds, type ObjectiveModeId } from '../game/content/modes/definitions'

export interface ModeConfig {
  id: RunModeId
  label: string
  description: string
  duration: number | null
  bossAt: number
  victory: 'timed-boss' | 'endless' | 'objective'
  modifiers: { enemyHp: number; enemyDamage: number; spawnFrequency: number }
}

export const modeIds: readonly RunModeId[] = ['quick', 'standard', 'endless', 'challenge']
const normal = { enemyHp: 1, enemyDamage: 1, spawnFrequency: 1 }
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
  quick: { id: 'quick', label: '迅捷遠征', description: '150 秒決戰 · 擊敗首領迎接黎明', duration: 150, bossAt: 92, victory: 'timed-boss', modifiers: normal },
  standard: { id: 'standard', label: '王國征途', description: '8 分鐘遠征 · 征服深淵魔王', duration: 480, bossAt: 300, victory: 'timed-boss', modifiers: normal },
  endless: { id: 'endless', label: '無盡生存', description: '沒有時間限制 · 魔物愈來愈強', duration: null, bossAt: 180, victory: 'endless', modifiers: { ...normal, spawnFrequency: 1.08 } },
  challenge: { id: 'challenge', label: '詛咒試煉', description: '210 秒 · 強敵侵襲與高壓戰鬥', duration: 210, bossAt: 130, victory: 'timed-boss', modifiers: { enemyHp: 1.25, enemyDamage: 1.3, spawnFrequency: 1.28 } },
  'boss-rush': objectiveConfig('boss-rush'),
  'endless-eclipse': objectiveConfig('endless-eclipse'),
  'relic-hunt': objectiveConfig('relic-hunt'),
  'cursed-expedition': objectiveConfig('cursed-expedition'),
  'chaos-arena': objectiveConfig('chaos-arena'),
}

export const getMode = (id: RunModeId): ModeConfig => MODES[id]

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
