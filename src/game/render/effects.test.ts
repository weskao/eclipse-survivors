import { describe, expect, it } from 'vitest'
import { DASH_COOLDOWN, TAU } from '../constants'
import { createState, resetRun } from '../state'
import type { GameMode, Hero } from '../types'
import { createFakeCtx } from './fakes'
import { drawFx, drawHeroStatus, drawLightning, drawShots, drawStars } from './effects'

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

describe('hero foot status', () => {
  function readout(patch: Partial<Hero> = {}, opts: { time?: number; mode?: GameMode; reduced?: boolean } = {}) {
    const s = scene()
    resetRun(s)
    s.mode = opts.mode ?? 'play'
    s.time = opts.time ?? 10
    const hero = s.hero!
    hero.dashCd = -5
    Object.assign(hero, patch)
    const fake = createFakeCtx()
    const arcs: { sweep: number; alpha: number }[] = []
    const rects: { w: number; fill: string }[] = []
    fake.ctx.ellipse = (_x: number, _y: number, _rx: number, _ry: number, _rot: number, start: number, end: number) => {
      arcs.push({ sweep: end - start, alpha: fake.ctx.globalAlpha })
    }
    fake.ctx.fillRect = (_x: number, _y: number, w: number) => {
      rects.push({ w, fill: String(fake.ctx.fillStyle) })
    }
    drawHeroStatus(fake.ctx, s, hero, 0, 0, opts.reduced)
    return { arcs, rects, calls: fake.calls }
  }

  it('draws nothing at full health with dash ready, including the first frames of a run', () => {
    expect(readout().calls).toEqual([])
    expect(readout({ dashCd: -0.1 }, { time: 0.1 }).calls).toEqual([])
  })

  it('sweeps the dash ring with recovered cooldown', () => {
    const { arcs } = readout({ dashCd: DASH_COOLDOWN * 0.25 })
    expect(arcs.at(-1)!.sweep).toBeCloseTo(TAU * 0.75)
  })

  it('flashes a full ring only briefly after a real recovery', () => {
    expect(readout({ dashCd: -0.1 }).arcs.at(-1)!.sweep).toBeCloseTo(TAU)
    expect(readout({ dashCd: -0.4 }).arcs).toEqual([])
  })

  it('holds the recovery ring at a constant opacity under reduced motion', () => {
    const early = readout({ dashCd: -0.02 }, { reduced: true }).arcs.at(-1)!
    const late = readout({ dashCd: -0.24 }, { reduced: true }).arcs.at(-1)!
    expect(early.alpha).toBe(late.alpha)
  })

  it('scales the health bar and turns critical at exactly 25%', () => {
    const half = readout({ hp: 50, max: 100 }).rects
    expect(half[1]!.w / half[0]!.w).toBeCloseTo(0.5, 1)
    const healthy = readout({ hp: 26, max: 100 }).rects[1]!.fill
    const critical = readout({ hp: 25, max: 100 }).rects[1]!.fill
    expect(critical).not.toBe(healthy)
  })

  it('stays hidden outside a live run', () => {
    expect(readout({ hp: 10, dashCd: 1 }, { mode: 'menu' }).calls).toEqual([])
    expect(readout({ hp: 10, dashCd: 1 }, { mode: 'result' }).calls).toEqual([])
    expect(readout({ hp: 0, dashCd: 1 }).calls).toEqual([])
  })

  it('stays visible while paused so the state can be read', () => {
    expect(readout({ hp: 10, dashCd: 1 }, { mode: 'paused' }).calls).toContain('stroke')
  })
})
