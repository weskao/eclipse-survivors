import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { drawCharacter } from '../characters'
import { createFakeCtx, fakeArtwork } from '../fakes'
import type { ProductionHeroArtwork } from './production-heroes'

describe('authoritative eight-direction atlas, no accidental face mirroring', () => {
  it('draws a decoded left-facing atlas directly without Canvas scale(-1, 1)', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    s.heroId = 'shadowblade'
    s.hero!.face = -1
    s.W = 800; s.H = 600
    const atlas = { complete: true, naturalWidth: 1024, naturalHeight: 512 } as HTMLImageElement
    const { ctx, calls, drawn } = createFakeCtx()
    drawCharacter(ctx, s, fakeArtwork(true), {}, s.hero!, 100, 100, false, undefined, undefined,
      { shadowblade: atlas } as unknown as ProductionHeroArtwork)
    expect(drawn).toContain(atlas)
    expect(calls).not.toContain('scale')
  })

  // The canonical portrait bakes in asymmetric equipment. The only current
  // approved reflection is the separate Shadowblade E-to-W run QA atlas,
  // not a portrait or attack/cast. Keep the loading fallback unmirrored.
  it.each(['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const)(
    '%s preserves the canonical portrait when attacking a left octant while directional art is loading', heroId => {
      const s = createState()
      resetRun(s)
      s.mode = 'play'
      s.heroId = heroId
      s.choice = heroId === 'spirit-summoner' ? 'wizard' : 'knight'
      s.hero!.face = 1
      s.hero!.strike = 0.22
      s.hero!.aimAngle = Math.PI
      s.W = 800; s.H = 600
      const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900 } as HTMLImageElement
      const { ctx, calls, drawn } = createFakeCtx()
      drawCharacter(ctx, s, fakeArtwork(true), {}, s.hero!, 100, 100, false, undefined, undefined,
        { [heroId]: portrait } as unknown as ProductionHeroArtwork)
      expect(drawn).toContain(portrait)
      expect(calls).not.toContain('scale')
    },
  )

  it('holds the authored atlas, unmirrored, for unillustrated death states instead of the legacy rig', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    s.heroId = 'shadowblade'
    s.hero!.face = -1
    s.hero!.hp = 0
    s.W = 800; s.H = 600
    const atlas = { complete: true, naturalWidth: 1024, naturalHeight: 512 } as HTMLImageElement
    const { ctx, calls, drawn } = createFakeCtx()
    drawCharacter(ctx, s, fakeArtwork(true), {}, s.hero!, 100, 100, false, undefined, undefined,
      { shadowblade: atlas } as unknown as ProductionHeroArtwork)
    expect(drawn).toContain(atlas)
    expect(calls).not.toContain('scale')
  })
})
