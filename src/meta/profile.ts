import { BALANCE, researchCost } from '../game/config'
import type { AbilityId, JobId } from '../game/types'
import { MONSTER_IDS, type MonsterKills } from '../game/monster-catalog'
import { EVOLUTIONS } from '../game/evolutions'
import { isContentId } from '../game/content/registry'
import { ACHIEVEMENTS, newlyEarned } from './achievements'
import { modeIds } from './modes'
import type { CosmeticId, PermanentUpgrade, Profile, RunBest, RunRewards, RunStats } from './types'

export const SAVE_KEY = 'eclipse-survivors.profile.v2'
const jobs: JobId[] = ['knight', 'ranger', 'wizard']
const monsters = MONSTER_IDS
const abilities: AbilityId[] = ['damage', 'speed', 'haste', 'maxhp', 'multi', 'orb', 'magnet', 'heal', 'bolt', 'frost', 'meteor', 'blaze', 'vortex', 'shield', 'chain', ...EVOLUTIONS.map(e => e.id)]
const validAbility = (id: unknown): id is AbilityId => typeof id === 'string' && (abilities.includes(id as AbilityId) || isContentId(id))
const cosmetics: CosmeticId[] = ['knight-default', 'ranger-default', 'wizard-default', 'knight-gilded', 'ranger-moonlit', 'wizard-astral']
const defaults: Record<JobId, CosmeticId> = { knight: 'knight-default', ranger: 'ranger-default', wizard: 'wizard-default' }
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const nonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const listOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] =>
  Array.isArray(v) && v.length <= 1024 && v.every((x: unknown) => typeof x === 'string' && allowed.includes(x as T))
const validBest = (v: unknown): v is RunBest =>
  isObj(v) && nonNegative(v.seconds) && nonNegative(v.kills) && nonNegative(v.level) && typeof v.victory === 'boolean'

export function emptyProfile(): Profile {
  return {
    version: 2, runs: 0, wins: 0, embers: 0, best: {}, achievements: [], recentRunIds: [],
    discoveredMonsters: {}, discoveredAbilities: [], heroesPlayed: [],
    unlockedCosmetics: [...Object.values(defaults)], equippedCosmetics: { ...defaults },
    upgrades: { power: 0, vitality: 0 },
  }
}

/** Validates data at the storage boundary; unknown future versions are never overwritten on read. */
export function migrateProfile(raw: unknown): Profile | null {
  if (!isObj(raw)) return null
  if (raw.version === 1) {
    const best = raw.bestSeconds
    const wins = raw.victories
    if (!nonNegative(best) || !nonNegative(wins)) return null
    const p = emptyProfile()
    p.wins = Math.floor(wins)
    if (best > 0) p.best.quick = { seconds: best, kills: 0, level: 1, victory: true }
    return p
  }
  if (raw.version !== 2 || !nonNegative(raw.runs) || !nonNegative(raw.wins) || !nonNegative(raw.embers)
    || !Number.isInteger(raw.runs) || !Number.isInteger(raw.wins) || !Number.isInteger(raw.embers)) return null
  const p = emptyProfile()
  if (!isObj(raw.best) || !isObj(raw.upgrades) || !isObj(raw.discoveredMonsters) || !isObj(raw.equippedCosmetics)) return null
  if (!nonNegative(raw.upgrades.power) || !nonNegative(raw.upgrades.vitality)
    || !Number.isInteger(raw.upgrades.power) || !Number.isInteger(raw.upgrades.vitality)
    || raw.upgrades.power > BALANCE.meta.research.power.maxRank || raw.upgrades.vitality > BALANCE.meta.research.vitality.maxRank) return null
  const names = ACHIEVEMENTS.map(a => a.id)
  if (!listOf(raw.achievements, names) || !Array.isArray(raw.discoveredAbilities) || raw.discoveredAbilities.length > 1024
    || !raw.discoveredAbilities.every(validAbility)
    || !listOf(raw.heroesPlayed, jobs) || !listOf(raw.unlockedCosmetics, cosmetics)
    || !Array.isArray(raw.recentRunIds) || raw.recentRunIds.length > 128
    || !raw.recentRunIds.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length < 128)) return null
  for (const key of modeIds) {
    if (raw.best[key] !== undefined) {
      if (!validBest(raw.best[key])) return null
      p.best[key] = { ...raw.best[key] }
    }
  }
  for (const type of monsters) {
    if (raw.discoveredMonsters[type] !== undefined) {
      if (!nonNegative(raw.discoveredMonsters[type])) return null
      p.discoveredMonsters[type] = Math.floor(raw.discoveredMonsters[type])
    }
  }
  for (const hero of jobs) {
    const skin = raw.equippedCosmetics[hero]
    if (!cosmetics.includes(skin as CosmeticId) || !String(skin).startsWith(hero + '-')
      || !raw.unlockedCosmetics.includes(skin as CosmeticId)) return null
    p.equippedCosmetics[hero] = skin as CosmeticId
  }
  p.runs = raw.runs
  p.wins = raw.wins
  p.embers = raw.embers
  p.achievements = [...new Set(raw.achievements as string[])]
  p.recentRunIds = [...new Set(raw.recentRunIds as string[])].slice(-128)
  p.discoveredAbilities = [...new Set(raw.discoveredAbilities as AbilityId[])]
  p.heroesPlayed = [...new Set(raw.heroesPlayed as JobId[])]
  p.unlockedCosmetics = [...new Set(raw.unlockedCosmetics as CosmeticId[])]
  p.upgrades = { power: raw.upgrades.power, vitality: raw.upgrades.vitality }
  return p
}

