import { describe, expect, it } from 'vitest'
import { CHARACTER_FOOT_BOTTOMS } from './character-foot-anchors'
import { drawProductionHeroFrame, productionHeroPoseRect } from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

const animation = (overrides: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'idle', frame: 0, count: 8, phase: 0, direction: 0, reducedMotion: false,
  ...overrides,
})

function renderAll(anim: HeroAnimation) {
  const calls: unknown[][] = []
  const ctx = {
    save: () => {}, restore: () => {}, scale: () => {}, translate: () => {}, rotate: () => {},
    drawImage: (...args: unknown[]) => calls.push(args),
  } as unknown as Ctx2D
  const direction = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
  const action = { complete: true, naturalWidth: 1792, naturalHeight: 1792 } as HTMLImageElement
  const special = { complete: true, naturalWidth: 1792, naturalHeight: 896 } as HTMLImageElement
  const portrait = {
    complete: true, naturalWidth: 900, naturalHeight: 900,
    heroId: 'shadowblade', poseAtlasSources: { direction: 'direction.webp', action: 'action.webp', special: 'special.webp' },
    poseAtlases: { direction, action, special },
  } as unknown as HTMLImageElement
  expect(drawProductionHeroFrame(ctx, portrait, anim, 120, 140)).toBe(true)
  return calls
}

function render(anim: HeroAnimation) {
  const calls = renderAll(anim)
  expect(calls).toHaveLength(1)
  return calls[0]!
}

describe('ES2 hero atlas safe-crop contract', () => {
  it('insets each 448px source cell by 8px so no neighboring cell is sampled', () => {
    for (const anim of [
      animation({ pose: 'idle', direction: 0 }),
      animation({ pose: 'idle', direction: 7 }),
      animation({ pose: 'run', direction: 0, frame: 4 }),
      animation({ pose: 'run', direction: 1, frame: 4 }),
      animation({ pose: 'attack', direction: 4, phase: 0.7 }),
      animation({ pose: 'cast', direction: 0, phase: 0.7, special: true }),
      animation({ pose: 'hurt', direction: 3 }),
      animation({ pose: 'idle', direction: 6, reducedMotion: true }),
    ]) {
      const frame = productionHeroPoseRect(anim)
      // A held guard cell walks through the shared gait: several crops of the same cell.
      const gait = anim.pose === 'run' && frame.sheet === 'direction'
      const draws = gait ? renderAll(anim) : [render(anim)]
      if (gait) expect(draws.length).toBeGreaterThan(1)
      else expect(draws[0]!.slice(1, 5), `${anim.pose}/${anim.direction}`)
        .toEqual([frame.x + 8, frame.y + 8, 432, 432])
      for (const draw of draws) {
        expect(Number(draw[1])).toBeGreaterThanOrEqual(frame.x + 8 - 1e-6)
        expect(Number(draw[2])).toBeGreaterThanOrEqual(frame.y + 8 - 1e-6)
        expect(Number(draw[1]) + Number(draw[3])).toBeLessThanOrEqual(frame.x + 448 - 8 + 1e-6)
        expect(Number(draw[2]) + Number(draw[4])).toBeLessThanOrEqual(frame.y + 448 - 8 + 1e-6)
      }
    }
  })

  it('keeps the visual footprint and opaque foot anchored to world ground after cropping', () => {
    const anim = animation({ pose: 'run', direction: 0, frame: 4 })
    const draw = render(anim)
    const opaqueBottom = CHARACTER_FOOT_BOTTOMS.shadowblade.action[4]
    const contentHeight = Number(draw[8]) / 432 * 448
    expect(Number(draw[6]) + (opaqueBottom - 8) / 432 * Number(draw[8])).toBeCloseTo(4)
    expect(contentHeight).toBeCloseTo(147)
    expect(Number(draw[7]) / 432 * 448).toBeCloseTo(139.2)
  })
})
