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
    expect(near.hp).toBeCloseTo(1000 - 32 * 0.67)
    expect(near.slow).toBeCloseTo(1.06)
    expect(far.hp).toBe(1000)
    expect(far.slow).toBe(0)
    expect(hero.frostCd).toBeCloseTo(4.95)
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
    expect(mobs.map((m) => m.hp)).toEqual([1000 - 41.6, 1000 - 41.6, 1000 - 41.6, 1000])
    expect(hero.bolt).toBeCloseTo(1.84)
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
    expect(hero.meteorCd).toBeCloseTo(5.58)
    expect(hero.vortexCd).toBeCloseTo(7.45)
    expect(m.x).toBeLessThan(100)
  })
  it('orb blades hit a mob on the ring and set its hit cooldown', () => {
    const { s, hero } = setup()
    hero.skills.orb = 1
    const m = mob(71, 0, { r: 20 })
    s.mobs.push(m)
    tickSkills(s, 0.016, spyHooks())
    expect(m.hp).toBeCloseTo(1000 - (10 + 32 * 0.25))
    expect(m.hit).toBe(0.28)
  })
})
