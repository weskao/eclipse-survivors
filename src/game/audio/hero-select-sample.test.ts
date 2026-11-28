import { describe, expect, it } from 'vitest'
import { renderHeroSelectSample } from './hero-select-sample'

describe('hero selection confirmation Foley', () => {
  it.each([44100, 48000])('renders a deterministic, bounded layered one-shot at %i Hz', rate => {
    const pcm = renderHeroSelectSample(rate)
    expect(pcm).toEqual(renderHeroSelectSample(rate))
    expect(pcm.length).toBe(Math.ceil(rate * .44))
    expect(pcm.every(Number.isFinite)).toBe(true)
    expect(pcm[0]).toBe(0)
    expect(pcm.at(-1)).toBe(0)
    const peak = pcm.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
    const rms = (from: number, to: number) => {
      const window = pcm.slice(Math.floor(rate * from), Math.floor(rate * to))
      return Math.sqrt(window.reduce((sum, value) => sum + value * value, 0) / window.length)
    }
    expect(peak).toBeCloseTo(.42, 4)
    expect(rms(0, .12)).toBeGreaterThan(.035)
    expect(rms(.15, .28)).toBeGreaterThan(.008)
    expect(rms(.39, .44)).toBeLessThan(rms(.15, .28))
  })
})
