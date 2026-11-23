import tuning from './balance/balance.json'
import type { JobDef, JobId, MobType, SkillRarity, UpgradeId, WorldEventKind } from './types'
import type { SpecializationId } from './content/heroes'
import type { WeaponKey } from './content/weapons/runtime'

type CombatStats = Pick<JobDef, 'hp' | 'speed' | 'damage' | 'delay' | 'range'>

/**
 * Single source of truth for player-facing and gameplay balance.
 * Edit balance/balance.json, not literals in combat and UI consumers.
 * Type-checking catches missing hero, skill, rarity, enemy and weapon keys.
 * Treat imported balance values as immutable during a run.
 */
export const BALANCE = Object.freeze(tuning satisfies {
  heroes: { classic: Record<JobId, CombatStats>; special: Record<SpecializationId, CombatStats> }
  progression: { rarityWeights: Record<SkillRarity, number> }
  skills: { maxLevels: Record<UpgradeId, number> }
  weapons: { intervals: Record<WeaponKey, number> }
  events: { weights: Record<WorldEventKind, number> }
  enemies: { baseHp: Record<MobType, number> }
})
