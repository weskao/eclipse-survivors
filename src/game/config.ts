import { tuning } from './balance'
import type { JobDef, JobId, MobType, SkillRarity, UpgradeId, WorldEventKind } from './types'
import type { SpecializationId } from './content/heroes'
import type { WeaponKey } from './content/weapons/runtime'
import type { BossId } from './content/bosses/definitions'
import type { ObjectiveModeId } from './content/modes/definitions'

type CombatStats = Pick<JobDef, 'hp' | 'speed' | 'damage' | 'delay' | 'range'>

/**
 * Single source of truth for player-facing and gameplay balance.
 * Edit the appropriate balance/<domain>.json and register new domains in balance/index.ts.
 * Existing callers continue to access one typed BALANCE object.
 * Type-checking catches missing hero, skill, rarity, enemy and weapon keys.
 * Treat imported balance values as immutable during a run.
 */
export const BALANCE = Object.freeze(tuning satisfies {
  heroes: { classic: Record<JobId, CombatStats>; special: Record<SpecializationId, CombatStats>; specialCooldowns: Record<SpecializationId, number> }
  progression: { rarityWeights: Record<SkillRarity, number> }
  skills: { maxLevels: Record<UpgradeId, number> }
  weapons: { intervals: Record<WeaponKey, number> }
  events: { weights: Record<WorldEventKind, number> }
  enemies: { baseHp: Record<MobType, number> }
  bosses: { health: Record<BossId, number> }
  modes: { objectives: Record<ObjectiveModeId, {
    timeLimitSeconds: number | null; surviveSeconds: number | null
    bossReadySeconds: number[]; relicReadySeconds: number[]
    waveReadySeconds: number[]; majorEventIntervalSeconds: number | null
    rewardEmbers: number; enemyHp: number; enemyDamage: number; spawnFrequency: number
  }> }
  relics: { items: Record<string, { maxStacks: number; bonuses: Record<string, number> }> }
  meta: {
    research: Record<'power' | 'vitality' | 'insight' | 'scavenging' | 'ember-study', {
      maxRank: number; firstCost: number; costStep: number; lateCostStartRank: number
      lateCostStep: number; benefitPerRank: number
    }>
    runRewards: {
      killDivisor: number; secondsDivisor: number; victoryEmbers: number; baseMultiplier: number
      masteryBaseXp: number; masteryKillsDivisor: number; masteryVictoryXp: number
      masteryXpMax: number; masteryMaxLevel: number; masteryLevelDivisor: number
    }
    achievementEmbers: Record<string, number>
    milestoneEmbers: Record<string, number>
    startingEquipment: Record<string, { cost: number; masteryLevel: number }>
    startingBonuses: Record<string, { cost: number; bonus: number }>
  }
})

export type ResearchId = keyof typeof BALANCE.meta.research

/** Pricing at the current owned rank. Existing first three prices are preserved for legacy saves. */
export function researchCost(id: ResearchId, ownedRank: number): number {
  const def = BALANCE.meta.research[id]
  const lateRanks = Math.max(0, ownedRank - def.lateCostStartRank)
  return def.firstCost + ownedRank * def.costStep + lateRanks * lateRanks * def.lateCostStep
}
