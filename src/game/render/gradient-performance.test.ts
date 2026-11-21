import { describe, expect, it } from 'vitest'
import { createState } from '../state'
import { createFakeCtx } from './fakes'
import { drawImpactWaves, drawNumbers, drawShots, drawVignette } from './effects'

describe('high-density visual-effect performance contracts', () => {
  it('reuses the vignette gradient until the viewport dimensions change', () => {
    const s = createState()
    s.W = 960; s.H = 540
    const { ctx } = createFakeCtx()
    const original = ctx.createRadialGradient
    let created = 0
    ctx.createRadialGradient = (...args) => { created++; return original(...args) }
    drawVignette(ctx, s)
    drawVignette(ctx, s)
    expect(created).toBe(1)
    s.W = 1024
    drawVignette(ctx, s)
    expect(created).toBe(2)
  })

  it('shares a single magic-bolt glow gradient across projectiles and frames', () => {
    const s = createState()
    s.W = 960; s.H = 540
    s.shots = Array.from({ length: 30 }, (_, i) => ({
      x: i * 16, y: 100, vx: 200, vy: 0, d: 20, life: 1,
      r: 9, kind: 'magic' as const,
    }))
    const { ctx } = createFakeCtx()
    const original = ctx.createRadialGradient
    let created = 0
    ctx.createRadialGradient = (...args) => { created++; return original(...args) }
    drawShots(ctx, s, 0, 0)
    drawShots(ctx, s, 0, 0)
    expect(created).toBe(1)
  })

  it('does not paint damage numbers outside the viewport', () => {
    const s = createState()
    s.W = 960; s.H = 540
    s.numberFx = [
      { x: 100, y: 100, life: 0.3, value: 12, boss: false },
      { x: 5000, y: 6000, life: 0.3, value: 45, boss: false },
    ]
    const { ctx, calls } = createFakeCtx()
    drawNumbers(ctx, s, 0, 0)
    expect(calls.filter(x => x === 'strokeText')).toHaveLength(1)
  })

  it('does not paint impact rings completely outside the viewport', () => {
    const s = createState()
    s.W = 960; s.H = 540
    s.impactWaves = [
      { x: 120, y: 140, size: 40, color: '#fff', life: 0.3, max: 0.38 },
      { x: 4000, y: 6000, size: 40, color: '#fff', life: 0.3, max: 0.38 },
    ]
    const { ctx, calls } = createFakeCtx()
    drawImpactWaves(ctx, s, 0, 0)
    expect(calls.filter(x => x === 'ellipse')).toHaveLength(1)
  })
})
