import { describe, expect, it } from 'vitest'
import { createProfileStore } from '../../../meta/profile'
import { createMetaProgressionStore } from './store'
import { ACHIEVEMENTS, MILESTONES, RESEARCH, STARTING_BONUSES, STARTING_EQUIPMENT } from './catalog'
import { validateMetaState } from './state'
import { createUnlockedPlaytestMetaStorage, createUnlockedPlaytestProfileStorage } from './dev-unlocked'

describe('development-only unlocked playtest storage', () => {
  it('starts with all permanent research, equipment, bonuses, and achievements available', () => {
    const store = createMetaProgressionStore(createUnlockedPlaytestMetaStorage())
    const current = store.get()
    expect(current.status).toBe('ready')
    expect(current.state).not.toBeNull()
    const state = current.state!
    expect(validateMetaState(state)).toBe(true)
    expect(RESEARCH.every(item => state.research[item.id] === item.maxRank)).toBe(true)
    expect(STARTING_EQUIPMENT.every(item => state.equipment.includes(item.id))).toBe(true)
    expect(STARTING_BONUSES.every(item => state.bonuses.includes(item.id))).toBe(true)
    expect(ACHIEVEMENTS.every(item => state.achievements.includes(item.id))).toBe(true)
    expect(MILESTONES.every(item => state.claimedMilestones.includes(item.id))).toBe(true)
    expect(state.embers).toBeGreaterThan(0)
  })

  it('unlocks legacy skins and encyclopedia content without persistent browser storage', () => {
    const store = createProfileStore(createUnlockedPlaytestProfileStorage())
    const profile = store.get()
    expect(profile.upgrades).toEqual({ power: 3, vitality: 3 })
    expect(profile.unlockedCosmetics).toContain('wizard-astral')
    expect(profile.discoveredAbilities).toContain('frost')
    expect(profile.discoveredMonsters.boss).toBeGreaterThan(0)
    store.reset()
    expect(createProfileStore(createUnlockedPlaytestProfileStorage()).get().upgrades.power).toBe(3)
  })

  it('gives each playtest store an isolated in-memory save', () => {
    const first = createMetaProgressionStore(createUnlockedPlaytestMetaStorage())
    expect(first.reset().ok).toBe(true)
    expect(first.get().state?.research.power).toBe(0)
    const second = createMetaProgressionStore(createUnlockedPlaytestMetaStorage())
    expect(second.get().state?.research.power).toBe(RESEARCH.find(item => item.id === 'power')!.maxRank)
  })
})
