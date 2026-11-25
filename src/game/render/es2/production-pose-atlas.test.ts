import { describe, expect, it } from 'vitest'
import { drawProductionHeroFrame, loadProductionHeroes, productionHeroPoseRect, productionHeroMotionRect, productionHeroPoseReady, productionHeroFrameAnchor, PRODUCTION_HERO_POSE_SOURCES } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

function anim(overrides: Partial<HeroAnimation> = {}): HeroAnimation {
  return { pose: 'idle', direction: 0, frame: 0, count: 10, phase: 0, reducedMotion: false, ...overrides }
}
const ids = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const
function capture() {
  const calls: unknown[][] = []
  const ctx = { save: () => {}, restore: () => {}, scale: () => {}, translate: () => {},
    drawImage: (...args: unknown[]) => { calls.push(args) } } as unknown as Ctx2D
  return { ctx, calls }
}

describe('ES2 split 448px character 3x motion atlas mapping', () => {
  it('imports three separate local sheets per hero without loading them eagerly', () => {
    for (const id of ids) {
      const urls = PRODUCTION_HERO_POSE_SOURCES[id]
      expect(urls.direction).toContain(id + '/idle-ready@3x.webp')
      expect(urls.action).toContain(id + '/run-attack@3x.webp')
      expect(urls.special).toContain(id + '/special@3x.webp')
    }
    const images: HTMLImageElement[] = []
    const loaded = loadProductionHeroes(() => {
      const image = { src: '' } as HTMLImageElement
      images.push(image)
      return image
    })
    expect(images).toHaveLength(3)
    expect(Object.keys(loaded)).toEqual(ids)
  })

  it('uses the independent E/SE/S/SW/W/NW/N/NE facings for idle and reduced motion', () => {
    const columns = [0, 1, 2, 3, 4, 5, 6, 7]
    for (let direction = 0; direction < 8; direction++) {
      const rect = productionHeroPoseRect(anim({ direction, pose: 'idle' }))
      expect(rect).toEqual({ sheet: 'direction', x: (columns[direction]! % 4) * 448,
        y: Math.floor(columns[direction]! / 4) * 448, width: 448, height: 448, mirror: false })
      const reduced = productionHeroPoseRect(anim({ direction, pose: 'attack', reducedMotion: true }))
      expect(reduced).toEqual(rect)
    }
  })

  it('keeps non-cardinal actions facing the correct direction and never samples an unrelated run frame', () => {
    for (const direction of [1, 2, 3, 5, 6, 7]) {
      const rect = productionHeroPoseRect(anim({ direction, pose: 'run', frame: 9 }))
      const column = direction
      expect(rect.sheet).toBe('direction')
      expect([rect.x, rect.y]).toEqual([((column + 8) % 4) * 448, Math.floor((column + 8) / 4) * 448])
      expect(rect.mirror).toBe(false)
    }
  })

  it('never alternates between idle and guard frames while moving diagonally', () => {
    for (const direction of [1, 2, 3, 5, 6, 7]) {
      const actual = Array.from({ length: 10 }, (_, frame) =>
        productionHeroPoseRect(anim({ direction, pose: 'run', frame, count: 10 })))
      const first = actual[0]!
      expect(actual.every(({ sheet, x, y, mirror }) =>
        sheet === 'direction' && x === first.x && y === first.y && !mirror)).toBe(true)
    }
  })

  it('selects eight ordered run, attack and special frames at 448px without crossing cells', () => {
    for (let i = 0; i < 8; i++) {
      const running = productionHeroPoseRect(anim({ pose: 'run', direction: 0, frame: i, count: 8 }))
      expect(running.sheet).toBe('action')
      expect([running.x, running.y]).toEqual([(i % 4) * 448, Math.floor(i / 4) * 448])
      const attacking = productionHeroPoseRect(anim({ pose: 'attack', direction: 0, phase: (i + 0.01) / 8 }))
      expect(attacking.sheet).toBe('action')
      expect(attacking.mirror).toBe(false)
      expect([attacking.x, attacking.y]).toEqual([(i % 4) * 448, Math.floor((i + 8) / 4) * 448])
      const special = productionHeroPoseRect(anim({ pose: 'cast', direction: 0, phase: (i + 0.01) / 8, special: true }))
      expect(special.sheet).toBe('special')
      expect([special.x, special.y]).toEqual([(i % 4) * 448, Math.floor(i / 4) * 448])
    }
  })

  it('holds the independently authored west guard for unapproved production motion instead of swapping weapon hands', () => {
    for (const pose of ['run', 'dash', 'attack', 'cast'] as const) {
      for (const special of [false, true]) {
        const sample = anim({ pose, direction: 4, frame: 3, count: 8, phase: .5, special })
        expect(productionHeroPoseRect(sample)).toEqual({
          sheet: 'direction', x: 0, y: 1344, width: 448, height: 448, mirror: false,
        })
        expect(productionHeroMotionRect(sample)).toEqual({
          x: 0, y: 384, width: 384, height: 384, mirror: false,
        })
        for (const heroId of ids) {
          const direction = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
          const action = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
          const hero = { complete: true, naturalWidth: 900, naturalHeight: 900, heroId,
            poseAtlases: { direction, action, special: action } } as unknown as HTMLImageElement
          const { ctx, calls } = capture()
          expect(drawProductionHeroFrame(ctx, hero, sample, 117, 147)).toBe(true)
          expect(calls).toHaveLength(1)
          expect(calls[0]![0]).toBe(direction)
          expect(calls[0]!.slice(1, 5)).toEqual([8, 1352, 432, 432])
        }
      }
    }
  })

  it('draws a decoded 448px frame at 1x world size and never loads missing directional art per frame', () => {
    const dir = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlases: { direction: dir } } as unknown as HTMLImageElement
    const { ctx, calls } = capture()
    expect(drawProductionHeroFrame(ctx, portrait, anim({ pose: 'idle', direction: 4 }), 117, 147)).toBe(true)
    const draw = calls.at(-1)!
    expect(draw[0]).toBe(dir)
    expect(draw.slice(1, 5)).toEqual([8, 456, 432, 432])
    expect(Number(draw[7])).toBeLessThanOrEqual(147)
    expect(Number(draw[8])).toBeLessThanOrEqual(147)
  })

  it('draws exactly one isolated image cell per pose, never composites a stale frame', () => {
    const atlas = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlases: { direction: atlas, action: atlas } } as unknown as HTMLImageElement
    for (let frame = 0; frame < 10; frame++) {
      const { ctx, calls } = capture()
      expect(drawProductionHeroFrame(ctx, portrait, anim({ pose: 'run', direction: 0, frame }), 117, 147)).toBe(true)
      expect(calls).toHaveLength(1)
      expect(calls[0]![0]).toBe(atlas)
      expect(Number(calls[0]![3])).toBe(432)
      expect(Number(calls[0]![4])).toBe(432)
    }
  })

  it('only suppresses the legacy horizontal mirror when the right directional source is actually decoded', () => {
    const pending = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlasSources: PRODUCTION_HERO_POSE_SOURCES.shadowblade,
      poseAtlases: {} } as unknown as HTMLImageElement & { poseAtlases: Record<string, HTMLImageElement> }
    const westRun = anim({ pose: 'run', direction: 4 })
    expect(productionHeroPoseReady(pending, westRun)).toBe(false)
    pending.poseAtlases.direction = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    expect(productionHeroPoseReady(pending, westRun)).toBe(true)
    pending.poseAtlases.action = { complete: false, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement
    expect(productionHeroPoseReady(pending, westRun)).toBe(true)
  })

  it('locks the visible feet to the same pixel when consecutive frames have different alpha bottoms', () => {
    const atlas = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    const hero = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlases: { direction: atlas, action: atlas },
      heroId: 'spirit-summoner' } as unknown as HTMLImageElement
    for (let frame = 0; frame < 8; frame++) {
      const calls: unknown[][] = []
      const ctx = { save: () => {}, restore: () => {}, scale: () => {},
        drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      const motion = anim({ pose: 'run', direction: 0, frame, count: 8 })
      const rect = productionHeroPoseRect(motion)
      expect(drawProductionHeroFrame(ctx, hero, motion, 117, 147)).toBe(true)
      const draw = calls[0]!
      expect(Number(draw[6]) + Number(draw[8]) * (productionHeroFrameAnchor(hero, rect) - 8) / 432)
        .toBeCloseTo(4, 5)
    }
  })

  it.each(['spirit-summoner', 'crimson-paladin'] as const)('blends discrete walk frames and heading changes for %s', heroId => {
    const atlas = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    const hero = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlases: { direction: atlas, action: atlas }, heroId } as unknown as HTMLImageElement
    const images: { crop: number; alpha: number }[] = []
    const ctx = {
      globalAlpha: 1, save: () => {}, restore: () => {},
      scale: () => {},
      drawImage: (...args: unknown[]) => { images.push({ crop: Number(args[1]), alpha: ctx.globalAlpha }) },
    } as unknown as Ctx2D
    expect(drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', frame: 0, count: 8 }), 108, 134, undefined, 0)).toBe(true)
    images.length = 0
    expect(drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', frame: 1, count: 8 }), 108, 134, undefined, 0.016)).toBe(true)
    expect(images.length).toBe(2)
    expect(images.map(x => x.alpha)).toEqual(expect.arrayContaining([expect.any(Number), expect.any(Number)]))
    expect(images.reduce((sum, x) => sum + x.alpha, 0)).toBeCloseTo(1)
    images.length = 0
    drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', direction: 6, frame: 2, count: 8 }), 108, 134, undefined, 0.080)
    images.length = 0
    drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', direction: 6, frame: 2, count: 8 }), 108, 134, undefined, 0.140)
    expect(images).toHaveLength(2)
    expect(images.reduce((sum, x) => sum + x.alpha, 0)).toBeCloseTo(1)
    images.length = 0
    drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', direction: 6, frame: 2, count: 8 }), 108, 134, undefined, 0.300)
    expect(images).toHaveLength(1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('smooths Shadowblade movement but cuts heading and action boundaries to avoid ghost blades', () => {
    const atlas = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    const hero = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlases: { direction: atlas, action: atlas }, heroId: 'shadowblade' } as unknown as HTMLImageElement
    const images: { crop: number; alpha: number }[] = []
    const ctx = { globalAlpha: 1, save: () => {}, restore: () => {}, scale: () => {},
      drawImage: (...args: unknown[]) => { images.push({ crop: Number(args[1]), alpha: ctx.globalAlpha }) },
    } as unknown as Ctx2D
    const draw = (time: number, overrides: Partial<HeroAnimation>) => {
      images.length = 0
      expect(drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', count: 8, ...overrides }), 108, 134, undefined, time)).toBe(true)
    }
    draw(0, { frame: 0 })
    draw(.016, { frame: 1 })
    expect(images).toHaveLength(2)
    expect(images.reduce((sum, image) => sum + image.alpha, 0)).toBeCloseTo(1)
    draw(.080, { direction: 6, frame: 2 })
    expect(images).toEqual([{ crop: 904, alpha: 1 }])
    draw(.140, { direction: 6, frame: 2 })
    expect(images).toEqual([{ crop: 904, alpha: 1 }])
    draw(.160, { direction: 6, pose: 'attack', phase: .4 })
    expect(images).toEqual([{ crop: 904, alpha: 1 }])
    draw(.180, { direction: 0, pose: 'attack', phase: .4 })
    expect(images).toHaveLength(1)
    expect(images[0]?.alpha).toBe(1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('does not crossfade in reduced-motion mode', () => {
    const atlas = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
    const hero = { complete: true, naturalWidth: 900, naturalHeight: 900,
      poseAtlases: { direction: atlas, action: atlas }, heroId: 'crimson-paladin' } as unknown as HTMLImageElement
    const calls: unknown[][] = []
    const ctx = { globalAlpha: 1, save: () => {}, restore: () => {},
      drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', direction: 0 }), 117, 147, undefined, 0)
    calls.length = 0
    drawProductionHeroFrame(ctx, hero, anim({ pose: 'run', direction: 4, reducedMotion: true }), 117, 147, undefined, 0.02)
    expect(calls).toHaveLength(1)
  })

  it('falls back to its own portrait when split sheets are not decoded yet', () => {
    const { ctx, calls } = capture()
    const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900 } as HTMLImageElement
    expect(drawProductionHeroFrame(ctx, portrait, anim({ pose: 'attack', direction: 5 }), 117, 147)).toBe(true)
    expect(calls.at(-1)![0]).toBe(portrait)
  })
})