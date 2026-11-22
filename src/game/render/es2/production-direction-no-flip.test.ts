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

  it('preserves facing mirroring on the legacy fallback for unillustrated death states', () => {
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
    expect(drawn).not.toContain(atlas)
    expect(calls).toContain('scale')
  })
})
