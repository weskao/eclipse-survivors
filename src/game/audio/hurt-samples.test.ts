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
