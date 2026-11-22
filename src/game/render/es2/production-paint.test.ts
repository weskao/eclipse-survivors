import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import type { SpecializationId } from '../../content/heroes'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../fakes'
import { createRenderAssets, drawFrame } from '../index'

const art = () => {
  const image = { complete: true, naturalWidth: 384, naturalHeight: 96 } as HTMLImageElement
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
      const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
      const sprites = { shadowblade: art(), 'spirit-summoner': art(), 'crimson-paladin': art() }
      assets.productionHeroes = sprites
      const { ctx, drawn } = createFakeCtx()
      drawFrame(ctx, s, 1, assets)
      expect(drawn).toContain(sprites[id])
      // Originals are an explicit fallback only when the new asset isn't decoded.
    })
  }

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
