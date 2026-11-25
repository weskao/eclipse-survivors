import { describe, expect, it } from 'vitest'
import { createHeroSheets } from '../hero-sheets'
import { createFakeCtx, fakeCanvasFactory } from '../fakes'
import { drawProductionHeroFrame, PRODUCTION_HERO_SOURCES } from './production-heroes'
import type { HeroAnimation } from '../animation'

function animation(pose: HeroAnimation['pose'], direction = 0, reducedMotion = false): HeroAnimation {
  return { pose, direction, reducedMotion, frame: 3, count: pose === 'run' ? 10 : 12, phase: 0.4 }
}

const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900 } as HTMLImageElement

describe('ES2 new heroes match the original high-resolution, cached-illustration pipeline', () => {
  it('uses one authored 3x character illustration per specialization in all combat states', () => {
    for (const [id, url] of Object.entries(PRODUCTION_HERO_SOURCES)) {
      expect(url, id).toContain(id + '-portrait@3x.webp')
      expect(url, id).not.toContain('8dir')
    }
  })

  it('draws the original 900px source even when stationary, hurt, or in reduced motion', () => {
    for (const pose of ['idle', 'hurt', 'death', 'victory', 'cast'] as const) {
      const args: unknown[][] = []
      const ctx = { drawImage: (...draw: unknown[]) => args.push(draw), save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {} } as never
      expect(drawProductionHeroFrame(ctx, portrait, animation(pose, 5, true), 117, 147)).toBe(true)
      expect(args.length).toBeGreaterThan(0)
      expect(args.every(draw => draw[0] === portrait && draw[3] === 900 && draw[4] === 900)).toBe(true)
    }
  })

  it('bakes each run or attack frame at 3x once per direction, reusing the cached Canvas sequence', () => {
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const { ctx, drawn } = createFakeCtx()
    const a = animation('attack', 4)
    expect(sheets.drawSpecialization(ctx, portrait, a, 117, 147)).toBe(true)
    const made = factory.made.length
    expect(made).toBe(a.count)
    expect(factory.made.every(frame => frame.canvas.width >= 117 * 3 && frame.canvas.height >= 147 * 3)).toBe(true)
    expect(drawn.at(-1)).toBe(factory.made[a.frame]?.canvas)
    expect(sheets.drawSpecialization(ctx, portrait, a, 117, 147)).toBe(true)
    expect(factory.made.length).toBe(made)
    // The portrait has only one authored view; direction changes must reuse
    // the same generated frames instead of allocating eight identical copies.
    expect(sheets.drawSpecialization(ctx, portrait, animation('attack', 3), 117, 147)).toBe(true)
    expect(factory.made.length).toBe(made)
  })

  it('does not allocate a sheet during reduced motion and never draws an unrelated legacy knight', () => {
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const { ctx, drawn } = createFakeCtx()
    expect(sheets.drawSpecialization(ctx, portrait, animation('run', 7, true), 111, 144)).toBe(true)
    expect(factory.made.length).toBe(0)
    expect(drawn).toContain(portrait)
  })

  it('rejects unloaded or malformed images instead of showing another hero', () => {
    const { ctx, drawn } = createFakeCtx()
    expect(drawProductionHeroFrame(ctx, { ...portrait, complete: false } as HTMLImageElement, animation('idle'), 117, 147)).toBe(false)
    expect(drawProductionHeroFrame(ctx, { ...portrait, naturalHeight: 128 } as HTMLImageElement, animation('idle'), 117, 147)).toBe(false)
    expect(drawn).toHaveLength(0)
  })
})
