import { describe, expect, it } from 'vitest'
import { renderHallUpgradeSample } from './hall-upgrade-sample'

describe('hall upgrade sound', () => {
  it.each([22050, 48000])('renders bounded, deterministic, distinct rank and milestone Foley at %i Hz', rate => {
    const rank = renderHallUpgradeSample(rate, false)
    const milestone = renderHallUpgradeSample(rate, true)
    expect(rank.length / rate).toBeCloseTo(.74, 2)
    expect(milestone.length / rate).toBeCloseTo(1.05, 2)
    expect(rank).toEqual(renderHallUpgradeSample(rate, false))
    for (const pcm of [rank, milestone]) {
      const peak = pcm.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0)
      expect(peak).toBeGreaterThan(.3)
      expect(peak).toBeLessThanOrEqual(.81)
      expect(pcm.every(Number.isFinite)).toBe(true)
      expect(pcm[0]).toBe(0)
      expect(pcm[pcm.length - 1]).toBe(0)
      expect(pcm.slice(Math.floor(pcm.length / 3), Math.floor(pcm.length * 2 / 3)).some(x => Math.abs(x) > .01)).toBe(true)
    }
  })
})
