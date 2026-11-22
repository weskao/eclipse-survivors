import { describe, expect, it } from 'vitest'
import { BIOME_IDS, createBiomeEnvironment } from '../../content/biomes'
import { createFakeCtx, fakeCanvasFactory } from '../fakes'
import { createBiomeRenderer } from './index'

describe.each(BIOME_IDS)('%s cached biome renderer', id => {
  it('draws hazard warning and damage as actual circular hitboxes rather than flattened ellipses', () => {
    const env = createBiomeEnvironment(id, { seed: 42 })
    const hazard = env.hazards(900, 900, 1500)[0]!
    const time = hazard.period * ((hazard.warn + 1) / 2) - hazard.offset
    const { make } = fakeCanvasFactory()
    const renderer = createBiomeRenderer(make)
    const { ctx, calls } = createFakeCtx()
    const arcs: number[] = []
    ctx.arc = ((x: number, y: number, r: number) => { if (x === hazard.x && y === hazard.y) arcs.push(r) }) as typeof ctx.arc
    const view = { left: hazard.x - 90, top: hazard.y - 90, right: hazard.x + 90, bottom: hazard.y + 90 }
    renderer.drawGround(ctx, env, view, time)
    expect(arcs).toContain(hazard.r)
    expect(calls).not.toContain('ellipse')
    expect(calls).toContain('stroke')
    expect(calls.filter(name => name === 'save')).toHaveLength(calls.filter(name => name === 'restore').length)
  })

  it('reuses prepainted tiles and props on later frames, with bounded scene and DPI invalidation', () => {
    const env = createBiomeEnvironment(id, { seed: 42 })
    const { make, made } = fakeCanvasFactory()
    const renderer = createBiomeRenderer(make)
    const view = { left: -240, top: -240, right: 240, bottom: 240 }
    const { ctx } = createFakeCtx()
    renderer.drawGround(ctx, env, view, 0)
    renderer.drawProps(ctx, env, view)
    const first = made.length
    renderer.drawGround(ctx, env, view, 1)
    renderer.drawProps(ctx, env, view)
    expect(made).toHaveLength(first)
    expect(renderer.cacheSize()).toBeLessThanOrEqual(12)
    renderer.setPixelRatio(2)
    expect(renderer.cacheSize()).toBe(0)
    renderer.drawGround(ctx, env, view, 0)
    expect(made.length).toBeGreaterThan(first)
    renderer.reset()
    expect(renderer.cacheSize()).toBe(0)
  })


  it('dims suppressed hazard telegraphs so rendered danger agrees with live contact', () => {
    const env = createBiomeEnvironment(id, { seed: 42 })
    let match: { node: { x: number; y: number }; hazard: ReturnType<typeof env.hazards>[number] } | undefined
    for (let i = -16; i <= 16 && !match; i++) for (let j = -16; j <= 16 && !match; j++) {
      const cell = env.cell(i, j)
      const node = cell.interactions[0]
      const hazard = cell.hazards[0]
      if (node && hazard && Math.hypot(node.x - hazard.x, node.y - hazard.y) < 172) match = { node, hazard }
    }
    expect(match).toBeDefined()
    const { node, hazard } = match!
    const t = ((hazard.period * ((hazard.warn + 1) / 2) - hazard.offset) % hazard.period + hazard.period) % hazard.period
    expect(env.contact(hazard, 0, t).damagePerSecond).toBeGreaterThan(0)
    expect(env.interact(node, t)).not.toBeNull()
    expect(env.contact(hazard, 0, t).damagePerSecond).toBe(0)
    const renderer = createBiomeRenderer(fakeCanvasFactory().make)
    const { ctx } = createFakeCtx()
    const alphas: number[] = []
    ctx.arc = ((x: number, y: number) => {
      if (x === hazard.x && y === hazard.y) alphas.push(ctx.globalAlpha)
    }) as typeof ctx.arc
    renderer.drawGround(ctx, env, { left: hazard.x - 80, top: hazard.y - 80,
      right: hazard.x + 80, bottom: hazard.y + 80 }, t)
    expect(alphas).toContain(.13)
  })

  it('prepares exact minimap geometry and rejects oversized mobile render regions', () => {
    const env = createBiomeEnvironment(id, { seed: 17 })
    const renderer = createBiomeRenderer(fakeCanvasFactory().make)
    const { ctx } = createFakeCtx()
    const data = renderer.drawMinimap(ctx, env, { x: 0, y: 0 }, 4)
    expect(data).toEqual(env.minimap(0, 0, 1050))
    expect(() => renderer.drawGround(ctx, env,
      { left: 0, top: 0, right: 5000, bottom: 2000 }, 0)).toThrow(RangeError)
  })
})
