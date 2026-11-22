import { describe, expect, it } from 'vitest'
import {
  C104_HERO_ATLASES, PRODUCTION_HERO_SOURCES, drawProductionHeroFrame, heroBodyBox, isDirectionalHeroAtlas, productionHeroCellRect,
} from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const animation = (changes: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'idle', direction: 0, frame: 0, count: 8, phase: 0, reducedMotion: false,
  ...changes,
})
const HEROES = ['crimson-paladin', 'shadowblade', 'spirit-summoner'] as const
const loaded = (hero: (typeof HEROES)[number]) => {
  const atlas = C104_HERO_ATLASES[hero]
  return { complete: true, naturalWidth: atlas.width, naturalHeight: atlas.height } as HTMLImageElement
}

describe('c104 eight-direction production hero atlases', () => {
  it('loads each hero from its own verified c104 atlas, not the retired 128px 8dir grid', () => {
    expect(Object.keys(PRODUCTION_HERO_SOURCES).sort()).toEqual([...HEROES])
    for (const hero of HEROES) {
      expect(PRODUCTION_HERO_SOURCES[hero]).toContain(hero + '-c104-atlas@3x.webp')
      const atlas = C104_HERO_ATLASES[hero]
      expect(atlas.width).toBe(atlas.cell.width * atlas.columns)
      expect(atlas.height).toBe(atlas.cell.height * atlas.rows)
      expect(atlas.rows).toBe(16)
    }
    // Dimensions identify the decoded atlas at draw time, so they must be unique.
    expect(new Set(HEROES.map(h => `${C104_HERO_ATLASES[h].width}x${C104_HERO_ATLASES[h].height}`)).size).toBe(3)
  })

  it('maps all eight direction octants to their own authored row without mirroring', () => {
    for (const hero of HEROES) {
      const { cell } = C104_HERO_ATLASES[hero]
      for (let direction = 0; direction < 8; direction++) {
        expect(productionHeroCellRect(C104_HERO_ATLASES[hero], animation({ pose: 'run', direction })))
          .toEqual({ x: 0, y: direction * cell.height, width: cell.width, height: cell.height })
      }
    }
  })

  it('plays every authored run and action frame exactly once per cycle, never past the last frame', () => {
    for (const hero of HEROES) {
      const atlas = C104_HERO_ATLASES[hero]
      for (const [pose, section, count] of [['run', 0, 10], ['dash', 0, 10], ['attack', 1, 12], ['cast', 1, 12]] as const) {
        const columns = new Set<number>()
        for (let frame = 0; frame < count; frame++) {
          const r = productionHeroCellRect(atlas, animation({ pose, frame, count, direction: 2 }))!
          expect(r.y, `${hero} ${pose}`).toBe((atlas.sections[section]!.rowOffset + 2) * atlas.cell.height)
          columns.add(r.x / atlas.cell.width)
        }
        expect([...columns].sort((a, b) => a - b), `${hero} ${pose}`)
          .toEqual(Array.from({ length: atlas.sections[section]!.frames }, (_, i) => i))
      }
    }
  })

  it('holds the first run frame for idle and reduced motion, and leaves hurt/death/victory to the fallback', () => {
    const atlas = C104_HERO_ATLASES.shadowblade
    expect(productionHeroCellRect(atlas, animation({ pose: 'idle', frame: 5, direction: 4 }))!.x).toBe(0)
    expect(productionHeroCellRect(atlas, animation({ pose: 'attack', frame: 9, count: 12, direction: 4, reducedMotion: true })))
      .toEqual({ x: 0, y: 4 * atlas.cell.height, width: atlas.cell.width, height: atlas.cell.height })
    for (const pose of ['hurt', 'death', 'victory'] as const) {
      expect(productionHeroCellRect(atlas, animation({ pose }))).toBeNull()
    }
  })

  it('scales the authored body to the original hero height with feet on the unchanged ground point', () => {
    for (const hero of HEROES) {
      const calls: number[][] = []
      const ctx = { drawImage: (_: unknown, ...args: number[]) => calls.push(args) } as unknown as Ctx2D
      const atlas = C104_HERO_ATLASES[hero]
      expect(drawProductionHeroFrame(ctx, loaded(hero), animation({ pose: 'run' }), 108, 134)).toBe(true)
      const [, , sw, sh, dx, dy, dw, dh] = calls[0]!
      expect([sw, sh]).toEqual([atlas.cell.width, atlas.cell.height])
      const k = dh! / sh!
      expect(dw! / sw!).toBeCloseTo(k)
      expect(atlas.bodyHeight * k).toBeCloseTo(134 * 0.977)
      expect(dy! + atlas.cell.baseline * k).toBeCloseTo(4)
      expect(dx! + atlas.cell.anchorX * k).toBeCloseTo(0)
    }
  })

  it('frames DOM portraits/previews inside one atlas cell, never a neighbouring frame', () => {
    for (const hero of HEROES) {
      const atlas = C104_HERO_ATLASES[hero]
      for (const row of [2, 10]) {
        const box = heroBodyBox(atlas, row)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.side).toBeLessThanOrEqual(atlas.cell.width)
        expect(box.y).toBeGreaterThanOrEqual(row * atlas.cell.height)
        expect(box.y + box.side).toBeLessThanOrEqual((row + 1) * atlas.cell.height)
      }
    }
  })

  it('rejects unloaded, retired 1024×512 and unknown images so the fallback draws', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const sheet = loaded('spirit-summoner')
    expect(isDirectionalHeroAtlas(sheet)).toBe(true)
    for (const image of [{ ...sheet, complete: false }, { ...sheet, naturalWidth: 1024, naturalHeight: 512 }]) {
      expect(isDirectionalHeroAtlas(image as HTMLImageElement)).toBe(false)
      expect(drawProductionHeroFrame(ctx, image as HTMLImageElement, animation(), 108, 134)).toBe(false)
    }
    expect(drawProductionHeroFrame(ctx, sheet, animation({ pose: 'death' }), 108, 134)).toBe(false)
    expect(calls).toHaveLength(0)
  })
})
