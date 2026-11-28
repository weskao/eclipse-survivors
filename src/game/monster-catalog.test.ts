import { describe, expect, it } from 'vitest'
import { runMonsterKills, MONSTER_IDS } from './monster-catalog'
import { createMetaState } from './content/meta/state'
import { applyCompletedRun } from './content/meta/progression'
import { emptyProfile, migrateProfile } from '../meta/profile'
describe('exact monster discovery accounting', () => {
  it('does not assign named boss kills to the original boss and persists individual counts only once', () => {
    const kills = runMonsterKills({ slime: 3, boss: 2 }, { 'shadow-assassin': 4 }, { 'abyss-monarch': 2 })
    expect(kills).toEqual({ slime: 3, boss: 0, 'shadow-assassin': 4, 'abyss-monarch': 2 })
    const stats = { id: 'archive-run', mode: 'quick' as const, hero: 'knight' as const, victory: false, seconds: 30, kills: 9, level: 1, damageDealt: 10, damageTaken: 1, remainingHp: 0, bossDefeated: true, enemies: { slime: 3, boss: 2 }, monsterKills: kills, abilities: [] }
    const first = applyCompletedRun(createMetaState(), { stats })
    expect(first.accepted).toBe(true)
    expect(first.state.monsterKills).toMatchObject({ slime: 3, 'shadow-assassin': 4, 'abyss-monarch': 2 })
    expect(first.state.monsterKills?.boss ?? 0).toBe(0)
    expect(first.state.discoveries.bosses).toEqual(['bosses:abyss-monarch'])
    expect(applyCompletedRun(first.state, { stats }).accepted).toBe(false)
    expect(migrateProfile({ ...emptyProfile(), discoveredMonsters: kills })?.discoveredMonsters).toEqual(kills)
    expect(new Set(MONSTER_IDS).size).toBe(MONSTER_IDS.length)
  })
})
