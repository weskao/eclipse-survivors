import type { AbilityId, JobId, MobType } from '../game/types'

export type RunModeId = 'quick' | 'standard' | 'endless' | 'challenge'
export type PermanentUpgrade = 'power' | 'vitality'
export type CosmeticId =
  | 'knight-default' | 'ranger-default' | 'wizard-default'
  | 'knight-gilded' | 'ranger-moonlit' | 'wizard-astral'

export interface RunStats {
  id: string
  mode: RunModeId
  hero: JobId
  victory: boolean
  seconds: number
  kills: number
  level: number
  damageDealt: number
  damageTaken: number
  remainingHp: number
  bossDefeated: boolean
  enemies: Partial<Record<MobType, number>>
  abilities: AbilityId[]
}
export interface RunBest { seconds: number; kills: number; level: number; victory: boolean }
export interface Profile {
  version: 2
  runs: number
  wins: number
  embers: number
  best: Partial<Record<RunModeId, RunBest>>
  achievements: string[]
  recentRunIds: string[]
  discoveredMonsters: Partial<Record<MobType, number>>
  discoveredAbilities: AbilityId[]
  heroesPlayed: JobId[]
  unlockedCosmetics: CosmeticId[]
  equippedCosmetics: Record<JobId, CosmeticId>
  upgrades: Record<PermanentUpgrade, number>
}
export interface RunRewards { embers: number; newAchievements: string[]; newCosmetics: CosmeticId[] }
