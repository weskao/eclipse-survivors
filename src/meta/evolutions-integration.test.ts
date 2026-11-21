import { describe, expect, it } from 'vitest'
import { createProfileStore } from './profile'
import { encyclopedia } from './compendium'
import type { RunStats } from './types'

describe('legendary evolution and new enemy discovery', () => {
  it('retains evolved abilities and ranged enemies in the persistent encyclopedia', () => {
    const store = createProfileStore(null)
    const run: RunStats = {
      id: 'v1-legendary-1', mode: 'quick', hero: 'wizard', victory: true,
      seconds: 160, kills: 1, level: 14, remainingHp: 80,
      damageDealt: 500, damageTaken: 20, bossDefeated: true,
      enemies: { warlock: 1 }, abilities: ['frost', 'chain', 'frozen-thunderstorm'],
    }
    store.recordRun(run)
    const saved = store.get()
    expect(saved.discoveredAbilities).toContain('frozen-thunderstorm')
    expect(saved.discoveredMonsters.warlock).toBe(1)
    const entries = encyclopedia(saved)
    expect(entries.abilities.find(a => a.id === 'frozen-thunderstorm')?.discovered).toBe(true)
    expect(entries.monsters.find(m => m.id === 'warlock')?.count).toBe(1)
  })
})
