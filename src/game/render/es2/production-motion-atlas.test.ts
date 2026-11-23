import { describe, expect, it } from 'vitest'
import { drawProductionHeroFrame } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const image = { complete: true, naturalWidth: 3072, naturalHeight: 1920 } as HTMLImageElement
function heroWithAtlas() {
  return { complete: true, naturalWidth: 900, naturalHeight: 900, motionAtlas: image } as HTMLImageElement
}
function anim(pose: HeroAnimation['pose'], direction = 0, frame = 0, phase = 0): HeroAnimation {
  return { pose, direction, frame, phase, count: pose === 'run' ? 10 : 12, reducedMotion: false }
}
function capture() {
  const calls: unknown[][] = []
  const ctx = {
    save: () => {}, restore: () => {}, scale: () => {}, translate: () => {},
    drawImage: (...args: unknown[]) => calls.push(args),
  } as Ctx2D
  return { ctx, calls }
}

describe('real forty-frame ES2 motion atlases', () => {
  it('uses the correctly authored E/SE/S/SW/W/NW/N/NE facings for idle instead of stretching the home portrait', () => {
    const expected = [4, 3, 2, 1, 0, 7, 6, 5]
    for (let direction = 0; direction < 8; direction++) {
      const { ctx, calls } = capture()
      expect(drawProductionHeroFrame(ctx, heroWithAtlas(), anim('idle', direction), 108, 134)).toBe(true)
      expect(calls).toHaveLength(1)
      expect(calls[0]![0]).toBe(image)
      expect(calls[0]!.slice(1, 5)).toEqual([expected[direction]! * 384, 0, 384, 384])
    }
  })

  it('uses eight run frames, never crosses rows, and keeps frame 0 through 7 inside the same cell', () => {
    for (let frame = 0; frame < 10; frame++) {
      const { ctx, calls } = capture()
      expect(drawProductionHeroFrame(ctx, heroWithAtlas(), anim('run', 0, frame), 108, 134)).toBe(true)
      expect(calls[0]![0]).toBe(image)
      expect(calls[0]!.slice(1, 5)).toEqual([Math.floor(frame * 8 / 10) * 384, 2 * 384, 384, 384])
    }
  })

  it('selects the correct eight-frame attack and special rows, with 3x cell crops', () => {
    const { ctx, calls } = capture()
    const source = heroWithAtlas()
    expect(drawProductionHeroFrame(ctx, source, anim('attack', 0, 0, 0.51), 108, 134)).toBe(true)
    expect(calls[0]!.slice(1, 5)).toEqual([4 * 384, 3 * 384, 384, 384])
    const special = { ...anim('cast', 0, 0, 0.51), special: true } as HeroAnimation
    expect(drawProductionHeroFrame(ctx, source, special, 108, 134)).toBe(true)
    expect(calls[1]!.slice(1, 5)).toEqual([4 * 384, 4 * 384, 384, 384])
  })

  it('keeps non-east facings during attack rather than snapping to a right-facing source pose', () => {
    const { ctx, calls } = capture()
    expect(drawProductionHeroFrame(ctx, heroWithAtlas(), anim('attack', 6, 2, 0.42), 108, 134)).toBe(true)
    expect(calls.some(draw => draw[0] === image && draw[1] === 6 * 384 && draw[2] === 384)).toBe(true)
    expect(calls.every(draw => draw[0] === image)).toBe(true)
  })

  it('uses eight-way idle imagery in reduced motion and preserves the 900px portrait as decode fallback', () => {
    const { ctx, calls } = capture()
    const reduced = { ...anim('run', 4, 3), reducedMotion: true }
    const portrait = heroWithAtlas()
    expect(drawProductionHeroFrame(ctx, portrait, reduced, 108, 134)).toBe(true)
    expect(calls[0]!.slice(1, 5)).toEqual([0, 0, 384, 384])
    const waiting = { complete: false, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement
    const delayed = { ...portrait, motionAtlas: waiting } as HTMLImageElement
    expect(drawProductionHeroFrame(ctx, delayed, anim('attack', 0), 108, 134)).toBe(true)
    expect(calls.some(draw => draw[0] === delayed)).toBe(true)
  })
})
