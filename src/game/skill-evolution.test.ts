import { describe, expect, it, vi } from 'vitest'
import { EVOLUTIONS, eligibleEvolutions, tickEvolutions } from './evolutions'
import { MAX_LEVEL, UP } from './constants'
import { applyUpgrade, pickUpgrades } from './progression'
import { createHero, createState } from './state'
import { seeded } from './math'
import type { GameHooks, Mob } from './types'

const hooks = (): GameHooks => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() })
const setup = () => {
  const s = createState()
  s.hero = createHero('wizard')
  s.mode = 'play'
  s.levelQueue = 10
  return s
}
const mob = (x: number, y: number): Mob => ({ x, y, type: 'golem', hp: 1200, max: 1200, r: 24, speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 })

describe('weighted skill progression', () => {
  it('keeps the existing fifteen skills with explicit levels and rarity', () => {
    expect(UP).toHaveLength(15)
    expect(new Set(UP.map(u => u.id)).size).toBe(15)
    expect(UP.every(u => u.maxLevel && u.maxLevel > 0 && u.rarity)).toBe(true)
    expect(EVOLUTIONS).toHaveLength(5)
    expect(EVOLUTIONS.every(e => e.rarity === 'legendary')).toBe(true)
  })
  it('uses reproducible weighted sampling without replacement', () => {
    const first = pickUpgrades(createHero('knight'), seeded(103)).map(u => u.id)
    expect(pickUpgrades(createHero('knight'), seeded(103)).map(u => u.id)).toEqual(first)
    expect(new Set(first).size).toBe(first.length)
    let common = 0, rare = 0
    const rng = seeded(17)
    for (let i = 0; i < 500; i++) {
      for (const u of pickUpgrades(createHero('knight'), rng)) {
        if (u.rarity === 'common') common++
        if (u.rarity === 'rare') rare++
      }
    }
    expect(common).toBeGreaterThan(rare)
  })
  it('excludes capped skills and returns no duplicates or invalid options', () => {
    const hero = createHero('knight')
    for (const up of UP) hero.skills[up.id] = MAX_LEVEL[up.id]
    expect(pickUpgrades(hero, seeded(1))).toEqual([])
    hero.skills.frost = 1
    const choices = pickUpgrades(hero, seeded(3))
    expect(choices.map(u => u.id)).toEqual(['frost'])
  })
  it('rejects invalid or capped upgrades without altering queue or stats', () => {
    const s = setup(), h = hooks(), hero = s.hero!
    expect(applyUpgrade(s, 'frozen-thunderstorm', h)).toBe(false)
    expect(s.levelQueue).toBe(10)
    hero.skills.speed = MAX_LEVEL.speed
    const initial = hero.speed
    expect(applyUpgrade(s, 'speed', h)).toBe(false)
    expect(hero.speed).toBe(initial)
    expect(s.levelQueue).toBe(10)
  })
})

describe('five recipe-based evolutions', () => {
  it('requires both prerequisite skills at level 3 and never reoffers an owned evolution', () => {
    const recipes = [
      ['frozen-thunderstorm', 'frost', 'chain'],
      ['infernal-singularity', 'blaze', 'vortex'],
      ['apocalypse-rain', 'meteor', 'blaze'],
      ['blade-tempest', 'orb', 'haste'],
      ['guardian-sanctuary', 'shield', 'heal'],
    ] as const
    for (const [id, first, second] of recipes) {
      const hero = createHero('wizard')
      hero.skills[first] = 3
      expect(eligibleEvolutions(hero).some(e => e.id === id)).toBe(false)
      hero.skills[second] = 2
      expect(eligibleEvolutions(hero).some(e => e.id === id)).toBe(false)
      hero.skills[second] = 3
      expect(eligibleEvolutions(hero).some(e => e.id === id)).toBe(true)
      const s = setup()
      s.hero = hero
      expect(pickUpgrades(hero, seeded(1)).some(e => e.id === id)).toBe(true)
      expect(applyUpgrade(s, id, hooks())).toBe(true)
      expect(hero.evolutions[id]).toBe(true)
      expect(eligibleEvolutions(hero).some(e => e.id === id)).toBe(false)
      expect(hero.skills[first]).toBe(3)
      expect(hero.skills[second]).toBe(3)
    }
  })
  it('evolved attacks deal damage and respect cooldowns', () => {
    for (const [id, first, second] of [
      ['frozen-thunderstorm', 'frost', 'chain'],
      ['infernal-singularity', 'blaze', 'vortex'],
      ['apocalypse-rain', 'meteor', 'blaze'],
      ['blade-tempest', 'orb', 'haste'],
    ] as const) {
      const s = setup()
      s.hero!.skills[first] = 3
      s.hero!.skills[second] = 3
      applyUpgrade(s, id, hooks())
      const target = mob(50, 0)
      s.mobs = [target]
      tickEvolutions(s, hooks())
      expect(target.hp, id).toBeLessThan(1200)
      const after = target.hp
      tickEvolutions(s, hooks())
      expect(target.hp, id).toBe(after)
      expect(s.hero!.evolutionCd[id]).toBeGreaterThan(0)
    }
  })
  it('guardian sanctuary heals, protects, and never exceeds max health', () => {
    const s = setup()
    s.hero!.skills.shield = 3
    s.hero!.skills.heal = 3
    s.hero!.hp = 30
    applyUpgrade(s, 'guardian-sanctuary', hooks())
    tickEvolutions(s, hooks())
    expect(s.hero!.hp).toBeGreaterThan(30)
    expect(s.hero!.inv).toBeGreaterThan(0)
    const hp = s.hero!.hp
    tickEvolutions(s, hooks())
    expect(s.hero!.hp).toBe(hp)
  })
})
