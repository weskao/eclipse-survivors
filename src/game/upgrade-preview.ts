import { BALANCE } from './config'
import { heroMasteryPreview, type MasteryStatChange } from './content/heroes/mastery-preview'
import { EVOLUTION2_RECIPES } from './content/evolution2/recipes'
import type { EvolutionId } from './types'
import type { WeaponKey } from './content/weapons/runtime'

const number = (n: number) => String(Number(n.toFixed(2)))
const percent = (n: number) => number(n * 100) + '%'
const seconds = (n: number) => number(n) + 's'
const linear = (base: number, perRank: number) => (rank: number) => base + perRank * rank

/** Rank-local comparisons: excludes unrelated hero equipment, relics and temporary buffs.
 * A dash denotes an unlearned skill's inactive parameter, not a zero-second cooldown. */
export function upgradeStatPreview(id: string, level?: number, maxLevel?: number): MasteryStatChange[] | undefined {
  if (level === undefined || maxLevel === undefined || !Number.isInteger(level) || level < 0 || level >= maxLevel) return
  const mastery = heroMasteryPreview(id, level, maxLevel)
  if (mastery) return mastery
  const { statUpgrades: S, passive: P, area: A } = BALANCE.skills
  const W = BALANCE.weapons
  const rows: MasteryStatChange[] = []
  const row = (label: string, value: (rank: number) => number, format = number, inactive = false) => {
    const before = inactive && level === 0 ? '—' : format(value(level))
    const after = format(value(level + 1))
    if (before !== after) rows.push({ label, before, after })
  }
  const damage = (base: number, step: number) => row('技能傷害倍率', linear(base, step), percent, true)
  const radius = (base: number, step: number) => row('技能作用範圍', linear(base, step), number, true)
  const cooldown = (base: number, step: number, floor: number) => row('技能冷卻時間', rank => Math.max(floor, base - step * rank), seconds, true)
  const count = (label: string, value: (rank: number) => number) => row(label, rank => rank === 0 ? 0 : value(rank))
  const area = (a: { cooldownBase: number; cooldownPerRank: number; cooldownFloor: number; rangeBase: number; rangePerRank: number; damageBase: number; damagePerRank: number; maxRankRangeBonus?: number }) => {
    damage(a.damageBase, a.damagePerRank)
    row('技能作用範圍', rank => a.rangeBase + rank * a.rangePerRank + (rank >= 5 ? a.maxRankRangeBonus ?? 0 : 0), number, true)
    cooldown(a.cooldownBase, a.cooldownPerRank, a.cooldownFloor)
  }
  switch (id) {
    case 'damage': row('技能攻擊倍率', rank => S.damageMultiplier ** rank, percent); break
    case 'speed': row('技能移動倍率', rank => S.speedMultiplier ** rank, percent); break
    case 'haste': row('技能攻擊間隔倍率', rank => S.attackDelayMultiplier ** rank, percent); break
    case 'maxhp': row('技能生命上限加成', rank => S.maxHpAdded * rank); break
    case 'multi':
      row('同時攻擊數', rank => Math.min(4, rank + 1))
      row('技能射程倍率', rank => S.multiRangeMultiplier ** rank, percent); break
    case 'orb': count('飛刃數量', rank => Math.min(A.orb.maxBlades, rank + 1 + (rank >= 5 ? A.orb.maxRankBonusBlades : 0))); break
    case 'magnet': row('經驗吸取範圍', linear(P.xpMagnetBase, P.xpMagnetPerRank)); break
    case 'heal': row('每秒生命恢復', rank => P.regenPerRank * rank); break
    case 'bolt':
      count('目標數量', rank => Math.min(A.bolt.maxTargets, A.bolt.targetBase + rank))
      cooldown(A.bolt.cooldownBase, A.bolt.cooldownPerRank, A.bolt.cooldownFloor)
      row('感電減速時間', rank => rank >= 5 ? A.bolt.maxRankShockSeconds : 0, seconds); break
    case 'frost': area(A.frost); row('減速持續時間', linear(A.frost.slowBase, A.frost.slowPerRank), seconds, true); break
    case 'meteor': area(A.meteor); count('目標數量', rank => Math.min(A.meteor.maxTargets, A.meteor.targetBase + rank)); break
    case 'blaze': area(A.blaze); break
    case 'vortex': area(A.vortex); break
    case 'shield': row('受到傷害減免', rank => Math.min(P.shieldReductionCap, rank * P.shieldReductionPerRank), percent); break
    case 'chain':
      damage(P.chainDamageBase, P.chainDamagePerRank)
      count('目標數量', rank => BALANCE.combat.chainTargetsByRank[Math.min(rank, BALANCE.combat.chainTargetsByRank.length) - 1] ?? 0)
      cooldown(P.chainCooldownBase, P.chainCooldownPerRank, BALANCE.combat.chainMinCooldown)
      row('感電減速時間', rank => rank >= BALANCE.combat.chainShockRank ? BALANCE.combat.chainShockSeconds : 0, seconds)
      count('擊殺額外放電目標', rank => rank >= BALANCE.combat.chainDischargeRank ? 1 : 0); break
  }
  if (rows.length) return rows

  const evo = EVOLUTION2_RECIPES.find(recipe => recipe.id === id)
  const classicCooldown = BALANCE.evolutions.cooldowns[id as EvolutionId]
  if (evo || classicCooldown !== undefined) {
    row('技能冷卻時間', () => evo?.cooldownSeconds ?? classicCooldown, seconds, true)
    return rows.length ? rows : undefined
  }

  if (!id.startsWith('weapons:')) return
  const key = id.slice('weapons:'.length) as WeaponKey
  const interval = W.intervals[key]
  if (interval === undefined) return
  switch (key) {
    case 'shadow-daggers': damage(0.42, 0.115); count('投射物數量', rank => Math.min(6, 1 + rank)); count('彈跳次數', rank => 2 + Math.floor(rank / 2)); break
    case 'holy-lance': damage(1.12 - W.common.straightDamagePerRank, W.common.straightDamagePerRank); count('穿透數量', rank => 2 + rank); break
    case 'blood-scythe': damage(W.scythe.damageBase, W.scythe.damagePerRank); radius(W.scythe.sweepRangeBase, W.scythe.sweepRangePerRank); row('吸血上限', linear(W.scythe.lifestealLimitBase, W.scythe.lifestealLimitPerRank), number, true); break
    case 'arcane-mines': damage(W.arcaneMines.damageBase, W.arcaneMines.damagePerRank); radius(W.arcaneMines.radiusBase, W.arcaneMines.radiusPerRank); break
    case 'bone-spears': damage(0.58, 0.18); count('投射物數量', rank => Math.min(6, 2 + rank)); count('穿透數量', rank => 2 + Math.floor(rank / 3)); break
    case 'poison-cloud': damage(W.poisonCloud.damageBase, W.poisonCloud.damagePerRank); radius(W.poisonCloud.radiusBase, W.poisonCloud.radiusPerRank); break
    case 'ricochet-blades': damage(0.62, 0.135); count('彈跳次數', rank => 2 + rank); break
    case 'spirit-wolves': damage(W.spiritWolves.damageBase, W.spiritWolves.damagePerRank); count('召喚物數量', rank => Math.min(3, 1 + Math.floor(rank / 2))); cooldown(W.spiritWolves.attackCooldownBase, W.spiritWolves.attackCooldownPerRank, 0.52); break
    case 'solar-beam': damage(W.solarBeam.damageBase, W.solarBeam.damagePerRank); radius(W.solarBeam.rangeBase, W.solarBeam.rangePerRank); row('光束寬度', linear(W.solarBeam.widthBase, W.solarBeam.widthPerRank), number, true); break
    case 'gravity-orbs': damage(W.gravity.damageBase, W.gravity.damagePerRank); count('法球數量', rank => Math.min(3, 1 + Math.floor(rank / 2))); break
    case 'spectral-bow': damage(1.9 - W.common.straightDamagePerRank, W.common.straightDamagePerRank); count('穿透數量', rank => 1 + Math.ceil(rank / 2)); break
    case 'thorn-chain': damage(W.thornChain.damageBase, W.thornChain.damagePerRank); count('目標數量', rank => Math.min(6, 2 + rank)); break
  }
  if (interval > 0) row('技能冷卻時間', rank => Math.max(W.common.cooldownFloor, interval * (1 - W.common.cooldownReductionPerRank * (rank - 1))), seconds, true)
  return rows.length ? rows : undefined
}
