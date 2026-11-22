import { describe, expect, it } from 'vitest'
import { PRODUCTION_HERO_SOURCES, productionHeroDirectionRect, drawProductionHeroFrame } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const animation = (changes: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'idle', direction: 0, frame: 0, count: 8, phase: 0, reducedMotion: false,
  ...changes,
})

describe('real eight-direction production hero atlases', () => {
  it('loads a different 8×4 atlas for each new hero, not a report screenshot or legacy 4-strip', () => {
    expect(Object.keys(PRODUCTION_HERO_SOURCES).sort())
      .toEqual(['crimson-paladin', 'shadowblade', 'spirit-summoner'])
    expect(new Set(Object.values(PRODUCTION_HERO_SOURCES)).size).toBe(3)
    for (const [hero, url] of Object.entries(PRODUCTION_HERO_SOURCES)) {
      expect(url, hero).toContain(hero + '-8dir@3x.webp')
    }
  })

  it('maps all eight authoritative direction octants without horizontal mirroring', () => {
    for (let direction = 0; direction < 8; direction++) {
      expect(productionHeroDirectionRect(animation({ direction })))
        .toEqual({ x: direction * 128, y: 0, width: 128, height: 128 })
    }
  })

  it('selects correct independent poses without sampling adjacent rows or columns', () => {
    for (const [pose, row] of [['idle',0],['run',1],['dash',1],['attack',2],['cast',3]] as const) {
      expect(productionHeroDirectionRect(animation({ pose, direction: 7 })))
        .toEqual({ x: 896, y: row * 128, width: 128, height: 128 })
    }
    expect(productionHeroDirectionRect(animation({ pose: 'attack', direction: 4, reducedMotion: true })))
      .toEqual({ x: 512, y: 0, width: 128, height: 128 })
  })

  it('keeps unsupported hurt/death/victory on the previously authored fallback sprite', () => {
    for (const pose of ['hurt','death','victory'] as const) {
      expect(productionHeroDirectionRect(animation({ pose }))).toBeNull()
    }
  })

  it('draws one full 128-pixel cell, and rejects unloaded, malformed and legacy-sized images appropriately', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const sheet = { complete: true, naturalWidth: 1024, naturalHeight: 512 } as HTMLImageElement
    expect(drawProductionHeroFrame(ctx, sheet, animation({pose:'cast',direction:6}),108,134)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.slice(1,5)).toEqual([768,384,128,128])
    expect(drawProductionHeroFrame(ctx,{...sheet,complete:false} as HTMLImageElement,animation(),108,134)).toBe(false)
    expect(drawProductionHeroFrame(ctx,{...sheet,naturalWidth:896} as HTMLImageElement,animation(),108,134)).toBe(false)
    expect(calls).toHaveLength(1)
  })
})
