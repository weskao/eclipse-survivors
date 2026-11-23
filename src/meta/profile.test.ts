import { beforeEach, describe, expect, it } from 'vitest'
import { BALANCE } from '../game/config'
import { createProfileStore, migrateProfile, SAVE_KEY } from './profile'
import type { RunStats } from './types'

const run = (id = 'run-1', overrides: Partial<RunStats> = {}): RunStats => ({
  id, mode: 'quick', hero: 'knight', victory: true, seconds: 151,
  kills: 105, level: 8, damageDealt: 1234, damageTaken: 120, remainingHp: 45,
  bossDefeated: true, enemies: { slime: 30, bat: 25, goblin: 25, golem: 24, boss: 1 },
  abilities: ['frost', 'orb'], ...overrides,
})
beforeEach(() => localStorage.clear())

describe('permanent upgrade balance compatibility', () => {
  it('allows six legacy purchase tiers, prevents exceeding the cap and restores them', () => {
    const store = createProfileStore(localStorage)
    for (let i = 0; i < 10; i++)
      store.recordRun(run('farm-' + i, { seconds: 800, kills: 600 }))
    expect(store.get().embers).toBeGreaterThan(1000)
    for (let n = 0; n < BALANCE.meta.research.power.maxRank; n++) expect(store.buyUpgrade('power')).toBe(true)
    expect(store.get().upgrades.power).toBe(BALANCE.meta.research.power.maxRank)
    expect(store.buyUpgrade('power')).toBe(false)
    expect(createProfileStore(localStorage).get().upgrades.power).toBe(BALANCE.meta.research.power.maxRank)
  })
})

describe('versioned local progress', () => {
  it('saves, loads and maintains personal best per mode', () => {
    const first = createProfileStore(localStorage)
    first.recordRun(run())
    const second = createProfileStore(localStorage)
    expect(second.get().runs).toBe(1)
    expect(second.get().best.quick?.kills).toBe(105)
    second.recordRun(run('run-2', { kills: 30, seconds: 140, victory: false }))
    expect(second.get().best.quick?.kills).toBe(105)
    expect(second.get().runs).toBe(2)
  })
  it('handles malformed and unsupported future saves without crashing', () => {
    localStorage.setItem(SAVE_KEY, '{')
    expect(createProfileStore(localStorage).get().runs).toBe(0)
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 999, runs: 100 }))
    expect(createProfileStore(localStorage).get().runs).toBe(0)
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, runs: -42 }))
    expect(createProfileStore(localStorage).get().runs).toBe(0)
  })
  it('migrates version 1 and preserves the earlier best time', () => {
    const p = migrateProfile({ version: 1, bestSeconds: 147, victories: 2 })
    expect(p?.version).toBe(2)
    expect(p?.wins).toBe(2)
    expect(p?.best.quick?.seconds).toBe(147)
  })
  it('does not reward the same run or achievement twice', () => {
    const store = createProfileStore(localStorage)
    const first = store.recordRun(run())
    const embers = store.get().embers
    expect(first.newAchievements).toContain('first-victory')
    expect(store.recordRun(run()).newAchievements).toEqual([])
    expect(store.get().embers).toBe(embers)
    expect(store.get().runs).toBe(1)
    store.recordRun(run('run-2'))
    expect(store.get().achievements.filter(id => id === 'first-victory')).toHaveLength(1)
  })
  it('unlocks cosmetics, discovers monsters and abilities, supports permanent upgrades', () => {
    const store = createProfileStore(localStorage)
    store.recordRun(run())
    expect(store.get().discoveredMonsters.boss).toBe(1)
    expect(store.get().discoveredAbilities).toContain('orb')
    expect(store.get().unlockedCosmetics).toContain('knight-gilded')
    expect(store.selectCosmetic('knight', 'knight-gilded')).toBe(true)
    expect(store.buyUpgrade('power')).toBe(true)
    expect(store.get().upgrades.power).toBe(1)
    expect(store.get().equippedCosmetics.knight).toBe('knight-gilded')
  })
  it('falls back to an in-memory profile when storage throws', () => {
    const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
    const store = createProfileStore(broken)
    store.recordRun(run('blocked-1'))
    expect(store.get().runs).toBe(1)
    store.reset()
    expect(store.get().runs).toBe(0)
  })
  it('reset clears all earned records and unlocks, even after reload', () => {
    const store = createProfileStore(localStorage)
    store.recordRun(run())
    store.reset()
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
    expect(createProfileStore(localStorage).get().runs).toBe(0)
    expect(store.get().achievements).toEqual([])
  })
})
