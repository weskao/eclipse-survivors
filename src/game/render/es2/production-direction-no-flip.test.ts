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

  it('mirrors only the 900px portrait when attacking a left octant, even if the movement facing lags', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    s.heroId = 'shadowblade'
    s.choice = 'knight'
    s.hero!.face = 1
    s.hero!.strike = 0.22
    s.hero!.aimAngle = Math.PI
    s.W = 800; s.H = 600
    const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900 } as HTMLImageElement
    const { ctx, calls, drawn } = createFakeCtx()
    drawCharacter(ctx, s, fakeArtwork(true), {}, s.hero!, 100, 100, false, undefined, undefined,
      { shadowblade: portrait } as unknown as ProductionHeroArtwork)
    expect(drawn).toContain(portrait)
    expect(calls).toContain('scale')
  })

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
