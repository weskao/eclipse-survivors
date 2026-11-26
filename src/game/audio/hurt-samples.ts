/** Original, deterministic one-shot sound design, rendered to PCM once per AudioContext.
 * No external recordings, fetch, musical loops or gameplay RNG. Dry body, filtered
 * armour/fabric contact, inharmonic metallic modes and a short diffused room tail.
 */
export const HURT_CUES = ['hurt', 'hurt-heavy', 'hurt-critical', 'hurt-extreme'] as const
export type HurtCue = typeof HURT_CUES[number]
export const HURT_PROFILES = {
  hurt: { seconds: .22, peak: .48, body: 106, weight: .58, metal: .19, grit: .44, seed: 1731 },
  'hurt-heavy': { seconds: .34, peak: .65, body: 81, weight: .86, metal: .26, grit: .60, seed: 1733 },
  'hurt-critical': { seconds: .39, peak: .70, body: 94, weight: .76, metal: .60, grit: .49, seed: 1737 },
  'hurt-extreme': { seconds: .48, peak: .76, body: 68, weight: 1, metal: .43, grit: .72, seed: 1741 },
} as const

export function isHurtCue(cue: string): cue is HurtCue {
  return HURT_CUES.some(id => id === cue)
}

export function renderHurtSample(cue: HurtCue, rate: number): Float32Array {
  const p = HURT_PROFILES[cue]
  const pcm = new Float32Array(Math.ceil(p.seconds * rate))
  let seed: number = p.seed, low = 0, mid = 0, phase = 0
  const tau = Math.PI * 2
  const fast = 1 - Math.exp(-tau * 2900 / rate)
  const slow = 1 - Math.exp(-tau * 180 / rate)
  const d1 = Math.round(.019 * rate), d2 = Math.round(.037 * rate), d3 = Math.round(.061 * rate)
  let peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const n = seed / 2147483648 - 1
    low += (n - low) * slow
    mid += (n - mid) * fast
    const a = Math.min(1, t / .002)
    const end = Math.min(1, (pcm.length - 1 - i) / (rate * .028))
    phase += tau * (p.body * (.67 + .77 * Math.exp(-t * 27))) / rate
    const thud = p.weight * (Math.sin(phase) * .72 + Math.sin(phase * 2.03) * .18) * Math.exp(-t * (cue === 'hurt' ? 25 : 15))
    const scrape = p.grit * ((mid - low) * .8 + low * .5) * Math.exp(-t * 39)
    const crack = (n - mid) * .15 * Math.exp(-t * 105)
    const metal = p.metal * (Math.sin(tau * 619 * t) * .46 * Math.exp(-t * 26)
      + Math.sin(tau * 1079 * t) * .29 * Math.exp(-t * 34)
      + Math.sin(tau * 1847 * t) * .15 * Math.exp(-t * 48)
      + Math.sin(tau * 2731 * t) * .07 * Math.exp(-t * 62))
    const room = (i >= d1 ? pcm[i - d1]! * .13 : 0)
      - (i >= d2 ? pcm[i - d2]! * .08 : 0) + (i >= d3 ? pcm[i - d3]! * .045 : 0)
    const value = Math.tanh((thud + scrape + crack + metal) * 1.12 + room) * a * Math.max(0, end)
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak > 0 ? p.peak / peak : 0
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
  return pcm
}
