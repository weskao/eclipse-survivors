import { t } from '../../../i18n'
import { MODES, isObjectiveModeId } from '../../../meta/modes'
import type { RunModeId } from '../../../meta/types'
import { getObjectiveMode } from '../../../game/content/modes/definitions'

export interface ModeDetails {
  description: string
  victoryDescription: string
  preRunModifiers: readonly string[]
  rewardText: string
}

/** Shared localized dossier for both the hover surface and the Info dialog. */
export function getModeDetails(id: RunModeId): ModeDetails {
  if (isObjectiveModeId(id)) {
    const rule = getObjectiveMode(id)
    return {
      description: t(rule.description),
      victoryDescription: t(rule.victoryDescription),
      preRunModifiers: rule.preRunModifiers.map(modifier => t(modifier)),
      rewardText: t(id === 'endless-eclipse'
        ? '每 3 分鐘 +{embers} 餘燼（最高 1500）' : '勝利獎勵 {embers} 餘燼', { embers: rule.rewardEmbers }),
    }
  }
  const mode = MODES[id]
  const endless = mode.victory === 'endless'
  const percent = (value: number) => Math.round(value * 100)
  const modifiers = t('敵人生命 {hp}% · 傷害 {damage}% · 生成頻率 {spawn}%（相對基準）', {
    hp: percent(mode.modifiers.enemyHp), damage: percent(mode.modifiers.enemyDamage),
    spawn: percent(mode.modifiers.spawnFrequency),
  })
  return {
    description: t(mode.description),
    victoryDescription: endless ? t('沒有固定勝利終點，持續生存並累積戰績。')
      : t('至少存活 {seconds} 秒，並擊敗已登場的首領。', { seconds: mode.duration }),
    preRunModifiers: [
      endless ? t('無時間限制') : t('首領最早於 {seconds} 秒後登場。', { seconds: mode.bossAt }),
      modifiers,
    ],
    rewardText: endless ? t('依擊殺數與生存時間結算餘燼，無固定通關獎勵。')
      : t('依擊殺數、生存時間及勝利結果結算餘燼。'),
  }
}
