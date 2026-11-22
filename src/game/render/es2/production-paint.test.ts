import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import type { SpecializationId } from '../../content/heroes'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../fakes'
import { createRenderAssets, drawFrame } from '../index'

const art = () => {
  const image = { complete: true, naturalWidth: 900, naturalHeight: 900 } as HTMLImageElement
  return image
}

describe('Production hero sprites in actual game Canvas drawFrame', () => {
  for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const satisfies readonly SpecializationId[]) {
    it('renders the authored WebP for the selected live hero: ' + id, () => {
      const s = createState()
      resetRun(s)
      s.mode = 'play'
      s.heroId = id
      s.W = 800; s.H = 600
      s.hero!.strike = 0.1
      s.hero!.aimAngle = Math.PI / 3
      const factory = fakeCanvasFactory()
      const assets = createRenderAssets(fakeArtwork(true), factory.make)
      const sprites = { shadowblade: art(), 'spirit-summoner': art(), 'crimson-paladin': art() }
      assets.productionHeroes = sprites
      const { ctx, drawn } = createFakeCtx()
      drawFrame(ctx, s, 1, assets)
      expect(factory.made.some(entry => entry.fake.drawn.includes(sprites[id]))).toBe(true)
      expect(factory.made.some(entry => drawn.includes(entry.canvas))).toBe(true)
      // Canvas samples all 900 source pixels and uses a cached 3x generated frame.
    })
  }

  it('retains the full sharp character illustration in reduced-motion mode', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    s.heroId = 'spirit-summoner'
    s.W = 800; s.H = 600
    s.hero!.strike = 0.2
    const factory = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), factory.make)
    const portrait = art()
    assets.productionHeroes = { 'spirit-summoner': portrait } as never
    assets.prefersReducedMotion = () => true
    const { ctx, drawn } = createFakeCtx()
    drawFrame(ctx, s, 1, assets)
    expect(drawn).toContain(portrait)
    expect(factory.made.some(entry => entry.fake.drawn.includes(portrait))).toBe(false)
  })

  it('preserves original character art when an original hero is selected', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    s.heroId = 'knight'
    s.W = 800; s.H = 600
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const newSprites = { shadowblade: art(), 'spirit-summoner': art(), 'crimson-paladin': art() }
    assets.productionHeroes = newSprites
    const { ctx, drawn } = createFakeCtx()
    drawFrame(ctx, s, 1, assets)
    for (const sprite of Object.values(newSprites)) expect(drawn).not.toContain(sprite)
  })
})
