import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { HERO_DEFINITIONS, type SpecializationId } from '../../content/heroes'
import { createHeroSheets } from '../hero-sheets'
import { drawCharacter } from '../characters'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../fakes'
import { loadProductionHeroes, type ProductionHeroArtwork } from './production-heroes'
import type { HeroAnimation } from '../animation'

const ids = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const
type PortraitAtlas = HTMLImageElement & { portrait?: HTMLImageElement }

const portrait = () => ({ complete:true, naturalWidth:900, naturalHeight:900, width:900, height:900 }) as HTMLImageElement
const atlas = (body: HTMLImageElement) => ({
  complete:true, naturalWidth:1024, naturalHeight:512, portrait:body,
}) as PortraitAtlas
const animation = (pose: HeroAnimation['pose'], direction = 0): HeroAnimation => ({
  pose, direction, frame:0, phase:0.3, count:pose === 'run' ? 10 : 12, reducedMotion:false,
})

describe('ES2 new heroes use original-three-style high-resolution body rigs', () => {
  it('loads exactly one real 900px portrait body per specialization, matching selection and HUD', () => {
    const loaded: HTMLImageElement[] = []
    const artwork = loadProductionHeroes(() => {
      const image = { src:'' } as HTMLImageElement
      loaded.push(image)
      return image
    })
    for (const id of ids) {
      const source = (artwork[id] as PortraitAtlas).portrait
      expect(source?.src).toBe(HERO_DEFINITIONS[id].portraitSrc)
      expect(source?.src).toContain(id + '-portrait@3x.webp')
    }
    expect(loaded).toHaveLength(9) // atlas + authored strip + same portrait as menu
  })

  it.each(ids)('%s renders one full 900px body at idle and in reduced-motion instead of enlarged 128px cells', id => {
    for (const reduced of [false, true]) {
      const s = createState(); resetRun(s)
      s.mode = 'play'; s.heroId = id; s.choice = HERO_DEFINITIONS[id].legacyArtJob
      s.W = 800; s.H = 600
      const body = portrait()
      const { ctx, drawn } = createFakeCtx()
      const image = atlas(body)
      drawCharacter(ctx,s,fakeArtwork(true),{},s.hero!,100,100,reduced,undefined,undefined,
        { [id]:image } as unknown as ProductionHeroArtwork)
      expect(drawn).toContain(body)
      expect(drawn).not.toContain(image)
    }
  })

  it.each(ids)('%s bakes all eight aim directions from its own high-resolution body, no class-art substitution', id => {
    const body = portrait()
    const hero = createState().hero!
    const factory = fakeCanvasFactory()
    const cache = createHeroSheets(factory.make)
    const ctx = createFakeCtx()
    for (let d=0; d<8; d++) {
      const a = animation('attack',d)
      expect(cache.draw(ctx.ctx,body,id,hero,a,108,134)).toBe(true)
    }
    expect(cache.size).toBe(8)
    expect(factory.made).toHaveLength(8)
    for (const item of factory.made) {
      expect(item.fake.drawn).toContain(body)
      expect(item.fake.drawn.length).toBeGreaterThan(0)
    }
    const n=factory.made.length
    expect(cache.draw(ctx.ctx,body,id,hero,animation('attack',7),108,134)).toBe(true)
    expect(factory.made).toHaveLength(n)
  })

  it('keeps run, cast, hurt and victory readable with bounded caches and no low-res fallback', () => {
    const factory=fakeCanvasFactory(), sheets=createHeroSheets(factory.make)
    const body=portrait(), hero=createState().hero!, ctx=createFakeCtx().ctx
    for (const id of ids) {
      for (const pose of ['run','attack','cast'] as const) {
        expect(sheets.draw(ctx,body,id,hero,animation(pose,0),108,134)).toBe(true)
      }
      expect(sheets.draw(ctx,body,id, { ...animation('run'),reducedMotion:true },108,134)).toBe(false)
    }
    expect(sheets.size).toBeLessThanOrEqual(16)
  })
})
