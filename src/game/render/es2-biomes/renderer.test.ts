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
