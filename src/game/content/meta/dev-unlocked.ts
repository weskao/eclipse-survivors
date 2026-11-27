import { ACHIEVEMENTS as LEGACY_ACHIEVEMENTS } from '../../../meta/achievements'
import { emptyProfile, SAVE_KEY } from '../../../meta/profile'
import { UP } from '../../constants'
import { EVOLUTIONS } from '../../evolutions'
import {
  ACHIEVEMENTS, MILESTONES, RESEARCH, STARTING_BONUSES, STARTING_EQUIPMENT,
  LEGACY_COSMETICS, LEGACY_EVOLUTIONS, LEGACY_WEAPONS,
} from './catalog'
import { createMetaState } from './state'
import { META_V3_HEAD_KEY, META_V3_SLOT_KEYS } from './store'

/** Per-page, disposable storage: playtest progress never reads or writes a real save. */
function memoryStorage(initial: readonly (readonly [string, string])[]) {
  const bytes = new Map(initial)
  return {
    getItem: (key: string): string | null => bytes.get(key) ?? null,
    setItem: (key: string, value: string): void => { bytes.set(key, value) },
    removeItem: (key: string): void => { bytes.delete(key) },
  }
}

/** Seed only supported v3 unlocks. The real transaction store still validates all writes. */
export function createUnlockedPlaytestMetaStorage(embers = 100_000, hall = false) {
  const state = createMetaState()
  state.embers = embers
  state.runs = 20
  state.wins = 10
  state.bossWins = 3
  state.achievements = ACHIEVEMENTS.map(item => item.id)
  state.claimedMilestones = MILESTONES.map(item => item.id)
  state.research = Object.fromEntries(RESEARCH.map(item => [item.id, item.maxRank]))
  state.equipment = STARTING_EQUIPMENT.map(item => item.id)
  state.bonuses = STARTING_BONUSES.map(item => item.id)
  state.cosmetics = [...LEGACY_COSMETICS]
  state.discoveries.weapons = [...LEGACY_WEAPONS]
  state.discoveries.evolutions = [...LEGACY_EVOLUTIONS]
  if (hall) for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) state.mastery['heroes:' + id] = { xp: 5_000, level: 6 }
  for (const mastery of Object.values(state.mastery)) {
    mastery.xp = 5_000
    mastery.level = 6
  }
  return memoryStorage([
    [META_V3_HEAD_KEY, JSON.stringify({ version: 3, slot: 'a', revision: 1 })],
    [META_V3_SLOT_KEYS.a, JSON.stringify({
      schema: 'eclipse-survivors.meta.v3', revision: 1, state, legacyProfile: null,
    })],
  ])
}

export function createUnlockedPlaytestProfileStorage() {
  const profile = emptyProfile()
  profile.embers = 100_000
  profile.runs = 20
  profile.wins = 10
  profile.upgrades = { power: 3, vitality: 3 }
  profile.unlockedCosmetics.push('knight-gilded', 'ranger-moonlit', 'wizard-astral')
  profile.achievements = LEGACY_ACHIEVEMENTS.map(item => item.id)
  profile.discoveredAbilities = [...UP.map(item => item.id), ...EVOLUTIONS.map(item => item.id)]
  profile.heroesPlayed = ['knight', 'ranger', 'wizard']
  for (const mob of ['slime', 'bat', 'goblin', 'golem', 'warlock', 'boss'] as const) {
    profile.discoveredMonsters[mob] = 1
  }
  return memoryStorage([[SAVE_KEY, JSON.stringify(profile)]])
}
