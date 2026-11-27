import { describe, expect, it } from 'vitest'
import { renderHallUpgradeSample, renderHallCue, hallCueKey } from './hall-upgrade-sample'

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

describe('Hall interaction and reward sound palette', () => {
  it.each([22050, 48000])('has eight distinct, finite layered cues at %i Hz', rate => {
    const kinds = ['hover', 'inspect', 'deny', 'rank', 'milestone', 'route', 'equipment', 'blessing'] as const
    const durations = [.12, .28, .36, .74, 1.05, .92, .86, 1.02]
    const signatures = kinds.map((kind, i) => {
      const pcm = renderHallCue(rate, kind)
      expect(pcm.length / rate).toBeCloseTo(durations[i]!, 2)
      expect(pcm.every(Number.isFinite)).toBe(true)
      expect(pcm[0]).toBe(0)
      expect(pcm.at(-1)).toBe(0)
      const peak = pcm.reduce((v, x) => Math.max(v, Math.abs(x)), 0)
      expect(peak).toBeGreaterThan(.1)
      expect(peak).toBeLessThanOrEqual(.81)
      expect(pcm).toEqual(renderHallCue(rate, kind))
      return Array.from(pcm.slice(100, 400)).join(',')
    })
    expect(new Set(signatures).size).toBe(kinds.length)
  })

  it('keeps generic combat and menu cues unchanged unless explicitly Hall-scoped', () => {
    expect(hallCueKey('upgrade')).toBeUndefined()
    expect(hallCueKey('select')).toBeUndefined()
    expect(hallCueKey('hover')).toBeUndefined()
    expect(hallCueKey('deny')).toBeUndefined()
    expect([1,2,3,4,5].map(n => hallCueKey('upgrade', n))).toEqual(['rank','milestone','route','equipment','blessing'])
    expect(hallCueKey('hover', 1)).toBe('hover')
    expect(hallCueKey('select', 1)).toBe('inspect')
    expect(hallCueKey('deny', 1)).toBe('deny')
    expect(hallCueKey('upgrade', 99)).toBeUndefined()
  })
})
