import tuning from './balance/balance.json'
import type { JobDef, JobId, MobType, SkillRarity, UpgradeId, WorldEventKind } from './types'
import type { SpecializationId } from './content/heroes'
import type { WeaponKey } from './content/weapons/runtime'
import type { BossId } from './content/bosses/definitions'
import type { ObjectiveModeId } from './content/modes/definitions'

type CombatStats = Pick<JobDef, 'hp' | 'speed' | 'damage' | 'delay' | 'range'>

/**
 * Single source of truth for player-facing and gameplay balance.
 * Edit balance/balance.json, not literals in combat and UI consumers.
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
})
