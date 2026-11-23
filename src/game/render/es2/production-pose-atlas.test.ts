import { describe, expect, it } from 'vitest'
import { drawProductionHeroFrame, loadProductionHeroes, productionHeroPoseRect, productionHeroPoseReady, PRODUCTION_HERO_POSE_SOURCES } from './production-heroes'
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
      const attacking = productionHeroPoseRect(anim({ pose: 'attack', direction: 4, phase: (i + 0.01) / 8 }))
      expect(attacking.sheet).toBe('action')
      expect(attacking.mirror).toBe(true)
      expect([attacking.x, attacking.y]).toEqual([(i % 4) * 448, Math.floor((i + 8) / 4) * 448])
      const special = productionHeroPoseRect(anim({ pose: 'cast', direction: 0, phase: (i + 0.01) / 8, special: true }))
      expect(special.sheet).toBe('special')
      expect([special.x, special.y]).toEqual([(i % 4) * 448, Math.floor(i / 4) * 448])
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
    expect(draw.slice(1, 5)).toEqual([0, 448, 448, 448])
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
      expect(Number(calls[0]![3])).toBe(448)
      expect(Number(calls[0]![4])).toBe(448)
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

  it('falls back to its own portrait when split sheets are not decoded yet', () => {
    const { ctx, calls } = capture()
    const portrait = { complete: true, naturalWidth: 900, naturalHeight: 900 } as HTMLImageElement
    expect(drawProductionHeroFrame(ctx, portrait, anim({ pose: 'attack', direction: 5 }), 117, 147)).toBe(true)
    expect(calls.at(-1)![0]).toBe(portrait)
  })
})