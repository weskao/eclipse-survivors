import { describe, expect, it } from 'vitest'
import { drawProductionHeroFrame, loadProductionHeroes, productionHeroActionFrame, PRODUCTION_HERO_ACTION_SOURCES } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const animation = (overrides: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'idle', frame: 0, count: 8, phase: 0, direction: 0, reducedMotion: false, ...overrides,
})

type AtlasWithAction = HTMLImageElement & { actionStrip?: HTMLImageElement }

describe('ES2 archived motion strips and legacy eight-direction fallback', () => {
  it('loads the canonical 3x homepage portrait for all three specializations', () => {
    expect(Object.keys(PRODUCTION_HERO_ACTION_SOURCES).sort()).toEqual(['crimson-paladin', 'shadowblade', 'spirit-summoner'])
    const built = loadProductionHeroes(() => ({ src: '' }) as HTMLImageElement)
    for (const id of ['shadowblade','spirit-summoner','crimson-paladin'] as const) {
      expect((built[id] as AtlasWithAction).src).toContain(id + '-portrait@3x.webp')
      expect((built[id] as AtlasWithAction).actionStrip).toBeUndefined()
    }
  })

  it('selects all eight isolated 448px cells in the authored right-facing running/attack sequence', () => {
    const frame = productionHeroActionFrame
    expect([0,1,2,3,4,5,6,7]).toEqual([
      frame(animation({pose:'run',frame:0})),
      frame(animation({pose:'run',frame:1})),
      frame(animation({pose:'run',frame:2})),
      frame(animation({pose:'attack',phase:0})),
      frame(animation({pose:'attack',phase:0.21})),
      frame(animation({pose:'attack',phase:0.41})),
      frame(animation({pose:'cast',phase:0.61})),
      frame(animation({pose:'cast',phase:0.99})),
    ])
  })

  it('uses new side-facing action images but preserves authentic atlas artwork for the other seven directions', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const actionStrip = { complete: true, naturalWidth: 3584, naturalHeight: 448 } as HTMLImageElement
    const atlas = { complete: true, naturalWidth: 1024, naturalHeight: 512, actionStrip } as AtlasWithAction
    expect(drawProductionHeroFrame(ctx,atlas,animation({ pose:'attack',direction:0,phase:0.61 }),108,134)).toBe(true)
    expect(calls.at(-1)?.[0]).toBe(actionStrip)
    expect(calls.at(-1)?.slice(1,5)).toEqual([6*448,0,448,448])
    expect(drawProductionHeroFrame(ctx,atlas,animation({ pose:'attack',direction:4,phase:0.61 }),108,134)).toBe(true)
    expect(calls.at(-1)?.[0]).toBe(atlas)
    expect(calls.at(-1)?.slice(1,5)).toEqual([512,256,128,128])
  })

  it('falls back to authentic eight-direction atlas when the new action image is undecoded or motion is reduced', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const actionStrip = { complete:false, naturalWidth:0, naturalHeight:0 } as HTMLImageElement
    const atlas = { complete:true, naturalWidth:1024, naturalHeight:512, actionStrip } as AtlasWithAction
    expect(drawProductionHeroFrame(ctx,atlas,animation({ pose:'attack',direction:0,phase:0.61 }),108,134)).toBe(true)
    expect(calls.at(-1)?.[0]).toBe(atlas)
    atlas.actionStrip = { complete:true, naturalWidth:3584, naturalHeight:448 } as HTMLImageElement
    expect(drawProductionHeroFrame(ctx,atlas,animation({pose:'attack',direction:0,reducedMotion:true}),108,134)).toBe(true)
    expect(calls.at(-1)?.[0]).toBe(atlas)
  })
})
