import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../state'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { createRenderAssets, drawFrame } from './index'

describe('Knight experimental GPU actor at the actual game draw boundary', () => {
  function setup() {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.W = 900; s.H = 600
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const draw = vi.fn(() => true)
    assets.knightPixi = { draw, dispose: vi.fn() }
    return { s, assets, draw }
  }
  it('uses all eight travel directions and center, once per frame', () => {
    const { s, assets, draw } = setup()
    const hero = s.hero!
    for (let i = 0; i < 8; i++) {
      hero.vx = Math.cos(i * Math.PI / 4) * 100
      hero.vy = Math.sin(i * Math.PI / 4) * 100
      hero.moveAmount = 1
      drawFrame(createFakeCtx().ctx, s, 1, assets)
      expect(draw.mock.calls.length).toBe(i + 1)
    }
    hero.moveAmount = 0; hero.vx = 0; hero.vy = 0
    drawFrame(createFakeCtx().ctx, s, 1, assets)
    expect(draw).toHaveBeenCalledTimes(9)
  })
  it('falls back on an unsuccessful GPU draw and never affects another hero', () => {
    const { s, assets, draw } = setup()
    draw.mockReturnValue(false)
    const f = createFakeCtx()
    drawFrame(f.ctx, s, 1, assets)
    expect(draw).toHaveBeenCalledTimes(1)
    expect(f.drawn).toContain(assets.art.knight)
    s.choice = s.heroId = 'ranger'
    s.hero = createHero('ranger')
    drawFrame(createFakeCtx().ctx, s, 1, assets)
    expect(draw).toHaveBeenCalledTimes(1)
  })
  it('passes live attack direction, reduced motion and pause without mutating combat', () => {
    const { s, assets, draw } = setup()
    const h = s.hero!
    h.strike = .15; h.aimAngle = Math.PI / 2
    const before = { ...h }
    assets.prefersReducedMotion = () => true
    s.mode = 'paused'
    drawFrame(createFakeCtx().ctx, s, 1, assets)
    expect(draw).toHaveBeenCalledWith(expect.anything(), h, expect.objectContaining({ pose: 'attack', direction: 2, reducedMotion: true }), s.worldClock, true, false)
    expect(h).toEqual(before)
  })
})
