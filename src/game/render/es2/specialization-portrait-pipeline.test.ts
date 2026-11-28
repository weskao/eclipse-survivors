import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { HERO_DEFINITIONS, type SpecializationId } from '../../content/heroes'
import { createHeroSheets } from '../hero-sheets'
import { drawCharacter } from '../characters'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../fakes'
import { loadProductionHeroes, PRODUCTION_HERO_SOURCES, type ProductionHeroArtwork } from './production-heroes'
import type { HeroAnimation } from '../animation'

const ids = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const
const source = () => ({ complete: true, naturalWidth: 900, naturalHeight: 900 }) as HTMLImageElement
const animation = (pose: HeroAnimation['pose'], direction = 0): HeroAnimation => ({
  pose, direction, frame: 2, phase: 0.3, count: pose === 'run' ? 10 : 12, reducedMotion: false,
})

function drawHero(id: SpecializationId, portrait: HTMLImageElement, reduced = false): ReturnType<typeof createFakeCtx> {
  const s = createState()
  resetRun(s)
  s.mode = 'play'
  s.heroId = id
  s.choice = HERO_DEFINITIONS[id].legacyArtJob
  s.W = 800; s.H = 600
  const result = createFakeCtx()
  const originalArt = fakeArtwork(true)
  drawCharacter(result.ctx, s, originalArt, {}, s.hero!, 100, 100,
    reduced, undefined, undefined, { [id]: portrait } as unknown as ProductionHeroArtwork)
  expect(result.drawn).toContain(portrait)
  expect(result.drawn).not.toContain(originalArt.knight)
  expect(result.drawn).not.toContain(originalArt.ranger)
  expect(result.drawn).not.toContain(originalArt.wizard)
  return result
}

describe('ES2 new heroes share the original three heroes\' source-illustration + generated-motion architecture', () => {
  it('loads one distinct real 900px portrait per specialization, shared with selection and HUD', () => {
    const created: HTMLImageElement[] = []
    const art = loadProductionHeroes(() => {
      const image = { src: '' } as HTMLImageElement
      created.push(image)
      return image
    })
    for (const id of ids) {
      expect(art[id].src).toBe(HERO_DEFINITIONS[id].portraitSrc)
      expect(art[id].src).toBe(PRODUCTION_HERO_SOURCES[id])
      expect(art[id].src).toContain(id + '-portrait@3x.webp')
    }
    expect(created).toHaveLength(3)
  })

  it.each(ids)('%s draws the same full-resolution character in regular and reduced motion', id => {
    const portrait = source()
    drawHero(id, portrait)
    drawHero(id, portrait, true)
  })

  it.each(ids)('%s never reflects the canonical fallback when facing west in the scene', id => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    s.heroId = id
    s.choice = HERO_DEFINITIONS[id].legacyArtJob
    s.W = 800; s.H = 600
    s.hero!.face = -1
    const portrait = source()
    const result = createFakeCtx()
    const flips: number[] = []
    result.ctx.scale = (x: number) => { if (x < 0) flips.push(x) }
    drawCharacter(result.ctx, s, fakeArtwork(true), {}, s.hero!, 100, 100,
      false, undefined, undefined, { [id]: portrait } as unknown as ProductionHeroArtwork)
    expect(result.drawn).toContain(portrait)
    expect(flips).toEqual([])
  })

  it.each(ids)('%s caches 3x attack/cast sequences and walks run live from the same source', () => {
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const image = source()
    const ctx = createFakeCtx()
    for (const pose of ['run', 'attack', 'cast'] as const) {
      expect(sheets.drawSpecialization(ctx.ctx, image, animation(pose), 108, 134)).toBe(true)
      if (pose === 'run') expect(ctx.drawn.filter(x => x === image).length).toBeGreaterThan(1)
    }
    expect(sheets.size).toBe(2)
    expect(factory.made.every(x => x.canvas.width >= 324 && x.canvas.height >= 402)).toBe(true)
    expect(factory.made.some(x => x.fake.drawn.includes(image))).toBe(true)
  })

  it('supports all eight aim octants without 128px upscaling or eight duplicate frame buffers', () => {
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const portrait = source()
    const draw = createFakeCtx()
    for (let direction = 0; direction < 8; direction++) {
      expect(sheets.drawSpecialization(draw.ctx, portrait, animation('attack', direction), 108, 134)).toBe(true)
    }
    expect(sheets.size).toBe(1)
    expect(factory.made).toHaveLength(12)
    expect(factory.made.every(x => x.fake.drawn.includes(portrait))).toBe(true)
  })

  it('keeps the portrait cache bounded and never allocates extra frames in reduced motion', () => {
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const portrait = source()
    const draw = createFakeCtx()
    for (const pose of ['run', 'attack', 'cast', 'dash'] as const) {
      expect(sheets.drawSpecialization(draw.ctx, portrait, animation(pose), 108, 134)).toBe(true)
    }
    const count = factory.made.length
    expect(sheets.drawSpecialization(draw.ctx, portrait,
      { ...animation('run', 7), reducedMotion: true }, 108, 134)).toBe(true)
    expect(factory.made).toHaveLength(count)
    expect(sheets.size).toBeLessThanOrEqual(4)
    expect(draw.drawn).toContain(portrait)
  })
})
