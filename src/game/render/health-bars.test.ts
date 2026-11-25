import { describe, expect, it } from 'vitest'
import type { Mob } from '../types'
import { drawBossHealthBar, drawEnemyHealthBar, healthBarColor, sampleHealthBar } from './health-bars'
import { createFakeCtx } from './fakes'

const enemy = (): Mob => ({
  x: 0, y: 0, type: 'goblin', hp: 100, max: 100,
  r: 20, speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0,
  stagger: 0, kx: 0, ky: 0,
})

describe('renderer-owned health bar interpolation', () => {
  it('smooths damage and retains a slower trailing segment without modifying authoritative HP', () => {
    const mob = enemy(), cache = new WeakMap()
    sampleHealthBar(mob, 0, cache)
    mob.hp = 20
    const hit = { ...sampleHealthBar(mob, .05, cache) }
    expect(hit.front).toBeGreaterThan(.2)
    expect(hit.front).toBeLessThan(1)
    expect(hit.trail).toBeGreaterThan(hit.front)
    expect(mob.hp).toBe(20)
    const later = sampleHealthBar(mob, .2, cache)
    expect(later.front).toBeLessThan(hit.front)
    expect(later.trail).toBeLessThan(hit.trail)
  })
  it('does not snap a fully healed enemy to full before the displayed fill catches up', () => {
    const mob = enemy(), cache = new WeakMap()
    sampleHealthBar(mob, 0, cache)
    mob.hp = 30
    sampleHealthBar(mob, .1, cache)
    mob.hp = 100
    const healed = sampleHealthBar(mob, .15, cache)
    expect(healed.front).toBeGreaterThan(.3)
    expect(healed.front).toBeLessThan(1)
    expect(healed.trail).toBe(healed.front)
    expect(mob.hp).toBe(100)
  })
  it('smooths healing without a phantom damage tail and honors reduced motion', () => {
    const mob = enemy(), cache = new WeakMap()
    sampleHealthBar(mob, 0, cache)
    mob.hp = 20
    sampleHealthBar(mob, .15, cache)
    mob.hp = 90
    const healing = sampleHealthBar(mob, .2, cache)
    expect(healing.front).toBeGreaterThan(.2)
    expect(healing.front).toBeLessThan(.9)
    expect(healing.trail).toBe(healing.front)
    const reduced = sampleHealthBar(mob, .21, cache, true)
    expect(reduced.front).toBe(.9)
    expect(reduced.trail).toBe(.9)
  })
})

describe('enemy health color tiers', () => {
  it.each([
    [1, '#78d8a0'], [.75, '#78d8a0'], [.749, '#eac95f'], [.5, '#eac95f'],
    [.499, '#ed9851'], [.25, '#ed9851'], [.249, '#e66b73'], [0, '#e66b73'],
  ])('colors health fraction %s as %s', (fraction, color) => {
    expect(healthBarColor(fraction)).toBe(color)
  })
  it('normalizes high max HP, marks elites independently, and signals actual HP while the fill eases', () => {
    const ordinary = { hp: 20, max: 100 }, elite = { hp: 200, max: 1000 }
    const cache = new WeakMap()
    const { ctx } = createFakeCtx()
    const fills: string[] = [], borders: string[] = []
    ctx.fillRect = (_x, _y, _w, h) => { if ((h === 4 || h === 5) && _w !== 2) fills.push(String(ctx.fillStyle)) }
    ctx.strokeRect = () => { borders.push(String(ctx.strokeStyle)) }
    drawEnemyHealthBar(ctx, sampleHealthBar(ordinary, 0), 0, 0, 100)
    drawEnemyHealthBar(ctx, sampleHealthBar(elite, 0), 0, 0, 100, true)
    expect(fills).toEqual(['#e66b73', '#ef526f'])
    expect(borders).toEqual(['#d6a4f3'])
    elite.hp = 1000
    sampleHealthBar(elite, 0, cache)
    elite.hp = 200
    const motion = sampleHealthBar(elite, .01, cache)
    expect(motion.front).toBeGreaterThan(.75)
    fills.length = 0
    drawEnemyHealthBar(ctx, motion, 0, 0, 100, true)
    expect(fills).toEqual(['#f2c37e', '#ef526f'])
    expect(elite.hp).toBe(200)
  })
})

describe('ranked enemy health presentation', () => {
  it.each([
    [1, '#b697fa', '#efc46c'], [.75, '#b697fa', '#efc46c'],
    [.749, '#d78ee9', '#eaa34f'], [.5, '#d78ee9', '#eaa34f'],
    [.499, '#e97ba1', '#e46a48'], [.25, '#e97ba1', '#e46a48'],
    [.249, '#ef526f', '#d93859'], [0, '#ef526f', '#d93859'],
  ] as const)('uses distinct elite and boss palettes at %s HP', (fraction, elite, boss) => {
    expect(healthBarColor(fraction, 'elite')).toBe(elite)
    expect(healthBarColor(fraction, 'boss')).toBe(boss)
  })
  it('uses larger framed elite and boss fills and local impact edge only during damage', () => {
    const { ctx } = createFakeCtx()
    const fills: { color: string; width: number; height: number }[] = []
    const borders: string[] = []
    ctx.fillRect = (_x, _y, width, height) => { fills.push({ color: String(ctx.fillStyle), width, height }) }
    ctx.strokeRect = () => { borders.push(String(ctx.strokeStyle)) }
    const hit = { target: .25, front: .5, trail: .8 }
    drawEnemyHealthBar(ctx, hit, 0, 0, 100, true)
    drawBossHealthBar(ctx, hit, 0, 0)
    expect(fills.find(f => f.color === '#e97ba1' && f.height === 5)?.width).toBeCloseTo(31)
    expect(fills).toContainEqual({ color: '#e46a48', width: 93, height: 10 })
    expect(borders).toEqual(['#d6a4f3', '#e9c078'])
    expect(fills.filter(f => f.color === '#fff3cf' && f.width === 2)).toHaveLength(2)
    fills.length = 0
    drawBossHealthBar(ctx, { target: .25, front: .25, trail: .25 }, 0, 0)
    expect(fills.some(f => f.color === '#fff3cf')).toBe(false)
  })
  it('holds damage briefly, decays it, and clears the trail on partial healing', () => {
    const mob = enemy(), cache = new WeakMap()
    sampleHealthBar(mob, 0, cache)
    mob.hp = 20
    const hit = { ...sampleHealthBar(mob, .03, cache) }
    expect(hit.trail).toBe(1)
    expect(sampleHealthBar(mob, .06, cache).trail).toBe(1)
    expect(sampleHealthBar(mob, .2, cache).trail).toBeLessThan(1)
    // A heal can still be below the previously displayed front.
    mob.hp = 21
    const healed = sampleHealthBar(mob, .21, cache)
    expect(healed.trail).toBeLessThanOrEqual(healed.front)
    expect(sampleHealthBar(mob, .22, cache).trail).toBeLessThanOrEqual(sampleHealthBar(mob, .22, cache).front)
    mob.hp = 10
    const reduced = sampleHealthBar(mob, .23, cache, true)
    expect(reduced).toMatchObject({ front: .1, trail: .1, target: .1 })
  })
})
