import { BALANCE } from '../../config'

export interface MasteryStatChange {
  label: string
  before: string
  after: string
}

export const HERO_MASTERY_DESCRIPTIONS = {
  shadowblade: '強化暴擊與影襲傷害。',
  'spirit-summoner': '強化靈體攻擊、治療與靈潮集結。',
  'crimson-paladin': '強化減傷、反擊、低血量增傷、屏障與緋紅報復。',
} as const

const number = (value: number) => String(Number(value.toFixed(2)))
const percent = (value: number) => number(value * 100) + '%'
const bonus = (value: number) => '+' + number(value)

/** Compare the offered rank, not the hero level or permanent mastery. Values are
 * skill-specific multipliers/bonuses from the same balance data as combat. */
export function heroMasteryPreview(id: string, level?: number, maxLevel?: number): MasteryStatChange[] | undefined {
  if (level === undefined || maxLevel === undefined || !Number.isInteger(level) || level < 0 || level >= maxLevel) return
  const next = level + 1
  const row = (label: string, value: (rank: number) => number, format = percent): MasteryStatChange =>
    ({ label, before: format(value(level)), after: format(value(next)) })
  const { shadowblade: shadow, 'spirit-summoner': spirit, 'crimson-paladin': paladin } = BALANCE.heroes.specialEffects
  switch (id) {
    case 'heroes:shadow-precision': return [
      row('暴擊傷害倍率', rank => shadow.critMultiplier + rank * shadow.critBonusPerRank),
      row('主動傷害倍率（Q）', rank => shadow.specialDamageBase + rank * shadow.specialDamagePerRank),
    ]
    case 'heroes:spirit-bond': return [
      row('夥伴傷害倍率', rank => 1 + rank * spirit.companionDamagePerRank),
      row('守護靈每次治療', rank => spirit.guardianHealBase + rank * spirit.guardianHealPerRank, number),
      row('主動傷害倍率（Q）', rank => spirit.specialDamageBase + rank * spirit.specialDamagePerRank),
    ]
    case 'heroes:crimson-vow': return [
      row('受到傷害減免', rank => paladin.baseReduction + Math.min(paladin.extraReductionCap, rank * paladin.reductionPerRank)),
      row('反擊傷害倍率', rank => paladin.counterDamageBase + rank * paladin.counterDamagePerRank),
      row('低血量傷害倍率', rank => paladin.lowHpDamageBase + rank * paladin.lowHpDamagePerRank),
      row('屏障額外吸收（Q）', rank => rank * paladin.barrierPerRank, bonus),
      row('緋紅報復傷害倍率（Q）', rank => paladin.retributionAbsorbRatio + rank * paladin.retributionRatioPerRank),
    ]
  }
}
