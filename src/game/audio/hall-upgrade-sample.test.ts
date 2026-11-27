import { describe, expect, it } from 'vitest'
import { renderHallUpgradeSample, renderHallCue, hallCueKey, hallRankVariant } from './hall-upgrade-sample'

describe('hall upgrade sound', () => {
  it.each([22050, 48000])('renders bounded, deterministic, distinct rank and milestone Foley at %i Hz', rate => {
    const rank = renderHallUpgradeSample(rate, false)
    const milestone = renderHallUpgradeSample(rate, true)
    expect(rank.length / rate).toBeCloseTo(.74, 2)
    expect(milestone.length / rate).toBeCloseTo(1.42, 2)
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
    const durations = [.12, .28, .36, .74, 1.42, .92, .86, 1.02]
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

describe('Rank-specific Hall ceremonies', () => {
  it.each([22050,48000])('renders five different ranks and five combined unlock cues at %i Hz', rate => {
    const plain = [1,2,3,4,5].map(rank => hallRankVariant(rank, 5, false))
    const linked = [1,2,3,4,5].map(rank => hallRankVariant(rank, 5, true))
    expect(new Set([...plain, ...linked]).size).toBe(10)
    const signatures = [...plain, ...linked].map(variant => {
      const key = hallCueKey('upgrade', variant)!
      expect(key).toBeDefined()
      const pcm = renderHallCue(rate, key)
      expect(pcm.every(Number.isFinite)).toBe(true)
      expect(pcm.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0)).toBeLessThanOrEqual(.81)
      expect(pcm[0]).toBe(0)
      expect(pcm.at(-1)).toBe(0)
      return Array.from(pcm.slice(100, 600)).join(',')
    })
    expect(new Set(signatures).size).toBe(10)
    for (const variant of linked) {
      const pcm = renderHallCue(rate, hallCueKey('upgrade', variant)!)
      expect(pcm.length / rate).toBeCloseTo(1.6, 2)
      expect(pcm.slice(Math.floor(rate * 1.2)).some(x => Math.abs(x) > .005)).toBe(true)
    }
  })
})

it('renders distinct scoped keystone, signature, resonance and attunement ceremonies', () => {
  const keys=[16,17,18,19,20,21].map(n=>hallCueKey('upgrade',n)!)
  expect(keys).toEqual(['keystone','signature','resonance','attune','signature-attune','resonance-attune'])
  const samples=keys.map(key=>renderHallCue(22050,key))
  expect(new Set(samples.map(p=>Array.from(p.slice(100,400)).join(','))).size).toBe(6)
  for(const p of samples) {
    expect(p.every(Number.isFinite)).toBe(true)
    expect(p[0]).toBe(0)
    expect(p.at(-1)).toBe(0)
    expect(p.reduce((peak,x)=>Math.max(peak,Math.abs(x)),0)).toBeLessThanOrEqual(.81)
  }
})

describe('Mastered skill musical identity', () => {
  it.each([22050, 48000])('retains the preceding rank motif and adds a distinct audible finale at %i Hz', rate => {
    const rank = renderHallCue(rate, 'rank-4')
    const mastered = renderHallCue(rate, 'milestone')
    const opening = Math.floor(rate * .48)
    let ab = 0, aa = 0, bb = 0
    for (let i = 0; i < opening; i++) {
      ab += rank[i]! * mastered[i]!
      aa += rank[i]! ** 2
      bb += mastered[i]! ** 2
    }
    // A different chord at the opening breaks the musical continuity.
    expect(ab / Math.sqrt(aa * bb)).toBeGreaterThan(.999)
    expect(mastered.length / rate).toBeCloseTo(1.42, 2)
    const tail = mastered.slice(Math.floor(rate * .98), Math.floor(rate * 1.25))
    const rms = Math.sqrt(tail.reduce((sum, sample) => sum + sample ** 2, 0) / tail.length)
    expect(rms).toBeGreaterThan(.012)
    expect(mastered.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0)).toBeLessThanOrEqual(.81)
    expect(mastered[0]).toBe(0)
    expect(mastered.at(-1)).toBe(0)
    // Even when the last rank opens another node, keep the mastered motif.
    const routed = renderHallCue(rate, hallCueKey('upgrade', hallRankVariant(5, 5, true))!)
    expect(routed.length / rate).toBeCloseTo(1.6, 2)
    expect(routed.slice(0, opening)).toEqual(mastered.slice(0, opening).map(sample => sample * .83))
    expect(routed.slice(Math.floor(rate * 1.2)).some(sample => Math.abs(sample) > .005)).toBe(true)
  })
})
