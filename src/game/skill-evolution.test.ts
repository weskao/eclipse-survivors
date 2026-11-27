import { describe, expect, it, vi } from 'vitest'
import { EVOLUTIONS, eligibleEvolutions, tickEvolutions } from './evolutions'
import { MAX_LEVEL, UP } from './constants'
import { applyUpgrade, pickUpgrades } from './progression'
import { createHero, createState } from './state'
import { seeded } from './math'
import { tickSkills } from './skills'
import { installHallRun } from './content/meta/hall-runtime'
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
    for (const evolution of EVOLUTIONS) hero.evolutions[evolution.id] = true
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
  it('blade tempest increases real orbit blade collisions, not just decorative blade count', () => {
    const normal = setup()
    normal.hero!.skills.orb = 3
    normal.mobs = [mob(36, 62)]
    tickSkills(normal, 0.016, hooks())
    expect(normal.mobs[0]!.hp).toBe(1200)

    const evolved = setup()
    evolved.hero!.skills.orb = 3
    evolved.hero!.skills.haste = 3
    evolved.hero!.evolutions['blade-tempest'] = true
    evolved.hero!.evolutionCd['blade-tempest'] = 10
    evolved.mobs = [mob(36, 62)]
    tickSkills(evolved, 0.016, hooks())
    expect(evolved.mobs[0]!.hp).toBeLessThan(1200)
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

describe('ES4 legacy evolution integration', () => {
  it.each(['frozen-thunderstorm','infernal-singularity','apocalypse-rain','blade-tempest'] as const)('counts one eligible %s cast, not each target, for Double Sigil', id => {
    const s=setup()
    s.heroId='wizard'
    installHallRun(s,{hero:'wizard',ranks:{'wizard-double-sigil':1}})
    s.hero!.evolutions[id]=true
    for(let i=0;i<5;i++){
      s.hero!.evolutionCd[id]=0
      s.mobs=[mob(30,0),mob(60,0)]
      tickEvolutions(s,hooks())
      expect(s.hall!.sigilCasts).toBe(i+1)
    }
    s.hero!.evolutionCd[id]=0
    s.mobs=[mob(30,0),mob(60,0)]
    tickEvolutions(s,hooks())
    expect(s.hall!.sigilCasts).toBe(0)
    expect(s.hall!.sigilReady).toBe(false)
    expect(s.hall!.sigilAt).toBeGreaterThan(s.time)
  })
  it('does not count empty or unreachable area casts or guardian healing as offensive casts', () => {
    const s=setup()
    s.heroId='wizard'
    installHallRun(s,{hero:'wizard',ranks:{'wizard-double-sigil':1}})
    s.hero!.evolutions['blade-tempest']=true
    s.hero!.evolutions['guardian-sanctuary']=true
    s.mobs=[mob(1000,0)]
    tickEvolutions(s,hooks())
    expect(s.hall!.sigilCasts).toBe(0)
    s.hero!.evolutionCd['blade-tempest']=0
    s.mobs=[]
    tickEvolutions(s,hooks())
    expect(s.hall!.sigilCasts).toBe(0)
  })
  it('allows Star Collapse on a real legacy area hit', () => {
    const s=setup()
    s.heroId='wizard'
    installHallRun(s,{hero:'wizard',ranks:{'wizard-star-collapse':1}})
    s.hero!.evolutions['blade-tempest']=true
    s.time=12
    s.mobs=[mob(30,0),mob(60,0)]
    tickEvolutions(s,hooks())
    expect(s.hall!.starAt).toBeGreaterThan(s.time)
    expect(s.hall!.procAt).toBeGreaterThan(s.time)
  })
})
