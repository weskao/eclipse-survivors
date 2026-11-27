import { describe, expect, it } from 'vitest'
import { HURT_CUES, HURT_PROFILES, renderHurtSample } from './hurt-samples'

describe('original material-layered hurt samples', () => {
  it('renders four distinct bounded deterministic waveforms at 44.1 and 48 kHz', () => {
    for (const rate of [44100, 48000]) {
      const signatures = new Set<string>()
      for (const cue of HURT_CUES) {
        const pcm = renderHurtSample(cue, rate)
        expect(pcm.length).toBe(Math.ceil(HURT_PROFILES[cue].seconds * rate))
        expect(pcm.every(Number.isFinite)).toBe(true)
        expect(pcm[0]).toBe(0)
        expect(Math.abs(pcm.at(-1)!)).toBeLessThan(.001)
        let peak = 0, energy = 0
        for (const x of pcm) { peak = Math.max(peak, Math.abs(x)); energy += x * x }
        expect(peak).toBeCloseTo(HURT_PROFILES[cue].peak, 4)
        expect(peak).toBeLessThanOrEqual(.85)
        expect(Math.sqrt(energy / pcm.length)).toBeGreaterThan(.035)
        expect(pcm).toEqual(renderHurtSample(cue, rate))
        signatures.add(Array.from(pcm.slice(100, 150)).join(','))
      }
      expect(signatures.size).toBe(4)
    }
  })
})

it('retains material body and tail without DC, clipping or excessive transient crest', () => {
  for (const rate of [44100, 48000]) {
    let priorPeak = 0
    for (const cue of HURT_CUES) {
      const pcm = renderHurtSample(cue, rate)
      let peak = 0, energy = 0, dc = 0, early = 0, tail = 0
      for (let i = 0; i < pcm.length; i++) {
        const x = pcm[i]!
        peak = Math.max(peak, Math.abs(x))
        energy += x * x
        dc += x
        if (i < rate * .04) early += x * x
        if (i >= rate * .12 && i < rate * .22) tail += x * x
      }
      expect(Math.abs(dc / pcm.length)).toBeLessThan(.005)
      expect(peak / Math.sqrt(energy / pcm.length)).toBeLessThan(7.5)
      expect(Math.sqrt(early / (rate * .04))).toBeGreaterThan(.14)
      expect(Math.sqrt(tail / (rate * .10))).toBeGreaterThanOrEqual(cue === 'hurt' ? .018 : .05)
      expect(peak).toBeGreaterThan(priorPeak)
      priorPeak = peak
    }
  }
})
