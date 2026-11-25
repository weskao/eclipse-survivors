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
    [1, '#b697fa', '#a94463'], [.75, '#b697fa', '#a94463'],
    [.749, '#d78ee9', '#be4258'], [.5, '#d78ee9', '#be4258'],
    [.499, '#e97ba1', '#d35048'], [.25, '#e97ba1', '#d35048'],
    [.249, '#ef526f', '#eb674d'], [0, '#ef526f', '#eb674d'],
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
    expect(fills).toContainEqual({ color: '#d35048', width: 101, height: 14 })
    expect(borders).toEqual(['#d6a4f3', '#98765e'])
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

describe('forged health bar materials', () => {
  it('keeps the gemstone fill readable, with static bevels and no per-enemy gradients', () => {
    const { ctx, calls } = createFakeCtx()
    const fills: { color: string; x: number; width: number; height: number }[] = []
    ctx.fillRect = (x, _y, width, height) => { fills.push({ color: String(ctx.fillStyle), x, width, height }) }
    ctx.createLinearGradient = () => { throw Error('must not allocate a gradient per actor') }
    const frame = { target: .4, front: .4, trail: .4 }
    drawEnemyHealthBar(ctx, frame, 0, 0, 100)
    expect(fills.some(f => f.color === '#635b4e')).toBe(true)
    expect(fills.some(f => f.color === '#ffffff26' && f.width > 0)).toBe(true)
    expect(fills.some(f => f.color === '#00000055' && f.width > 0)).toBe(true)
    expect(calls).not.toContain('beginPath')
    fills.length = 0
    drawEnemyHealthBar(ctx, frame, 0, 0, 100, true)
    expect(fills.some(f => f.color === '#74648e')).toBe(true)
    expect(fills.some(f => f.color === '#e97ba1' && f.height === 5)).toBe(true)
  })
  it('draws mirrored gothic end ornaments without altering the authoritative fill width', () => {
    const { ctx, calls } = createFakeCtx()
    const points: number[] = []
    ctx.moveTo = (x) => { points.push(x) }
    const fills: { color: string; width: number }[] = []
    ctx.fillRect = (_x, _y, width) => { fills.push({ color: String(ctx.fillStyle), width }) }
    const frame = { target: .25, front: .25, trail: .25 }
    drawBossHealthBar(ctx, frame, 100, 20)
    expect(points).toContain(-17)
    expect(points).toContain(217)
    expect(calls.filter(c => c === 'beginPath')).toHaveLength(8)
    expect(fills).toContainEqual({ color: '#d35048', width: 50.5 })
    expect(frame.target).toBe(.25)
  })
  it('does not paint a highlight or fill into empty or nearly empty tracks', () => {
    const { ctx } = createFakeCtx()
    const fills: { color: string; width: number }[] = []
    ctx.fillRect = (_x, _y, width) => { fills.push({ color: String(ctx.fillStyle), width }) }
    drawBossHealthBar(ctx, { target: 0, front: 0, trail: 0 }, 0, 0)
    expect(fills.some(f => f.color === '#eb674d' || f.color === '#ffffff26' || f.color === '#fff3cf')).toBe(false)
    expect(fills.every(f => f.width >= 0)).toBe(true)
  })
})

describe('sovereign boss overhead ornament', () => {
  it('adds a crown and symmetric wings outside the fill, with bounded geometry', () => {
    const { ctx, calls } = createFakeCtx()
    const points: { x: number; y: number }[] = []
    ctx.moveTo = (x, y) => { points.push({ x, y }) }
    ctx.lineTo = (x, y) => { points.push({ x, y }) }
    ctx.createLinearGradient = () => { throw Error('no per-frame gradient') }
    const fills: { color: string; x: number; y: number; width: number; height: number }[] = []
    ctx.fillRect = (x, y, width, height) => { fills.push({ color: String(ctx.fillStyle), x, y, width, height }) }
    const frame = { target: .4, front: .5, trail: .8 }
    drawBossHealthBar(ctx, frame, 100, 20)
    expect(points).toContainEqual({ x: 100, y: 0 })
    expect(Math.min(...points.map(p => p.x))).toBe(-17)
    expect(Math.max(...points.map(p => p.x))).toBe(217)
    expect(Math.max(...points.map(p => p.y))).toBeLessThanOrEqual(32)
    expect(fills).toContainEqual({ color: '#d35048', x: -1, y: 16, width: 101, height: 14 })
    expect(fills.some(f => f.color === '#ffba9c' && f.width === 101)).toBe(true)
    expect(fills.some(f => f.color === '#ffd89a' && f.width <= 5)).toBe(true)
    expect(calls[0]).toBe('save')
    expect(calls.at(-1)).toBe('restore')
    expect(frame).toEqual({ target: .4, front: .5, trail: .8 })
  })
  it('omits the damage accent when reduced motion supplies an exact fill', () => {
    const { ctx } = createFakeCtx()
    const colors: string[] = []
    ctx.fillRect = () => { colors.push(String(ctx.fillStyle)) }
    const frame = sampleHealthBar({ hp: 20, max: 100 }, 0, new WeakMap(), true)
    drawBossHealthBar(ctx, frame, 0, 0)
    expect(colors).not.toContain('#ffd89a')
    expect(colors).not.toContain('#fff3cf')
    expect(colors).not.toContain('#f2c37e')
    expect(colors).toContain('#eb674d')
  })
})
