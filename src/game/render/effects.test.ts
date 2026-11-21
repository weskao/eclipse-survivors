import { describe, expect, it } from 'vitest'
import { createState } from '../state'
import { createFakeCtx } from './fakes'
import { drawFx, drawLightning, drawShots, drawStars } from './effects'

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
