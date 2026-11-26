/** Original dark-fantasy impact Foley, baked once per cue/context. No recordings or gameplay RNG. */
export const HURT_CUES = ['hurt', 'hurt-heavy', 'hurt-critical', 'hurt-extreme'] as const
export type HurtCue = typeof HURT_CUES[number]
export const HURT_PROFILES = {
  hurt: { seconds: .30, peak: .56, body: 112, weight: .62, metal: .18, grit: .62, seed: 1731, rattle: .024, depth: .32, decay: 19 },
  'hurt-heavy': { seconds: .49, peak: .73, body: 83, weight: .95, metal: .36, grit: .82, seed: 1733, rattle: .038, depth: .72, decay: 10 },
  'hurt-critical': { seconds: .52, peak: .78, body: 98, weight: .78, metal: .95, grit: .91, seed: 1737, rattle: .018, depth: .55, decay: 12 },
  'hurt-extreme': { seconds: .65, peak: .82, body: 67, weight: 1.18, metal: .59, grit: 1.05, seed: 1741, rattle: .052, depth: 1, decay: 7 },
} as const

export function isHurtCue(cue: string): cue is HurtCue {
  return HURT_CUES.some(id => id === cue)
}

export function renderHurtSample(cue: HurtCue, rate: number): Float32Array {
  const p = HURT_PROFILES[cue]
  const pcm = new Float32Array(Math.ceil(p.seconds * rate))
  const tau = Math.PI * 2
  const subPole = 1 - Math.exp(-tau * 110 / rate)
  const bodyPole = 1 - Math.exp(-tau * 780 / rate)
  const airPole = 1 - Math.exp(-tau * 4200 / rate)
  const dcPole = 1 - Math.exp(-tau * 28 / rate)
  const d1 = Math.round(.013 * rate), d2 = Math.round(.029 * rate)
  const d3 = Math.round(.047 * rate), d4 = Math.round(.071 * rate)
  let seed: number = p.seed, low = 0, mid = 0, high = 0, dc = 0, phase = 0, peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const n = seed / 2147483648 - 1
    low += (n - low) * subPole
    mid += (n - mid) * bodyPole
    high += (n - high) * airPole
    const attack = Math.min(1, t / .0008)
    const end = Math.min(1, (pcm.length - 1 - i) / (rate * .045))
    // A broadband contact snap with a weighty, rapidly falling body resonance.
    const snap = ((high - mid) * .67 + (n - high) * .22) * p.grit * Math.exp(-t * 145)
    phase += tau * p.body * (.72 + 1.18 * Math.exp(-t * 35)) / rate
    const body = p.weight * (Math.sin(phase) * .54 + Math.sin(phase * 1.71) * .22 + Math.sin(phase * 2.83) * .11) * Math.exp(-t * p.decay)
    const sub = p.depth * Math.sin(tau * (42 * t + 1.4 * (1 - Math.exp(-t * 19)))) * (1 - Math.exp(-t * 90)) * Math.exp(-t * 9)
    const crush = p.grit * ((mid - low) * .82 + low * .65) * Math.exp(-t * 24)
    // Independent armour contact, scrape and inharmonic plate resonances.
    const u = Math.max(0, t - p.rattle)
    const rattle = t >= p.rattle ? (1 - Math.exp(-u * 500)) * Math.exp(-u * 44) : 0
    const scrape = p.grit * (high - mid) * (.24 * Math.exp(-t * 29) + .52 * rattle)
    const steel = p.metal * (Math.sin(tau * 437 * t) * .27 * Math.exp(-t * 12)
      + Math.sin(tau * 691 * t) * .31 * Math.exp(-t * 15)
      + Math.sin(tau * 1193 * t) * .24 * Math.exp(-t * 19)
      + Math.sin(tau * 2137 * t) * .13 * Math.exp(-t * 34)
      + Math.sin(tau * 3271 * t) * .09 * Math.exp(-t * 61))
    const plate = p.metal * rattle * (Math.sin(tau * 836 * u) * .27 + Math.sin(tau * 1583 * u) * .17)
    // Short, dense early reflections; no long ringing tone or heartbeat.
    const room = (i >= d1 ? pcm[i - d1]! * .19 : 0) - (i >= d2 ? pcm[i - d2]! * .16 : 0)
      + (i >= d3 ? pcm[i - d3]! * .13 : 0) - (i >= d4 ? pcm[i - d4]! * .085 : 0)
    const dry = (snap + body + sub * .45 + crush + scrape + steel + plate) * attack
    const mixed = Math.tanh(dry * 1.28 + room)
    dc += (mixed - dc) * dcPole
    const value = (mixed - dc) * Math.max(0, end)
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak > 0 ? p.peak / peak : 0
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
  return pcm
}
