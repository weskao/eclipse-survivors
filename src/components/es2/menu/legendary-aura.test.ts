import { describe, expect, it } from 'vitest'
import { AURA_BUDGET, auraMode, auraSpriteCount, burstPose, emberPose, perimeterPoint } from './legendary-aura'

describe('legendary choice aura plan', () => {
  it('turns off for reduced motion or still mode and calms for reduced flashing', () => {
    expect(auraMode({ reduceMotion: false, reduceFlashing: false, still: false })).toBe('full')
    expect(auraMode({ reduceMotion: false, reduceFlashing: true, still: false })).toBe('calm')
    expect(auraMode({ reduceMotion: true, reduceFlashing: false, still: false })).toBe('off')
    expect(auraMode({ reduceMotion: false, reduceFlashing: false, still: true })).toBe('off')
  })

  it('traces the rounded card border clockwise and stays on its edge', () => {
    const w = 200, h = 300, r = 16
    expect(perimeterPoint(w, h, r, 0)).toMatchObject({ x: r, y: 0 })
    for (let i = 0; i < 64; i++) {
      const p = perimeterPoint(w, h, r, i / 64)
      expect(p.x).toBeGreaterThanOrEqual(-1e-9)
      expect(p.x).toBeLessThanOrEqual(w + 1e-9)
      expect(p.y).toBeGreaterThanOrEqual(-1e-9)
      expect(p.y).toBeLessThanOrEqual(h + 1e-9)
      const onEdge = p.x < 1e-6 || p.y < 1e-6 || Math.abs(p.x - w) < 1e-6 || Math.abs(p.y - h) < 1e-6
      const cx = p.x < r ? r : p.x > w - r ? w - r : p.x, cy = p.y < r ? r : p.y > h - r ? h - r : p.y
      expect(onEdge || Math.abs(Math.hypot(p.x - cx, p.y - cy) - r) < 1e-6).toBe(true)
    }
    expect(perimeterPoint(w, h, r, .25).x).toBeCloseTo(w, 6) // right edge after a quarter of the path
    expect(perimeterPoint(w, h, r, 1)).toEqual(perimeterPoint(w, h, r, 0))
  })

  it('loops embers deterministically upward inside the card and fades them at both ends', () => {
    const a = emberPose(3, 1.25, 180, 260), b = emberPose(3, 1.25, 180, 260)
    expect(a).toEqual(b)
    for (let i = 0; i < AURA_BUDGET.embers; i++) for (let t = 0; t < 6; t += .37) {
      const p = emberPose(i, t, 180, 260)
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(180)
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(260)
      expect(p.alpha).toBeGreaterThanOrEqual(0); expect(p.alpha).toBeLessThanOrEqual(AURA_BUDGET.emberAlpha)
    }
    const early = emberPose(0, .1, 180, 260), later = emberPose(0, .4, 180, 260)
    expect(later.y).toBeLessThan(early.y)
  })

  it('keeps every reveal burst glow inside the art box so card text stays readable', () => {
    // Stacked (desktop/landscape) and side-by-side (portrait) art boxes.
    for (const art of [{ x: 0, y: 0, w: 240, h: 160 }, { x: 6, y: 4, w: 96, h: 210 }]) {
      for (let i = 0; i < AURA_BUDGET.burst; i++) for (let r = 0; r < 1; r += .05) {
        const p = burstPose(i, r, art)
        expect(p.x - p.size / 2).toBeGreaterThanOrEqual(art.x - 1e-9)
        expect(p.x + p.size / 2).toBeLessThanOrEqual(art.x + art.w + 1e-9)
        expect(p.y - p.size / 2).toBeGreaterThanOrEqual(art.y - 1e-9)
        expect(p.y + p.size / 2).toBeLessThanOrEqual(art.y + art.h + 1e-9)
        expect(p.alpha).toBeGreaterThanOrEqual(0); expect(p.alpha).toBeLessThanOrEqual(1)
      }
    }
    const art = { x: 0, y: 0, w: 240, h: 160 }, spread = (r: number) => Math.hypot(burstPose(5, r, art).x - 120, burstPose(5, r, art).y - 80)
    expect(burstPose(0, .2, art)).toEqual(burstPose(0, .2, art))
    expect(spread(.6)).toBeGreaterThan(spread(.05))
  })

  it('bounds sprites for every legendary card in a three-choice offer', () => {
    expect(auraSpriteCount(1, 'full')).toBeLessThanOrEqual(80)
    expect(auraSpriteCount(9, 'full')).toBe(auraSpriteCount(AURA_BUDGET.maxCards, 'full'))
    expect(auraSpriteCount(3, 'calm')).toBeLessThan(auraSpriteCount(3, 'full'))
    expect(auraSpriteCount(2, 'off')).toBe(0)
  })
})
