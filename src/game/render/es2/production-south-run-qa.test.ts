import { describe, expect, it } from 'vitest'
import { drawProductionHeroFrame, loadProductionHeroes, productionHeroSouthRunRect, PRODUCTION_HERO_SOUTH_RUN_SOURCES } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const makeAnim = (overrides: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'run', direction: 2, frame: 0, count: 10, phase: 0, reducedMotion: false, ...overrides,
})

describe('three-hero south-run gameplay QA (never default production)', () => {
  it('uses the three real committed 2x2 WebP candidates, not generated placeholders', () => {
    expect(Object.keys(PRODUCTION_HERO_SOUTH_RUN_SOURCES).sort()).toEqual([
      'crimson-paladin', 'shadowblade', 'spirit-summoner',
    ])
    for (const [hero, src] of Object.entries(PRODUCTION_HERO_SOUTH_RUN_SOURCES)) {
      expect(src).toContain(hero + '/candidates/south-2026-11-23/')
      expect(src).toContain('run-south-4frames@3x.webp')
    }
  })

  it('samples exactly the four 768px cells and no adjacent pose', () => {
    for (let index = 0; index < 4; index++) {
      expect(productionHeroSouthRunRect(makeAnim({ frame: index, count: 4 })))
        .toEqual({ x: (index % 2) * 768, y: Math.floor(index / 2) * 768, size: 768 })
    }
    for (const other of [
      { direction: 0 }, { direction: 7 }, { pose: 'attack' as const }, { reducedMotion: true },
    ]) expect(productionHeroSouthRunRect(makeAnim(other))).toBeNull()
  })

  it('loads candidate South atlas lazily only when QA is opted in and draws an isolated cell', () => {
    const images: Array<HTMLImageElement & { src: string }> = []
    const makeImage = (): HTMLImageElement => {
      const next = { src: '', complete: true, naturalWidth: images.length < 3 ? 900 : 1536,
        naturalHeight: images.length < 3 ? 900 : 1536 } as HTMLImageElement & { src: string }
      images.push(next)
      return next
    }
    const heroes = loadProductionHeroes(makeImage, true)
    expect(images).toHaveLength(3)
    const calls: unknown[][] = []
    const ctx = { save: () => {}, restore: () => {},
      drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const hero = heroes.shadowblade
    expect(drawProductionHeroFrame(ctx, hero, makeAnim({ frame: 5 }), 117, 147)).toBe(true)
    expect(images).toHaveLength(4)
    expect(images[3]?.src).toContain('run-south-4frames@3x.webp')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.slice(1, 5)).toEqual([0, 768, 768, 768])
    expect(Number(calls[0]?.[8])).toBeGreaterThan(147)
    calls.length = 0
    drawProductionHeroFrame(ctx, hero, makeAnim({ frame: 6 }), 117, 147)
    expect(images).toHaveLength(4)
    expect(calls).toHaveLength(1)
  })

  it('never loads QA images when disabled', () => {
    const images: HTMLImageElement[] = []
    const heroes = loadProductionHeroes(() => {
      const image = { src: '' } as HTMLImageElement
      images.push(image)
      return image
    }, false)
    expect(images).toHaveLength(3)
    expect((heroes.shadowblade as HTMLImageElement & { qaSouthRunUrl?: string }).qaSouthRunUrl).toBeUndefined()
  })
})
