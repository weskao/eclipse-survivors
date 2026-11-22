import { describe, expect, it } from 'vitest'
import { createState } from '../state'
import { createFakeCtx } from './fakes'
import type { GameMode, Hero } from '../types'
import { drawFx, drawHeroBars, drawLightning, drawShots, drawStars } from './effects'

function scene() {
  const s = createState()
  s.W = 800
  s.H = 600
  return s
}

describe('restrained combat feedback', () => {
  it('draws connected travel history behind magic bolts and arrows', () => {
    const s = scene()
    s.shots = [
      { x: 40, y: 25, vx: 320, vy: 0, prevX: 10, prevY: 25, life: 1, d: 12, kind: 'magic', r: 8 },
      { x: 90, y: 45, vx: 520, vy: 0, prevX: 70, prevY: 45, life: 1, d: 12, kind: 'arrow', r: 5 },
    ]
    const { ctx, calls } = createFakeCtx()
    drawShots(ctx, s, 0, 0)
    expect(calls.filter((c) => c === 'moveTo').length).toBeGreaterThan(4)
  })

  it('uses one low-glow lightning stroke instead of three when motion is reduced', () => {
    const s = scene()
    s.lightningFx = [{ pts: [{ x: 0, y: 0 }, { x: 40, y: 25 }], life: 0.2, max: 0.23 }]
    const full = createFakeCtx()
    drawLightning(full.ctx, s, 0, 0)
    const reduced = createFakeCtx()
    drawLightning(reduced.ctx, s, 0, 0, true)
    expect(full.calls.filter((x) => x === 'stroke')).toHaveLength(3)
    expect(reduced.calls.filter((x) => x === 'stroke')).toHaveLength(1)
  })

  it('caps reduced-motion particle rendering and preserves a readable ice impact', () => {
    const s = scene()
    s.fx = Array.from({ length: 120 }, (_, i) => ({
      x: 100, y: 100, life: 0.2, max: 0.4,
      type: (i === 119 ? 'ice' : 'footstep') as 'ice' | 'footstep',
      color: '#ffffff', r: 3,
    }))
    const normal = createFakeCtx()
    drawFx(normal.ctx, s, 0, 0)
    const reduced = createFakeCtx()
    drawFx(reduced.ctx, s, 0, 0, true)
    expect(normal.calls.filter((x) => x === 'fill').length).toBeGreaterThan(100)
    expect(reduced.calls.filter((x) => x === 'fill')).toHaveLength(1)
  })

  it('stops star bob/rotation under reduced motion without hiding the pickup', () => {
    const s = scene()
    s.stars = [{ x: 100, y: 100, t: 1, value: 2 }]
    const { ctx, calls } = createFakeCtx()
    drawStars(ctx, s, 0, 0, true)
    expect(calls).toContain('fill')
    expect(calls).not.toContain('rotate')
  })
})

describe('hero foot bars', () => {
  const hero = (hp: number, max: number, xp: number, need: number) => ({ x: 100, y: 100, hp, max, xp, need }) as Hero
  function paint(h: Hero, showHp = true, showXp = true, mode: GameMode = 'play') {
    const s = scene()
    s.mode = mode
    const fake = createFakeCtx()
    const rects: { y: number; w: number; fill: string }[] = []
    fake.ctx.fillRect = (_x, y, w) => { rects.push({ y, w, fill: String(fake.ctx.fillStyle) }) }
    drawHeroBars(fake.ctx, s, h, 0, 0, showHp, showXp)
    return { rects, calls: fake.calls, widths: (y: number) => rects.filter((r) => r.y === y).map((r) => r.w) }
  }

  it('shows both bars at full health and with a full experience meter', () => {
    const { widths } = paint(hero(100, 100, 50, 50))
    expect(widths(122)).toEqual([56, 56])
    expect(widths(129)).toEqual([56, 56])
  })

  it('keeps the empty experience track visible and scales partial values', () => {
    const { widths } = paint(hero(25, 100, 0, 50))
    expect(widths(122)).toEqual([56, 14])
    expect(widths(129)).toEqual([56, 0])
  })

  it('clamps overfilled values to the track', () => {
    const { widths } = paint(hero(140, 100, 90, 50))
    expect(widths(122)).toEqual([56, 56])
    expect(widths(129)).toEqual([56, 56])
  })

  it('hides each bar independently without moving the other', () => {
    expect(paint(hero(50, 100, 10, 50), false, true).rects.every((r) => r.y === 129)).toBe(true)
    expect(paint(hero(50, 100, 10, 50), true, false).rects.every((r) => r.y === 122)).toBe(true)
    const off = paint(hero(50, 100, 10, 50), false, false)
    expect(off.rects).toEqual([])
    expect(off.calls).toEqual([])
  })

  it('draws during play, level-up and pause but not on menus, results or death', () => {
    for (const mode of ['play', 'level', 'paused'] as const) expect(paint(hero(50, 100, 1, 5), true, true, mode).rects).toHaveLength(4)
    for (const mode of ['menu', 'result'] as const) expect(paint(hero(50, 100, 1, 5), true, true, mode).rects).toEqual([])
    expect(paint(hero(0, 100, 1, 5)).rects).toEqual([])
  })

  it('balances canvas state', () => {
    const { calls } = paint(hero(10, 100, 1, 5))
    expect(calls.filter((c) => c === 'save')).toHaveLength(calls.filter((c) => c === 'restore').length)
  })
})
