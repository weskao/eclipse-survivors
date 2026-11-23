import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from './config'
import { JOB, MAX_LEVEL, MAX_MOBS, BOSS_TIME, DURATION } from './constants'
import { HERO_DEFINITIONS } from './content/heroes'
import { WEAPON_SPECS } from './content/weapons/abilities'
import { rollEventKind } from './events'
import { createHero, createState } from './state'
import { addXp } from './progression'
import { spawnInterval, spawnMob } from './spawn'

const hooks = { sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }

describe('single-source numerical game balance', () => {
  it('keeps all six hero starting stats in one typed configuration', () => {
    for (const id of ['knight', 'ranger', 'wizard'] as const) {
      const expected = BALANCE.heroes.classic[id]
      expect(createHero(id)).toMatchObject({
        hp: expected.hp, max: expected.hp, damage: expected.damage,
        speed: expected.speed, delay: expected.delay, range: expected.range,
      })
      expect(JOB[id]).toMatchObject(expected)
    }
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const)
      expect(HERO_DEFINITIONS[id].stats).toEqual(BALANCE.heroes.special[id])
  })

  it('centralizes XP thresholds, rarity weights and the full upgrade level caps', () => {
    expect(createHero('knight').need).toBe(BALANCE.progression.initialXp)
    const state = createState()
    state.hero = createHero('knight')
    state.mode = 'play'
    addXp(state, state.hero.need, hooks)
    expect(state.hero.need).toBe(Math.round(BALANCE.progression.initialXp
      * BALANCE.progression.growthMultiplier + BALANCE.progression.growthFlat))
    expect(MAX_LEVEL).toEqual(BALANCE.skills.maxLevels)
    expect(Object.values(BALANCE.progression.rarityWeights).every(weight => weight > 0)).toBe(true)
  })

  it('keeps chest and shrine rolls normalized and based on their configured weights', () => {
    const weights = BALANCE.events.weights
    expect(Object.values(weights).reduce((sum, n) => sum + n, 0)).toBeCloseTo(1, 9)
    expect(rollEventKind(() => 0)).toBe('chest')
    expect(rollEventKind(() => weights.chest + 0.001)).toBe('shrine')
    expect(rollEventKind(() => 0.99999)).toBe('challenge')
  })

  it('shares world, enemy and weapon balancing without changing collision contracts', () => {
    expect(MAX_MOBS).toBe(BALANCE.world.maxMobs)
    expect(BOSS_TIME).toBe(BALANCE.world.bossTime)
    expect(DURATION).toBe(BALANCE.world.duration)
    expect(spawnInterval(0, 0)).toBe(BALANCE.enemies.intervalBase)
    expect(WEAPON_SPECS).toHaveLength(Object.keys(BALANCE.weapons.intervals).length)
    for (const spec of WEAPON_SPECS)
      expect(spec.interval).toBe(BALANCE.weapons.intervals[spec.key])
    const state = createState()
    state.hero = createHero('knight')
    state.W = 800
    state.H = 600
    spawnMob(state, 'boss')
    expect(state.mobs[0]!.max).toBe(BALANCE.enemies.baseHp.boss)
  })
})
