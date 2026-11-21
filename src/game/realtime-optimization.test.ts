import { describe, expect, it, vi } from 'vitest'
import { nearbyHazards } from './world'
import { createHero, createState } from './state'
import { tickSkills } from './skills'
import { tickEnemies } from './enemies/ai'
import { nearestAlive } from './combat'
import { step } from './step'
import { drawAmbient, softGlow } from './render/environment'
import { createFakeCtx } from './render/fakes'
import type { GameHooks, Mob } from './types'

const hooks: GameHooks = { sfx() {}, message() {}, offerUpgrades() {}, end() {} }

const mob = (x: number, y: number): Mob => ({
  x, y, type: 'slime', hp: 100, max: 100, r: 18,
  speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})

describe('realtime computation budgets', () => {
  it('shares fixed hazard geometry across overlapping queries while preserving scene separation', () => {
    const first = nearbyHazards(1, 0, 0, 1400)
    const second = nearbyHazards(1, 30, 10, 1400)
    const same = first.find(a => second.some(b => a.x === b.x && a.y === b.y))
    expect(same).toBeDefined()
    expect(second.find(b => b.x === same!.x && b.y === same!.y)).toBe(same)
    expect(nearbyHazards(1, 0, 0, 1400)).toEqual(first)
    const other = nearbyHazards(2, 0, 0, 1400)
    expect(other).not.toEqual(first)
  })

  it('checks hundreds of distant enemies against orbiting blades without hundreds of square roots', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.hero.skills.orb = 5
    const target = mob(71, 0)
    s.mobs = [target, ...Array.from({ length: 129 }, (_, i) => mob(2200 + i * 4, 2000))]
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      tickSkills(s, 1 / 60, hooks)
      expect(target.hp).toBe(82)
      expect(s.mobs.slice(1).every(e => e.hp === 100)).toBe(true)
      expect(hypot.mock.calls.length).toBeLessThan(30)
    } finally {
      hypot.mockRestore()
    }
  })

  it('does not regenerate deterministic storm particle noise every frame', () => {
    const s = createState()
    s.W = 960
    s.H = 540
    s.currentScene = 1
    s.worldClock = 1.37
    const { ctx } = createFakeCtx()
    const sin = vi.spyOn(Math, 'sin')
    try {
      drawAmbient(ctx, s, 0, 0)
      expect(sin.mock.calls.length).toBeLessThan(160)
    } finally {
      sin.mockRestore()
    }
  })
  it('sorts nearest enemies by hitbox-edge distance without recomputing distance on each comparison', () => {
    const hero = createHero('knight')
    const mobs = Array.from({ length: 130 }, (_, i) => mob(150 + ((i * 53) % 130) * 6, i % 3))
    mobs[0]!.hp = 0
    const expected = mobs.slice(1).sort((a, b) =>
      Math.hypot(a.x - hero.x, a.y - hero.y) - a.r -
      (Math.hypot(b.x - hero.x, b.y - hero.y) - b.r))[0]
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      const sorted = nearestAlive(mobs, hero)
      expect(sorted).toHaveLength(129)
      expect(sorted[0]).toBe(expected)
      expect(hypot.mock.calls.length).toBeLessThan(150)
    } finally {
      hypot.mockRestore()
    }
  })

  it('updates every distant enemy with at most one distance root per movement step', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.mobs = Array.from({ length: 130 }, (_, i) => ({ ...mob(600 + i * 2, 40), speed: 90 }))
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      tickEnemies(s, 1 / 60, hooks)
      expect(s.mobs.every((e, i) => e.x < 600 + i * 2)).toBe(true)
      expect(hypot.mock.calls.length).toBeLessThan(150)
    } finally {
      hypot.mockRestore()
    }
  })

  it('does not take an additional root per enemy just for distant-mob despawn checks', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.hero.attack = 1000
    s.hero.inv = 1000
    s.mode = 'play'
    s.W = 960
    s.H = 540
    s.spawnT = 1000
    s.mobs = Array.from({ length: 130 }, (_, i) => ({ ...mob(600 + i * 2, 40), speed: 90 }))
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      step(s, 1 / 60, { x: 0, y: 0 }, hooks)
      expect(s.mobs).toHaveLength(130)
      expect(hypot.mock.calls.length).toBeLessThan(220)
    } finally {
      hypot.mockRestore()
    }
  })

  it('reuses a soft glow gradient when equivalent glows move onscreen', () => {
    const { ctx } = createFakeCtx()
    const original = ctx.createRadialGradient
    let creations = 0
    ctx.createRadialGradient = (...args) => { creations++; return original(...args) }
    softGlow(ctx, 10, 20, 46, '#ffffff', 0.4)
    softGlow(ctx, 90, 60, 46, '#ffffff', 0.7)
    expect(creations).toBe(1)
  })

  it('does not measure distant XP crystals with square roots every tick', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.hero.attack = 1000
    s.mode = 'play'
    s.spawnT = 1000
    s.W = 960
    s.H = 540
    s.stars = [
      { x: 100, y: 0, t: 0, value: 3 },
      ...Array.from({ length: 200 }, (_, i) => ({ x: 3000 + i * 50, y: 500, t: 0, value: 3 })),
    ]
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      step(s, 1 / 60, { x: 0, y: 0 }, hooks)
      expect(s.stars).toHaveLength(201)
      expect(s.stars[0]!.x).toBeCloseTo(92.5)
      expect(s.stars[1]!.x).toBe(3000)
      expect(hypot.mock.calls.length).toBeLessThan(30)
    } finally {
      hypot.mockRestore()
    }
  })

  it('keeps frost and blaze damage while skipping roots for far-away mobs', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.hero.skills.frost = 1
    s.hero.skills.blaze = 1
    const near = mob(90, 0)
    s.mobs = [near, ...Array.from({ length: 129 }, (_, i) => mob(2000 + i * 50, 2000))]
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      tickSkills(s, 1 / 60, hooks)
      expect(near.hp).toBeLessThan(100)
      expect(s.mobs.slice(1).every(e => e.hp === 100)).toBe(true)
      expect(hypot.mock.calls.length).toBeLessThan(20)
    } finally {
      hypot.mockRestore()
    }
  })

  it('does not compute square roots for all splash candidates during meteor casts', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.hero.skills.meteor = 1
    const near = mob(80, 0)
    s.mobs = [near, ...Array.from({ length: 129 }, (_, i) => mob(2000 + i * 350, 300))]
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      tickSkills(s, 1 / 60, hooks)
      expect(near.hp).toBeLessThan(100)
      expect(hypot.mock.calls.length).toBeLessThan(160)
    } finally {
      hypot.mockRestore()
    }
  })

  it('skips distant vortex falloff roots but retains nearby pulling', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.hero.skills.vortex = 1
    const near = mob(100, 0)
    s.mobs = [near, ...Array.from({ length: 129 }, (_, i) => mob(2000 + i * 50, 2000))]
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      tickSkills(s, 1 / 60, hooks)
      expect(near.x).toBeLessThan(100)
      expect(hypot.mock.calls.length).toBeLessThan(20)
    } finally {
      hypot.mockRestore()
    }
  })

})
