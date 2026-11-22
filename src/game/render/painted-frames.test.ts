import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../state'
import { sampleHeroAnimation } from './animation'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { drawPaintedHero, frameForPose } from './painted-frames'
import { createRenderAssets, drawFrame } from './index'

function readyAtlas(): HTMLImageElement {
  const image = new Image()
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 256 })
  Object.defineProperty(image, 'naturalHeight', { value: 720 })
  return image
}

describe('real raster frame art in gameplay', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s renders complete per-frame artwork without image deformation', job => {
    const state = createState()
    state.mode = 'play'
    state.choice = job
    state.hero = createHero(job)
    const hero = state.hero
    hero.strike = .15
    hero.aimAngle = Math.PI
    hero.face = -1
    const anim = sampleHeroAnimation(state, hero)
    const image = readyAtlas()
    const { ctx, drawn } = createFakeCtx()
    const draw = vi.spyOn(ctx, 'drawImage')
    const scale = vi.spyOn(ctx, 'scale')
    expect(drawPaintedHero(ctx, image, job, hero, anim, 110, 145)).toBe(true)
    expect(drawn).toEqual([image])
    expect(draw.mock.calls[0]).toHaveLength(9)
    expect(draw.mock.calls[0]![3]).toBe(64)
    expect(draw.mock.calls[0]![4]).toBe(80)
    expect((draw.mock.calls[0]![7] as number) / (draw.mock.calls[0]![8] as number)).toBeCloseTo(64 / 80)
    expect(scale.mock.calls).toEqual([[-1, 1]])
  })

  it('chooses the correct contiguous twelve-frame strip for each job', () => {
    for (const [job, row] of [['knight', 0], ['ranger', 3], ['wizard', 6]] as const) {
      for (let i = 0; i < 12; i++) {
        const frame = frameForPose(job, { pose: 'attack', frame: i, count: 12, phase: i / 12, direction: 0, reducedMotion: false })
        expect(frame).toEqual({ x: (i % 4) * 64, y: (row + Math.floor(i / 4)) * 80 })
      }
    }
  })

  it('uses neutral movement poses without repainting a sword-swing or a fired arrow at rest', () => {
    for (const job of ['knight', 'ranger', 'wizard'] as const) {
      const state = createState()
      state.choice = job
      state.mode = 'play'
      state.hero = createHero(job)
      const hero = state.hero
      const idle = frameForPose(job, sampleHeroAnimation(state, hero))
      hero.moveAmount = 1
      hero.vx = 90
      hero.step = Math.PI
      const moving = frameForPose(job, sampleHeroAnimation(state, hero))
      expect(idle).not.toEqual(frameForPose(job, { pose: 'attack', frame: 5, count: 12, phase: .5, direction: 0, reducedMotion: false }))
      expect(moving.x).toBeGreaterThanOrEqual(0)
      expect(moving.y).toBeGreaterThanOrEqual(0)
    }
  })


  it('uses a dedicated eight-frame run sheet instead of recycled attack recovery frames', () => {
    const s = createState()
    s.choice = 'ranger'
    s.mode = 'play'
    s.hero = createHero('ranger')
    const hero = s.hero
    hero.moveAmount = 1
    hero.vx = 90
    hero.step = Math.PI
    const atlas = readyAtlas()
    const run = new Image()
    Object.defineProperty(run, 'complete', { value: true })
    Object.defineProperty(run, 'naturalWidth', { value: 512 })
    Object.defineProperty(run, 'naturalHeight', { value: 240 })
    const { ctx } = createFakeCtx()
    const draw = vi.spyOn(ctx, 'drawImage')
    expect(drawPaintedHero(ctx, atlas, 'ranger', hero, sampleHeroAnimation(s, hero), 110, 145, run)).toBe(true)
    expect(draw.mock.calls.at(-1)![0]).toBe(run)
    expect(draw.mock.calls.at(-1)![3]).toBe(64)
    expect(draw.mock.calls.at(-1)![4]).toBe(80)
  })

  it('falls back to attack atlas safely while the dedicated run sheet is loading', () => {
    const s = createState()
    s.choice = 'knight'
    s.mode = 'play'
    s.hero = createHero('knight')
    s.hero.moveAmount = 1
    const { ctx } = createFakeCtx()
    const draw = vi.spyOn(ctx, 'drawImage')
    drawPaintedHero(ctx, readyAtlas(), 'knight', s.hero, sampleHeroAnimation(s, s.hero), 110, 145, new Image())
    expect(draw.mock.calls.at(-1)![0]).toBeDefined()
  })

  it('preserves the old renderer until the new sprite sheet has decoded', () => {
    const state = createState()
    state.choice = 'ranger'
    state.hero = createHero('ranger')
    const notReady = new Image()
    const { ctx, drawn } = createFakeCtx()
    expect(drawPaintedHero(ctx, notReady, state.choice, state.hero, sampleHeroAnimation(state, state.hero), 110, 145)).toBe(false)
    expect(drawn).toHaveLength(0)
  })

  it('routes the main drawFrame through the dedicated raster sheet when available', () => {
    const state = createState()
    state.mode = 'play'
    state.choice = 'ranger'
    state.hero = createHero('ranger')
    state.hero.strike = .1
    state.W = 900
    state.H = 600
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const atlas = readyAtlas()
    assets.paintedFrames = atlas
    const { ctx, drawn } = createFakeCtx()
    drawFrame(ctx, state, 1, assets)
    expect(drawn).toContain(atlas)
  })
})
