import { describe, expect, it } from 'vitest'
import { LEGENDARY_CUES, renderLegendaryCue } from './legendary-sample'

const peakOf = (pcm: Float32Array) => pcm.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
const rms = (pcm: Float32Array, rate: number, from: number, to: number) => {
  const window = pcm.slice(Math.floor(rate * from), Math.floor(rate * to))
  return Math.sqrt(window.reduce((sum, value) => sum + value * value, 0) / window.length)
}

describe('legendary level-up Foley', () => {
  it.each([44100, 48000])('renders deterministic, finite, headroom-safe one-shots at %i Hz', rate => {
    for (const cue of LEGENDARY_CUES) {
      const pcm = renderLegendaryCue(rate, cue)
      expect(pcm).toEqual(renderLegendaryCue(rate, cue))
      expect(pcm.every(Number.isFinite)).toBe(true)
      expect(pcm[0]).toBe(0)
      expect(pcm.at(-1)).toBe(0)
      expect(peakOf(pcm)).toBeLessThanOrEqual(.85)
      expect(peakOf(pcm)).toBeGreaterThan(.6)
    }
  })

  it('reveal swells into an impact, then rings out through a long bounded tail', () => {
    const rate = 48000
    const pcm = renderLegendaryCue(rate, 'legendaryReveal')
    expect(pcm.length / rate).toBeCloseTo(1.9, 2)
    const swell = rms(pcm, rate, .05, .15), lateSwell = rms(pcm, rate, .2, .3)
    expect(lateSwell).toBeGreaterThan(swell) // riser grows toward the hit
    const impact = rms(pcm, rate, .3, .42)
    expect(impact).toBeGreaterThan(lateSwell)
    const bloom = rms(pcm, rate, .7, 1.1)
    expect(bloom).toBeGreaterThan(.02) // choir/bell bloom is meaningful, not a click
    expect(rms(pcm, rate, 1.75, 1.9)).toBeLessThan(bloom * .5)
  })

  it('claim is a distinct shorter seal with an audible ringing tail', () => {
    const rate = 44100
    const claim = renderLegendaryCue(rate, 'legendaryClaim')
    const reveal = renderLegendaryCue(rate, 'legendaryReveal')
    expect(claim.length / rate).toBeCloseTo(1, 2)
    expect(claim.length).toBeLessThan(reveal.length)
    expect(rms(claim, rate, 0, .1)).toBeGreaterThan(.08) // immediate lock-in transient
    expect(rms(claim, rate, .3, .6)).toBeGreaterThan(.012)
    expect(rms(claim, rate, .92, 1)).toBeLessThan(rms(claim, rate, .3, .6))
  })
})
