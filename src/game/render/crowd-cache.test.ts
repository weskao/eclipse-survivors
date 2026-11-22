import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../state'
import type { Mob } from '../types'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { createRenderAssets, drawFrame } from './index'
import { drawCharacter } from './characters'

const mob = (type: Mob['type'], x: number, y: number, extra: Partial<Mob> = {}): Mob => ({
  x, y, type, hp: 100, max: 100, r: 18, speed: 0, dmg: 0,
  phase: 1, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ...extra,
})

function crowd() {
  const state = createState()
  resetRun(state)
  state.W = 960
  state.H = 540
  state.mobs = [
    ...Array.from({ length: 48 }, (_, i) => mob('slime', (i % 12) * 55 - 280, Math.floor(i / 12) * 85 - 105, { elite: true })),
    ...Array.from({ length: 24 }, (_, i) => mob('warlock', (i % 8) * 65 - 190, 110 + Math.floor(i / 8) * 55)),
    ...Array.from({ length: 24 }, (_, i) => mob('bat', (i % 8) * 65 - 190, 180 + Math.floor(i / 8) * 30, { hit: 0.12 })),
  ]
  return state
}

describe('crowd bitmap cache contracts', () => {
  it('rasterizes each enemy filter variant once per source instead of filtering every mob on the main canvas', () => {
    const s = crowd()
    const { make, made } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    const initial = made.length
    const frame = createFakeCtx()
    let filter = 'none'
    let filteredOnScreen = 0
    Object.defineProperty(frame.ctx, 'filter', {
      configurable: true,
      get: () => filter,
      set: (value: string) => { filter = value; if (value !== 'none') filteredOnScreen++ },
    })
    drawFrame(frame.ctx, s, 1, assets)
    expect(filteredOnScreen).toBe(0)
    expect(made.length - initial).toBe(3)
    const variants = made.slice(initial).map(item => item.canvas)
    for (const variant of variants) {
      expect(frame.drawn.filter(src => src === variant).length).toBeGreaterThan(10)
    }
    const painted = variants.map(variant => made.find(item => item.canvas === variant)!.fake)
    expect(painted.every(entry => entry.calls.filter(name => name === 'drawImage').length === 1)).toBe(true)
    drawFrame(frame.ctx, s, 1, assets)
    expect(made.length - initial).toBe(3)
  })

  it('reuses a prepainted ground shadow across same-sized mobs', () => {
    const s = crowd()
    const { make, made } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    const first = s.mobs[0]!
    const second = s.mobs[1]!
    const originalCount = made.length
    const frame = createFakeCtx()
    drawCharacter(frame.ctx, s, assets.art, assets.sprites, first, 480, 286, false, assets.mobTint, assets.mobShadows)
    expect(frame.calls).not.toContain('ellipse')
    const shadow = made[originalCount]!.canvas
    expect(frame.drawn).toContain(shadow)
    drawCharacter(frame.ctx, s, assets.art, assets.sprites, second, 480, 286, false, assets.mobTint, assets.mobShadows)
    expect(frame.drawn.filter(img => img === shadow)).toHaveLength(2)
    // The second mob needs no additional shadow bitmap.
    expect(made.filter(item => item.canvas === shadow)).toHaveLength(1)
  })

  it('uses cached gem bitmaps to render a dense XP field instead of rebuilding glowing paths', () => {
    const s = crowd()
    s.mobs = []
    s.stars = Array.from({ length: 110 }, (_, i) => ({
      x: (i % 20) * 42 - 390, y: Math.floor(i / 20) * 50 - 130,
      value: i % 3 === 0 ? 20 : 3, t: i / 9,
    }))
    const { make, made } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    const builtAtStartup = made.length
    const frame = createFakeCtx()
    drawFrame(frame.ctx, s, 1, assets)
    // Every crystal is a single cached image draw, with no additional per-frame bitmap allocation.
    const gemImages = made.slice(-2).map(item => item.canvas)
    expect(gemImages.every(img => frame.drawn.includes(img))).toBe(true)
    expect(frame.drawn.filter(img => gemImages.includes(img as HTMLCanvasElement)).length).toBe(110)
    drawFrame(frame.ctx, s, 1, assets)
    expect(made).toHaveLength(builtAtStartup)
  })
})
