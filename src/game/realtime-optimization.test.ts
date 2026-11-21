import { describe, expect, it, vi } from 'vitest'
import { nearbyHazards } from './world'
import { createHero, createState } from './state'
import { tickSkills } from './skills'
import { drawAmbient } from './render/environment'
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
})
