import { describe, expect, it } from 'vitest'
import { drawProductionHeroFrame, loadProductionHeroes, productionHeroSouthRunRect, productionHeroQAEastRect, PRODUCTION_HERO_SOUTH_RUN_SOURCES } from './production-heroes'
import { HERO_DIAGONAL_RUN_ATLASES, HERO_NORTHERN_RUN_ATLASES } from './hero-candidate-atlas'
import { sampleHeroAnimation, type HeroAnimation } from '../animation'
import { createHero, createState } from '../../state'
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
      const folder = hero === 'spirit-summoner' ? 'south-2026-11-24-mist-repair' : 'south-2026-11-24-batch-2'
      expect(src).toContain(hero + '/candidates/' + folder + '/')
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
    // Frame 2 uses its measured opaque bottom (665px), not the old approximate 670.5px.
    expect(Number(calls[0]?.[6])).toBeCloseTo(4 - 147 * 665 / 627)
    expect(768 / Number(calls[0]?.[8])).toBeGreaterThanOrEqual(3)
    calls.length = 0
    drawProductionHeroFrame(ctx, hero, makeAnim({ frame: 6 }), 117, 147)
    expect(images).toHaveLength(4)
    expect(calls).toHaveLength(1)
  })


  it('maps 9 East run / attack / special candidate clips without changing 8-way fallback', () => {
    expect(productionHeroQAEastRect(makeAnim({ direction: 0, pose: 'run', frame: 2, count: 4 })))
      .toEqual({ pose: 'run', rect: { x: 0, y: 704, size: 704 } })
    expect(productionHeroQAEastRect(makeAnim({ direction: 0, pose: 'cast', phase: 0.75, special: true })))
      .toEqual({ pose: 'special', rect: { x: 704, y: 704, size: 704 } })
    expect(productionHeroQAEastRect(makeAnim({ direction: 0, pose: 'attack', phase: 0.25 })))
      .toEqual({ pose: 'attack', rect: { x: 704, y: 0, size: 704 } })
    expect(productionHeroQAEastRect(makeAnim({ direction: 4 }))).toBeNull()
    expect(productionHeroQAEastRect(makeAnim({ direction: 6 }))).toBeNull()
    expect(productionHeroQAEastRect(makeAnim({ direction: 0, reducedMotion: true }))).toBeNull()
  })

  it('decodes East candidate atlas only for selected pose in real Canvas QA, not eagerly', () => {
    const images: HTMLImageElement[] = []
    const makeImage = () => {
      const next = {
        src: '', complete: true,
        get naturalWidth() { return this.src.includes('/east-2026-11-23/') ? 1408 : 900 },
        get naturalHeight() { return this.src.includes('/east-2026-11-23/') ? 1408 : 900 },
      } as HTMLImageElement
      images.push(next)
      return next
    }
    const heroes = loadProductionHeroes(makeImage, true)
    expect(images).toHaveLength(3)
    const calls: unknown[][] = []
    const ctx = { save: () => {}, restore: () => {},
      drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const anim = makeAnim({ direction: 0, pose: 'attack', phase: .75 })
    expect(drawProductionHeroFrame(ctx, heroes['crimson-paladin'], anim, 117, 147)).toBe(true)
    expect(images).toHaveLength(4)
    expect(images[3]?.src).toContain('/east-2026-11-23/attack-east-4frames')
    expect(calls[0]?.slice(1, 5)).toEqual([704, 704, 704, 704])
    calls.length = 0
    drawProductionHeroFrame(ctx, heroes['crimson-paladin'], anim, 117, 147)
    expect(images).toHaveLength(4)
    expect(calls).toHaveLength(1)
  })

  it('draws independent SE and SW atlases for each hero with exact source cells and anchors', () => {
    const images: HTMLImageElement[] = []
    const heroes = loadProductionHeroes(() => {
      const image = { src: '', complete: true,
        get naturalWidth() { return this.src.includes('4frames@3x.webp') ? 1536 : 900 },
        get naturalHeight() { return this.naturalWidth },
      } as HTMLImageElement
      images.push(image)
      return image
    }, true)
    expect(images).toHaveLength(3)
    for (const clip of HERO_DIAGONAL_RUN_ATLASES) {
      const calls: unknown[][] = []
      const ctx = { save: () => {}, restore: () => {}, drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      const direction = clip.direction === 'SE' ? 1 : 3
      const count = images.length
      for (let frame = 0; frame < 4; frame++) {
        expect(drawProductionHeroFrame(ctx, heroes[clip.hero], makeAnim({ direction, frame, count: 4 }), 117, 147)).toBe(true)
        expect(calls[frame]?.slice(1, 5)).toEqual([(frame % 2) * 768, Math.floor(frame / 2) * 768, 768, 768])
        expect(Number(calls[frame]?.[6])).toBeCloseTo(4 - 147 * clip.footBottoms[frame]! / 627)
        expect((calls[frame]?.[0] as HTMLImageElement).src).toBe(clip.url)
      }
      expect(images).toHaveLength(count + 1)
    }
  })

  it('draws each eligible northern atlas on its own facing and all four exact cells', () => {
    const images: HTMLImageElement[] = []
    const heroes = loadProductionHeroes(() => {
      const image = { src: '', complete: true,
        get naturalWidth() { return this.src.includes('4frames@3x.webp') ? 1536 : 900 },
        get naturalHeight() { return this.naturalWidth },
      } as HTMLImageElement
      images.push(image)
      return image
    }, true)
    expect(images).toHaveLength(3)
    const facing = { NW: 5, N: 6, NE: 7 } as const
    for (const clip of HERO_NORTHERN_RUN_ATLASES) {
      const calls: unknown[][] = []
      const ctx = { save: () => {}, restore: () => {}, drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      const count = images.length
      for (let frame = 0; frame < 4; frame++) {
        expect(drawProductionHeroFrame(ctx, heroes[clip.hero], makeAnim({ direction: facing[clip.direction], frame, count: 4 }), 117, 147)).toBe(true)
        expect(calls[frame]?.slice(1, 5)).toEqual([(frame % 2) * 768, Math.floor(frame / 2) * 768, 768, 768])
        expect(Number(calls[frame]?.[6])).toBeCloseTo(4 - 147 * clip.footBottoms[frame]! / 627)
        expect((calls[frame]?.[0] as HTMLImageElement).src).toBe(clip.url)
      }
      expect(images).toHaveLength(count + 1)
    }
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
    expect((heroes.shadowblade as HTMLImageElement & { qaDiagonalSources?: unknown }).qaDiagonalSources).toBeUndefined()
  })
})

describe('explicitly permitted horizontal candidate reuse', () => {
  it('reuses the same Shadowblade East run image and crop for West, flipping only Canvas', () => {
    const images: HTMLImageElement[] = []
    const heroes = loadProductionHeroes(() => {
      const image = { src: '', complete: true,
        get naturalWidth() { return this.src.includes('/east-2026-11-23/') ? 1408 : 900 },
        get naturalHeight() { return this.naturalWidth },
      } as HTMLImageElement
      images.push(image)
      return image
    }, true)
    const draws: unknown[][] = [], scales: number[][] = []
    const ctx = { save: () => {}, restore: () => {},
      scale: (...args: number[]) => scales.push(args),
      drawImage: (...args: unknown[]) => draws.push(args) } as unknown as Ctx2D
    drawProductionHeroFrame(ctx, heroes.shadowblade, makeAnim({ direction: 0, frame: 2, count: 4 }), 117, 147)
    drawProductionHeroFrame(ctx, heroes.shadowblade, makeAnim({ direction: 4, frame: 2, count: 4 }), 117, 147)
    expect(images).toHaveLength(4)
    expect(draws).toHaveLength(2)
    expect(draws[1]).toEqual(draws[0])
    expect(scales).toEqual([[-1, 1]])
  })

  it('does not substitute West attack, special, staff or sword/shield candidates', () => {
    const images: HTMLImageElement[] = []
    const heroes = loadProductionHeroes(() => {
      const image = { src: '', complete: true,
        get naturalWidth() { return this.src.includes('/east-2026-11-23/') ? 1408 : this.src.includes('run-attack@3x') ? 1792 : 900 },
        get naturalHeight() { return this.naturalWidth },
      } as HTMLImageElement
      images.push(image)
      return image
    }, true)
    const ctx = { save: () => {}, restore: () => {}, scale: () => {},
      drawImage: () => {}, translate: () => {}, rotate: () => {} } as unknown as Ctx2D
    for (const hero of [heroes['spirit-summoner'], heroes['crimson-paladin']]) {
      drawProductionHeroFrame(ctx, hero, makeAnim({ direction: 4 }), 117, 147)
    }
    // Verify the strict resolver also retains its existing East-only default.
    expect(productionHeroQAEastRect(makeAnim({ direction: 4, pose: 'attack' }))).toBeNull()
    expect(images.every(image => !image.src.includes('/candidates/'))).toBe(true)
  })
})

describe('Shadowblade real-state to Canvas continuity', () => {
  it('selects the velocity-facing candidate in all eight dash headings even after a different prior heading', () => {
    const state = createState()
    state.heroId = 'shadowblade'
    state.mode = 'play'
    state.hero = createHero('ranger')
    const hero = state.hero
    const images: HTMLImageElement[] = []
    const art = loadProductionHeroes(() => {
      const image = { src: '', complete: true,
        get naturalWidth() {
          return this.src.includes('/east-2026-11-23/') ? 1408 :
            this.src.includes('4frames@3x.webp') ? 1536 : 900
        },
        get naturalHeight() { return this.naturalWidth },
      } as HTMLImageElement
      images.push(image)
      return image
    }, true).shadowblade
    const names = ['east', 'se', 'south', 'sw', 'east', 'nw', 'n', 'ne']
    const draws: unknown[][] = [], scales: number[][] = []
    const ctx = { save: () => {}, restore: () => {}, scale: (...args: number[]) => scales.push(args),
      drawImage: (...args: unknown[]) => draws.push(args) } as unknown as Ctx2D
    for (let direction = 0; direction < 8; direction++) {
      hero.dash = 0
      hero.moveAmount = 1
      hero.vx = 100 * Math.cos((direction + 4) * Math.PI / 4)
      hero.vy = 100 * Math.sin((direction + 4) * Math.PI / 4)
      sampleHeroAnimation(state, hero)
      hero.dash = 0.11
      hero.vx = 100 * Math.cos(direction * Math.PI / 4)
      hero.vy = 100 * Math.sin(direction * Math.PI / 4)
      const anim = sampleHeroAnimation(state, hero)
      expect(anim).toMatchObject({ pose: 'dash', direction })
      draws.length = 0
      scales.length = 0
      expect(drawProductionHeroFrame(ctx, art, anim, 117, 147)).toBe(true)
      expect(draws).toHaveLength(1)
      expect((draws[0]?.[0] as HTMLImageElement).src).toContain('run-' + names[direction] + '-4frames@3x.webp')
      expect(scales).toEqual(direction === 4 ? [[-1, 1]] : [])
    }
    expect(images).toHaveLength(10) // three portraits and seven distinct run sources
    hero.vx = hero.vy = 0
    expect(sampleHeroAnimation(state, hero).direction).toBe(7)
  })

  it('never blends the previous facing or attack silhouette into a newly selected Shadowblade action', () => {
    const art = loadProductionHeroes(() => ({
      src: '', complete: true,
      get naturalWidth() { return this.src.includes('/east-2026-11-23/') ? 1408 :
        this.src.includes('4frames@3x.webp') ? 1536 : 900 },
      get naturalHeight() { return this.naturalWidth },
    }) as HTMLImageElement, true).shadowblade
    const draws: unknown[][] = [], scales: number[][] = []
    const ctx = { globalAlpha: 1, save: () => {}, restore: () => {},
      scale: (...args: number[]) => scales.push(args),
      drawImage: (...args: unknown[]) => draws.push(args) } as unknown as Ctx2D
    const draw = (anim: HeroAnimation, time: number) => {
      draws.length = scales.length = 0
      expect(drawProductionHeroFrame(ctx, art, anim, 117, 147, undefined, time)).toBe(true)
      expect(ctx.globalAlpha).toBe(1)
    }
    draw(makeAnim({ direction: 0 }), 1)
    draw(makeAnim({ direction: 4 }), 1.016)
    expect(draws).toHaveLength(1)
    expect(scales).toEqual([[-1, 1]])
    draw(makeAnim({ direction: 0, pose: 'attack', phase: .4 }), 1.032)
    expect(draws).toHaveLength(1)
    expect((draws[0]?.[0] as HTMLImageElement).src).toContain('attack-east-4frames')
    draw(makeAnim({ direction: 0, pose: 'cast', special: true, phase: .4 }), 1.048)
    expect(draws).toHaveLength(1)
    expect((draws[0]?.[0] as HTMLImageElement).src).toContain('special-east-4frames')
  })
})
