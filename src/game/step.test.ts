import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { step } from './step'
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
  it('ends the run as a victory at DURATION', () => {
    const { s } = setup()
    s.time = DURATION - 0.01
    s.bossSpawned = true
    s.bossDefeated = true
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
  it('mobs walk toward the hero and deal contact damage', () => {
    const { s, hero } = setup()
    const far = mob(100, 0, { speed: 77 })
    const touching = mob(0, 20)
    s.mobs.push(far, touching)
    const hooks = spyHooks()
    step(s, 0.1, still, hooks)
    expect(far.x).toBeCloseTo(92.3)
    expect(hero.hp).toBe(175 - 11)
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
    expect(hero.hp).toBeCloseTo(100.18)
    expect(s.numberFx).toHaveLength(0)
    expect(s.swipes).toHaveLength(1)
    expect(s.cam.x).toBeCloseTo(90)
  })
})
