import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tickSkills } from './skills'
import { seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameHooks, GameState, Hero, Mob } from './types'

const spyHooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks
const mob = (x: number, y: number, over: Partial<Mob> = {}): Mob => ({
  x, y, type: 'golem', hp: 1000, max: 1000, r: 30, speed: 0, dmg: 11,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ...over,
})

function setup(): { s: GameState; hero: Hero } {
  const s = createState()
  const hero = createHero('knight')
  s.hero = hero
  s.mode = 'play'
  return { s, hero }
}

beforeEach(() => setRandom(seeded(9)))
afterEach(() => setRandom())

describe('tickSkills', () => {
  it('does nothing without skills', () => {
    const { s } = setup()
    const hooks = spyHooks()
    s.mobs.push(mob(10, 0))
    tickSkills(s, 0.016, hooks)
    expect(s.mobs[0]!.hp).toBe(1000)
    expect(hooks.sfx).not.toHaveBeenCalled()
  })
  it('frost slows and hits mobs in range, then waits for its cooldown', () => {
    const { s, hero } = setup()
    hero.skills.frost = 1
    const near = mob(150, 0)
    const far = mob(200, 0)
    s.mobs.push(near, far)
    const hooks = spyHooks()
    tickSkills(s, 0.016, hooks)
    expect(near.hp).toBeCloseTo(1000 - 32 * 0.72)
    expect(near.slow).toBeCloseTo(1.16)
    expect(far.hp).toBe(1000)
    expect(far.slow).toBe(0)
    expect(hero.frostCd).toBeCloseTo(4.92)
    expect(s.fx.filter((f) => f.type === 'ice')).toHaveLength(20)
    expect(hooks.sfx).toHaveBeenCalledWith('frost')
    tickSkills(s, 0.016, hooks)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
  })
  it('bolt strikes up to 2+level mobs within 450', () => {
    const { s, hero } = setup()
    hero.skills.bolt = 1
    const mobs = [mob(100, 0), mob(200, 0), mob(300, 0), mob(400, 0)]
    s.mobs.push(...mobs)
    const hooks = spyHooks()
    tickSkills(s, 0.016, hooks)
    expect(mobs.map((m) => m.hp)).toEqual([1000 - 44.8, 1000 - 44.8, 1000 - 44.8, 1000])
    expect(hero.bolt).toBeCloseTo(1.82)
    expect(hooks.sfx).toHaveBeenCalledWith('bolt')
  })
  it('meteor and vortex play their cues; vortex pulls mobs in', () => {
    const { s, hero } = setup()
    hero.skills.meteor = 1
    hero.skills.vortex = 1
    const m = mob(100, 0)
    s.mobs.push(m)
    const hooks = spyHooks()
    tickSkills(s, 0.016, hooks)
    expect(hooks.sfx.mock.calls).toEqual([['meteor'], ['vortex']])
    expect(hero.meteorCd).toBeCloseTo(5.54)
    expect(hero.vortexCd).toBeCloseTo(7.4)
    expect(m.x).toBeLessThan(100)
  })
  it('higher-level bolt reaches seven enemies while respecting its upper range', () => {
    const { s, hero } = setup()
    hero.skills.bolt = 5
    const targets = Array.from({ length: 7 }, (_, i) => mob(100 + i * 50, 0))
    const outOfRange = mob(510, 0)
    s.mobs.push(...targets, outOfRange)
    tickSkills(s, 0.016, spyHooks())
    expect(targets.every(e => e.hp < e.max)).toBe(true)
    expect(outOfRange.hp).toBe(outOfRange.max)
  })
  it('high-rank frost and blaze gain moderate extra AoE reach', () => {
    const frost = setup()
    frost.hero.skills.frost = 5
    const frostEdge = mob(248, 0)
    const frostOutside = mob(280, 0)
    frost.s.mobs.push(frostEdge, frostOutside)
    tickSkills(frost.s, 0.016, spyHooks())
    expect(frostEdge.hp).toBeLessThan(frostEdge.max)
    expect(frostOutside.hp).toBe(frostOutside.max)

    const blaze = setup()
    blaze.hero.skills.blaze = 3
    const blazeEdge = mob(141, 0)
    const blazeOutside = mob(175, 0)
    blaze.s.mobs.push(blazeEdge, blazeOutside)
    tickSkills(blaze.s, 0.016, spyHooks())
    expect(blazeEdge.hp).toBeLessThan(blazeEdge.max)
    expect(blazeOutside.hp).toBe(blazeOutside.max)
  })
  it('orb blades hit a mob on the ring and set its hit cooldown', () => {
    const { s, hero } = setup()
    hero.skills.orb = 1
    const m = mob(71, 0, { r: 20 })
    s.mobs.push(m)
    tickSkills(s, 0.016, spyHooks())
    expect(m.hp).toBeCloseTo(1000 - (12 + 32 * 0.28))
    expect(m.hit).toBe(0.28)
  })
})
