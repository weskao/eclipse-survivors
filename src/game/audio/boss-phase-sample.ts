import type { BossId } from '../content/bosses/definitions'

// Original, deterministic elemental stingers; independent from the BGM and gameplay RNG.
export const BOSS_PHASE_PALETTE = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph'] as const
const profiles = {
  'abyss-monarch': { root: 49, interval: 1.414, noise: .58, metal: .20, seed: 7291 },
  'frost-sovereign': { root: 65.4, interval: 1.5, noise: .30, metal: .85, seed: 7297 },
  'infernal-titan': { root: 43.65, interval: 1.335, noise: .95, metal: .38, seed: 7307 },
  'eclipse-seraph': { root: 55, interval: 1.498, noise: .22, metal: .73, seed: 7311 },
} as const

export function renderBossPhaseSample(boss: BossId, phase: 2 | 3, rate: number): Float32Array {
  const p = profiles[boss], final = phase === 3
  const length = Math.ceil(rate * (final ? 1.95 : 1.35))
  const pcm = new Float32Array(length)
  const tau = 2 * Math.PI, impactAt = final ? .38 : .27
  const pole = 1 - Math.exp(-tau * 720 / rate)
  let seed: number = p.seed + phase, low = 0, peak = 0
  const echo = Math.round(rate * .087)
  for (let i = 0; i < length; i++) {
    const t = i / rate, u = Math.max(0, t - impactAt)
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const n = seed / 2147483648 - 1
    low += (n - low) * pole
    const swell = Math.min(1, t / impactAt) ** 2 * Math.exp(-u * 8)
    const rise = Math.sin(tau * p.root * (1.8 * t + 2.7 * t * t)) * .18
    const air = (n - low) * p.noise * .11
    const hit = t >= impactAt ? (1 - Math.exp(-u * 150)) * Math.exp(-u * (final ? 3.4 : 5.1)) : 0
    const sub = Math.sin(tau * (p.root * .76 * u + 1.9 * (1 - Math.exp(-u * 14)))) * .65
    const body = Math.sin(tau * p.root * 2 * u) * .24 + Math.sin(tau * p.root * p.interval * 4 * u) * .19
    const chime = p.metal * (Math.sin(tau * p.root * 12.17 * u) * .20 + Math.sin(tau * p.root * 19.31 * u) * .13) * Math.exp(-u * 4)
    const choir = (Math.sin(tau * p.root * 3 * u) + Math.sin(tau * p.root * p.interval * 3 * u)) * .12 * (final ? 1.3 : .8)
    const room = i >= echo ? pcm[i - echo]! * .18 : 0
    const fade = Math.min(1, i / (rate * .008), (length - 1 - i) / (rate * .13))
    const value = Math.tanh(swell * (rise + air) + hit * (sub + body + chime + choir + low * p.noise * .36) + room) * fade
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak ? (final ? .83 : .73) / peak : 0
  for (let i = 0; i < length; i++) pcm[i] = pcm[i]! * gain
  return pcm
}
