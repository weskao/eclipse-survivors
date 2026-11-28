import { afterEach, describe, expect, it, vi } from 'vitest'
import { createState, resetRun } from '../../state'
import type { ContentRegistry } from '../../content/registry'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../fakes'
import { createRenderAssets, drawFrame } from '../index'
import type { HeroVfxFrame, PixiVfxBridge } from './bridge'

const heroSpecial = vi.fn<(frame: HeroVfxFrame) => boolean>(() => true)
let failRenderer = false
vi.mock('./renderer', () => ({
  createPixiBossRenderer: async () => {
    if (failRenderer) throw new Error('no webgl')
    return { projectiles: () => true, impacts: () => true, lastReleaseIds: () => [], heroSpecial, dispose: vi.fn() }
  },
}))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
afterEach(() => { heroSpecial.mockReset(); heroSpecial.mockImplementation(() => true); failRenderer = false })

function frame(): HeroVfxFrame {
  return {
    ctx: createFakeCtx().ctx, effect: { id: 'combat-vfx:hero-shadowblade', x: 0, y: 0, life: 1, max: 1.08 },
    kind: 'hero-shadowblade', ox: 0, oy: 0, width: 800, height: 600, dpr: 1, reduced: false,
  }
}

describe('hero special Pixi pass', () => {
  it('warms lazily, falls back to Canvas until ready, then counts GPU-owned passes', async () => {
    const { createPixiVfxBridge } = await import('./bridge')
    const bridge = createPixiVfxBridge()
    expect(bridge.stats().status).toBe('idle')
    bridge.warm()
    expect(bridge.stats().status).toBe('loading')
    expect(bridge.heroSpecial(frame())).toBe(false)
    await flush()
    expect(bridge.heroSpecial(frame())).toBe(true)
    expect(heroSpecial).toHaveBeenCalledTimes(1)
    expect(bridge.stats()).toMatchObject({ status: 'ready', heroPasses: 1, fallbackPasses: 1 })
    heroSpecial.mockImplementation(() => { throw new Error('lost') })
    expect(bridge.heroSpecial(frame())).toBe(false)
    expect(bridge.stats().status).toBe('fallback')
    bridge.dispose()
    expect(bridge.heroSpecial(frame())).toBe(false)
  })

  it('stays on Canvas permanently when WebGL is unavailable', async () => {
    failRenderer = true
    const { createPixiVfxBridge } = await import('./bridge')
    const bridge = createPixiVfxBridge()
    bridge.warm()
    await flush()
    expect(bridge.heroSpecial(frame())).toBe(false)
    expect(bridge.stats().status).toBe('fallback')
  })

  it.each([true, false])('drawFrame gives a live hero effect to exactly one owner (GPU ready: %s)', ready => {
    const s = createState()
    resetRun(s)
    s.W = 800; s.H = 600
    const effect = { id: 'combat-vfx:hero-spirit-summoner' as const, x: 0, y: 0, life: 1, max: 1.32, targets: [{ x: 40, y: 5 }] }
    s.content.effects.push({ id: 'combat-vfx:sword-slash', x: 0, y: 0, life: 0.2, max: 0.4 }, effect)
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const render = vi.fn()
    assets.content = { render } as unknown as ContentRegistry
    const gpu = vi.fn<(f: HeroVfxFrame) => boolean>(() => ready)
    assets.pixiVfx = { heroSpecial: gpu } as unknown as PixiVfxBridge
    const { ctx } = createFakeCtx()
    drawFrame(ctx, s, 2, assets)
    expect(gpu).toHaveBeenCalledTimes(1)
    expect(gpu.mock.calls[0]![0]).toMatchObject({ effect, kind: 'hero-spirit-summoner', width: 800, height: 600, dpr: 2 })
    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]![4]).toBe(ready ? effect : undefined)
  })
})
