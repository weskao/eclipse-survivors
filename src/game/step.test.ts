import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { step } from './step'
import { hit } from './combat'
import { DURATION } from './constants'
import { seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameHooks, GameState, Hero, Mob } from './types'

const spyHooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks
const still = { x: 0, y: 0 }
const mob = (x: number, y: number, over: Partial<Mob> = {}): Mob => ({
  x, y, type: 'slime', hp: 100, max: 100, r: 18, speed: 0, dmg: 11,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ...over,
})

function setup(): { s: GameState; hero: Hero } {
  const s = createState()
  const hero = createHero('knight')
  s.hero = hero
  s.mode = 'play'
  s.W = 800
  s.H = 600
  s.spawnT = 999
  hero.attack = 999
  return { s, hero }
}

beforeEach(() => setRandom(seeded(11)))
afterEach(() => setRandom())

describe('step', () => {
  it('advances clocks and timers', () => {
    const { s, hero } = setup()
    step(s, 0.1, still, spyHooks())
    expect(s.time).toBeCloseTo(0.1)
    expect(s.worldClock).toBeCloseTo(0.1)
    expect(s.sceneFxClock).toBeCloseTo(0.1)
    expect(s.spawnT).toBeCloseTo(998.9)
    expect(hero.dashCd).toBeCloseTo(-0.1)
  })
  it('changes scene at 36s with sfx scene', () => {
    const { s } = setup()
    s.time = 35.99
    const hooks = spyHooks()
    step(s, 0.02, still, hooks)
    expect(s.currentScene).toBe(1)
    expect(hooks.sfx).toHaveBeenCalledWith('scene')
  })
  it('ends the run at DURATION after the boss was defeated', () => {
    const { s } = setup()
    s.time = DURATION - 0.01
    s.bossDefeated = true
    s.bossSpawned = true
    const hooks = spyHooks()
    step(s, 0.005, still, hooks)
    expect(hooks.end).not.toHaveBeenCalled()
    step(s, 0.005, still, hooks)
    expect(hooks.end).toHaveBeenCalledWith(true)
  })
  it('picks up a nearby star: sfx pickup + xp', () => {
    const { s, hero } = setup()
    s.stars.push({ x: 10, y: 0, value: 3, t: 0 })
    const hooks = spyHooks()
    step(s, 0.016, still, hooks)
    expect(hero.xp).toBe(3)
    expect(s.stars).toHaveLength(0)
    expect(hooks.sfx).toHaveBeenCalledWith('pickup')
  })
  it('magnet pulls distant stars toward the hero', () => {
    const { s } = setup()
    s.stars.push({ x: 100, y: 0, value: 3, t: 0 })
    step(s, 0.1, still, spyHooks())
    expect(s.stars[0]!.x).toBeCloseTo(55)
  })
  it('high-rank magnet attracts XP at a modestly extended radius', () => {
    const { s, hero } = setup()
    hero.skills.magnet = 4
    s.stars.push({ x: 350, y: 0, value: 3, t: 0 })
    step(s, 0.1, still, spyHooks())
    expect(s.stars[0]!.x).toBeCloseTo(305)
  })
  it('mobs approach and warn before a contact strike', () => {
    const { s, hero } = setup()
    const far = mob(100, 0, { speed: 77 })
    const touching = mob(0, 20)
    s.mobs.push(far, touching)
    const hooks = spyHooks()
    step(s, 0.1, still, hooks)
    expect(far.x).toBeLessThan(100)
    expect(touching.ai?.state).toBe('windup')
    expect(hero.hp).toBe(hero.max)
    step(s, 0.5, still, hooks)
    expect(touching.ai?.state).toBe('attack')
    step(s, 0.1, still, hooks)
    expect(hero.hp).toBe(hero.max - 11)
    expect(hooks.sfx).toHaveBeenCalledWith('hurt')
  })
  it('auto-attacks when the attack timer runs out', () => {
    const { s, hero } = setup()
    hero.attack = 0
    s.mobs.push(mob(50, 0))
    const hooks = spyHooks()
    step(s, 0.016, still, hooks)
    expect(s.mobs[0]!.hp).toBe(68)
    expect(hero.attack).toBe(0.57)
    expect(hooks.sfx).toHaveBeenCalledWith('knight')
  })
  it('moves shots, hits mobs and removes dead mobs and spent shots', () => {
    const { s } = setup()
    s.mobs.push(mob(60, 0, { hp: 10 }))
    s.shots.push({ x: 0, y: 0, vx: 540, vy: 0, life: 1.2, d: 22, kind: 'arrow', r: 5 })
    const hooks = spyHooks()
    step(s, 0.1, still, hooks)
    expect(s.shots).toHaveLength(0)
    expect(s.mobs).toHaveLength(0)
    expect(s.kill).toBe(1)
    expect(hooks.sfx).toHaveBeenCalledWith('kill')
  })
  it('ages and drops effects, regenerates with heal, eases the camera', () => {
    const { s, hero } = setup()
    hero.skills.heal = 2
    hero.hp = 100
    hero.x = 100
    s.numberFx.push({ x: 0, y: 0, life: 0.05, value: 1, boss: false })
    s.swipes.push({ x: 0, y: 0, a: 0, life: 0.2, max: 0.29, r: 70 })
    step(s, 0.1, still, spyHooks())
    expect(hero.hp).toBeCloseTo(100.21)
    expect(s.numberFx).toHaveLength(0)
    expect(s.swipes).toHaveLength(1)
    expect(s.cam.x).toBeCloseTo(90)
  })
})