export interface ProfileStore {
  get(): Profile
  recordRun(stats: RunStats): RunRewards
  buyUpgrade(id: PermanentUpgrade): boolean
  selectCosmetic(hero: JobId, skin: CosmeticId): boolean
  reset(): void
}
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const copy = (p: Profile): Profile => JSON.parse(JSON.stringify(p)) as Profile

function defaultStorage(): Store | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

export function createProfileStore(storage: Store | null = defaultStorage()): ProfileStore {
  let profile = emptyProfile()
  try {
    const content = storage?.getItem(SAVE_KEY)
    if (content) profile = migrateProfile(JSON.parse(content)) ?? emptyProfile()
  } catch { /* Blocked storage, corrupted JSON or privacy mode: use in-memory defaults. */ }
  const persist = (): void => { try { storage?.setItem(SAVE_KEY, JSON.stringify(profile)) } catch { /* Memory-only fallback. */ } }
  return {
    get: () => copy(profile),
    recordRun(stats) {
      if (!stats.id || profile.recentRunIds.includes(stats.id)) return { embers: 0, newAchievements: [], newCosmetics: [] }
      if (!modeIds.includes(stats.mode) || !jobs.includes(stats.hero) || !nonNegative(stats.seconds)
        || !nonNegative(stats.kills) || !nonNegative(stats.level)) return { embers: 0, newAchievements: [], newCosmetics: [] }
      profile.recentRunIds = [...profile.recentRunIds, stats.id].slice(-128)
      profile.runs++
      if (stats.victory) profile.wins++
      if (!profile.heroesPlayed.includes(stats.hero)) profile.heroesPlayed.push(stats.hero)
      for (const type of monsters) {
        const count = ((stats.monsterKills ?? stats.enemies) as MonsterKills)[type] ?? 0
        if (nonNegative(count) && count) profile.discoveredMonsters[type] = (profile.discoveredMonsters[type] ?? 0) + Math.floor(count)
      }
      for (const skill of stats.abilities) if (validAbility(skill) && !profile.discoveredAbilities.includes(skill)) profile.discoveredAbilities.push(skill)
      const best = profile.best[stats.mode]
      if (!best || stats.kills > best.kills || (stats.kills === best.kills && stats.seconds > best.seconds))
        profile.best[stats.mode] = { seconds: stats.seconds, kills: stats.kills, level: stats.level, victory: stats.victory }
      const awarded = newlyEarned(profile, stats)
      const newCosmetics: CosmeticId[] = []
      for (const achievement of awarded) {
        profile.achievements.push(achievement.id)
        if (achievement.cosmetic && !profile.unlockedCosmetics.includes(achievement.cosmetic)) {
          profile.unlockedCosmetics.push(achievement.cosmetic)
          newCosmetics.push(achievement.cosmetic)
        }
      }
      const base = Math.floor(stats.kills / BALANCE.meta.runRewards.killDivisor)
        + Math.floor(stats.seconds / BALANCE.meta.runRewards.secondsDivisor)
        + (stats.victory ? BALANCE.meta.runRewards.victoryEmbers : 0)
      const earned = Math.floor(base * BALANCE.meta.runRewards.baseMultiplier)
        + awarded.reduce((sum, achievement) => sum + (BALANCE.meta.achievementEmbers[achievement.id as keyof typeof BALANCE.meta.achievementEmbers] ?? 0), 0)
      profile.embers += earned
      persist()
      return { embers: earned, newAchievements: awarded.map(a => a.id), newCosmetics }
    },
    buyUpgrade(id) {
      const tier = profile.upgrades[id]
      if (tier === undefined || tier >= BALANCE.meta.research[id].maxRank || profile.embers < researchCost(id, tier)) return false
      profile.embers -= researchCost(id, tier)
      profile.upgrades[id]++
      persist()
      return true
    },
    selectCosmetic(hero, skin) {
      if (!jobs.includes(hero) || !profile.unlockedCosmetics.includes(skin) || !skin.startsWith(hero + '-')) return false
      profile.equippedCosmetics[hero] = skin
      persist()
      return true
    },
    reset() {
      profile = emptyProfile()
      try { storage?.removeItem(SAVE_KEY) } catch { /* Memory-only fallback. */ }
    },
  }
}
