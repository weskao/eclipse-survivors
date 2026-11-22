import { describe, expect, it } from 'vitest'
import { productionHeroFrame, drawProductionHeroFrame, PRODUCTION_HERO_SOURCES } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const animation = (overrides: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'idle', frame: 0, count: 8, phase: 0, direction: 0, reducedMotion: false,
  ...overrides,
})

describe('ES2 real hero spritesheet selection', () => {
  it('binds exactly three canonical, independent local WebP assets', () => {
    expect(Object.keys(PRODUCTION_HERO_SOURCES).sort()).toEqual(['crimson-paladin', 'shadowblade', 'spirit-summoner'])
    expect(new Set(Object.values(PRODUCTION_HERO_SOURCES)).size).toBe(3)
    for (const url of Object.values(PRODUCTION_HERO_SOURCES)) expect(url).toMatch(/\.webp($|\?)/)
  })

  it('uses 96px frames with release/recovery after projectile creation, not a ghost windup', () => {
    expect(productionHeroFrame(animation())).toBe(0)
    expect(productionHeroFrame(animation({ pose: 'run', frame: 3 }))).toBe(1)
    expect(productionHeroFrame(animation({ pose: 'attack', phase: 0.02, actionStage: 'release' }))).toBe(2)
    expect(productionHeroFrame(animation({ pose: 'cast', phase: 0.92, actionStage: 'recover' }))).toBe(3)
    expect(productionHeroFrame(animation({ pose: 'dash' }))).toBe(1)
    expect(productionHeroFrame(animation({ pose: 'attack', frame: 9, reducedMotion: true }))).toBe(0)
  })

  it('draws one cropped frame from a decoded local image and falls back until loaded', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const source = { complete: true, naturalWidth: 384, naturalHeight: 96 } as HTMLImageElement
    expect(drawProductionHeroFrame(ctx, source, animation({ pose: 'attack', phase: 0 }), 108, 134)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.slice(1, 5)).toEqual([192, 0, 96, 96])
    expect(drawProductionHeroFrame(ctx, { ...source, complete: false } as HTMLImageElement, animation(), 108, 134)).toBe(false)
    expect(calls).toHaveLength(1)
  })
})