describe('simulation correctness regressions', () => {
  it('does not award victory at the deadline with the required boss alive', () => {
    const { s } = setup()
    s.time = DURATION - 0.02
    s.bossSpawned = true
    s.mobs.push(mob(300, 0, { type: 'boss', hp: 1000 }))
    const hooks = spyHooks()
    step(s, 0.03, still, hooks)
    expect(hooks.end).not.toHaveBeenCalled()
    hit(s, s.mobs[0]!, 1000, hooks)
    step(s, 0.016, still, hooks)
    expect(hooks.end).toHaveBeenCalledOnce()
    expect(hooks.end).toHaveBeenCalledWith(true)
  })
  it('ignores corpses for contact damage and never rewards them twice', () => {
    const { s, hero } = setup()
    const dead = mob(0, 10, { hp: 5, dmg: 100 })
    s.mobs.push(dead)
    const hooks = spyHooks()
    hit(s, dead, 20, hooks)
    step(s, 0.016, still, hooks)
    expect(hero.hp).toBe(hero.max)
    expect(s.kill).toBe(1)
    expect(s.mobs).toHaveLength(0)
  })
  it('detects projectiles crossing multiple targets and hits the earliest one', () => {
    const { s } = setup()
    const near = mob(45, 0)
    const far = mob(95, 0)
    s.mobs.push(far, near)
    s.shots.push({ x: 0, y: 0, vx: 540, vy: 0, life: 1.2, d: 22, kind: 'arrow', r: 5 })
    step(s, 0.2, still, spyHooks())
    expect(near.hp).toBe(78)
    expect(far.hp).toBe(100)
    expect(s.shots).toHaveLength(0)
  })
  it('moves a recently hit mob outward while staggered', () => {
    const { s } = setup()
    const enemy = mob(100, 0, { speed: 0 })
    s.mobs.push(enemy)
    hit(s, enemy, 10, spyHooks())
    step(s, 0.05, still, spyHooks())
    expect(enemy.x).toBeGreaterThan(102)
  })
  it('keeps the required boss after the usual far-mob despawn radius', () => {
    const { s } = setup()
    s.bossSpawned = true
    s.mobs.push(mob(2000, 0, { type: 'boss' }), mob(2000, 10))
    step(s, 0.016, still, spyHooks())
    expect(s.mobs.map(e => e.type)).toEqual(['boss'])
  })
  it('never converts a lethal contact hit into a victory on the same tick', () => {
    const { s, hero } = setup()
    hero.hp = 1
    s.time = DURATION - 0.01
    s.bossDefeated = true
    s.bossSpawned = true
    s.mobs.push(mob(0, 10, { dmg: 100, ai: { state: 'attack', timer: 0.1, attack: 'pounce', aimX: 0, aimY: 0, dirX: 0, dirY: 0, cycle: 0 } }))
    const hooks = spyHooks()
    step(s, 0.02, still, hooks)
    expect(hooks.end).toHaveBeenCalledTimes(1)
    expect(hooks.end).toHaveBeenCalledWith(false)
  })
})

describe('projectile collision precision', () => {
  it('strikes the first hitbox surface rather than the nearest center', () => {
    const { s } = setup()
    const small = mob(65, 0)
    const boss = mob(88, 0, { type: 'boss', r: 48 })
    s.mobs.push(small, boss)
    s.shots.push({ x: 0, y: 0, vx: 540, vy: 0, life: 1, d: 22, kind: 'arrow', r: 5 })
    step(s, 0.2, still, spyHooks())
    expect(boss.hp).toBe(78)
    expect(small.hp).toBe(100)
  })
  it('hits an overlapping target even when the projectile has zero velocity', () => {
    const { s } = setup()
    const target = mob(60, 0)
    s.mobs.push(target)
    s.shots.push({ x: 60, y: 0, vx: 0, vy: 0, life: 1, d: 22, kind: 'magic', r: 9 })
    step(s, 0.016, still, spyHooks())
    expect(target.hp).toBe(78)
  })
  it('can hit during the final fraction of a projectile lifetime', () => {
    const { s } = setup()
    const target = mob(40, 0)
    s.mobs.push(target)
    s.shots.push({ x: 0, y: 0, vx: 540, vy: 0, life: 0.05, d: 22, kind: 'arrow', r: 5 })
    step(s, 0.2, still, spyHooks())
    expect(target.hp).toBe(78)
  })
})

describe('ES3 reward feedback', () => {
  it('aggregates same-tick pickup audio without losing individual XP or pickup receipts', () => {
    const { s, hero } = setup()
    const content = vi.fn()
    const hooks = { ...spyHooks(), content }
    s.stars.push({ x: 10, y: 0, value: 2, t: 0 }, { x: 0, y: 10, value: 3, t: 0 }, { x: -10, y: 0, value: 4, t: 0 })
    step(s, 0.016, still, hooks)
    expect(hero.xp).toBe(9)
    expect(s.stars).toHaveLength(0)
    expect(content.mock.calls.filter(([, event]) => event.type === 'pickup').map(([, event]) => event.amount)).toEqual([2, 3, 4])
    expect(hooks.sfx.mock.calls.filter(([name]) => name === 'pickup')).toHaveLength(1)
  })
})
