import { describe, expect, it } from 'vitest'
import { HERO_SELECT_PEAK, HERO_SELECT_SECONDS, renderHeroSelectSample } from './hero-select-sample'

describe('hero selection confirmation Foley', () => {
  it.each([44100, 48000])('renders a deterministic, bounded blade-draw + oath-bell one-shot at %i Hz', rate => {
    const pcm = renderHeroSelectSample(rate)
    expect(pcm).toEqual(renderHeroSelectSample(rate))
    expect(HERO_SELECT_SECONDS).toBe(.6)
    expect(pcm.length).toBe(Math.ceil(rate * HERO_SELECT_SECONDS))
    expect(pcm.every(Number.isFinite)).toBe(true)
    expect(pcm[0]).toBe(0)
    expect(pcm.at(-1)).toBe(0)

    let peak = 0, peakAt = 0, sum = 0, total = 0, bright = 0, hp = 0, prev = 0
    const hpPole = Math.exp(-2 * Math.PI * 200 / rate)
    for (let i = 0; i < pcm.length; i++) {
      const v = pcm[i]!
      if (Math.abs(v) > peak) { peak = Math.abs(v); peakAt = i / rate }
      sum += v; total += v * v
      hp = hpPole * (hp + v - prev); prev = v // one-pole 200 Hz high-pass
      bright += hp * hp
    }
    const rms = (from: number, to: number) => {
      const window = pcm.slice(Math.floor(rate * from), Math.floor(rate * to))
      return Math.sqrt(window.reduce((acc, value) => acc + value * value, 0) / window.length)
    }

    // Headroom: a meaningful selection sits between Hall inspect (.34) and rank (.65), well under .85.
    expect(peak).toBeLessThanOrEqual(.85)
    expect(peak).toBeCloseTo(HERO_SELECT_PEAK, 4)
    expect(HERO_SELECT_PEAK).toBe(.58)
    // Tangible onset: the blade-draw/gauntlet contact lands first.
    expect(peakAt).toBeLessThan(.05)
    // Audible on phone/laptop speakers: most energy above 200 Hz.
    expect(bright / total).toBeGreaterThan(.6)
    // Not a squashed block of noise, not a lone click.
    const crest = peak / Math.sqrt(total / pcm.length)
    expect(crest).toBeGreaterThan(3)
    expect(crest).toBeLessThan(14)
    // DC rejected.
    expect(Math.abs(sum / pcm.length)).toBeLessThan(1e-3)
    // The oath bell keeps ringing after the hit, then the tail fades out.
    expect(rms(.18, .34)).toBeGreaterThan(rms(0, .12) * .25)
    expect(rms(.54, .6)).toBeLessThan(rms(.18, .34) * .25)
  })
})
