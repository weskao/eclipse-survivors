/** Original legendary level-up Foley, rendered once per AudioContext (no third-party samples, no gameplay RNG).
 * reveal: reverse-air riser → sub/gong impact → staggered bell arpeggio over a formant "choir" pad → glass sparkles.
 * claim: metal seal transient → warm thump → ascending bell fifths → short sparkle tail. Both: damped room, DC block, peak-normalised. */
export const LEGENDARY_CUES = ['legendaryReveal', 'legendaryClaim'] as const
export type LegendaryCue = typeof LEGENDARY_CUES[number]
export const isLegendaryCue = (cue: string): cue is LegendaryCue => cue === 'legendaryReveal' || cue === 'legendaryClaim'

const TAU = Math.PI * 2
const SPEC = {
  // D major add9 palette: gold, triumphant, distinct from the C/G hall and level chimes.
  legendaryReveal: { seconds: 1.9, peak: .82, hit: .3, riser: .3, bells: [587.33, 739.99, 880, 1174.66, 1318.51], step: .072, choir: [146.83, 293.66, 440, 739.99], sub: [112, 44], gong: 98, sparkles: 22, seed: 9157 },
  legendaryClaim: { seconds: 1, peak: .76, hit: 0, riser: 0, bells: [880, 1318.51, 1760], step: .052, choir: [293.66, 440], sub: [96, 52], gong: 196, sparkles: 10, seed: 4271 },
} as const

/** One single-cycle "ah" vowel table (formants ≈ 800 / 1150 / 2900 Hz for a ~220 Hz voice), built once per render. */
function vowelTable(size: number): Float32Array {
  const table = new Float32Array(size)
  const formant = (f: number) => Math.exp(-(((f - 800) / 260) ** 2)) + .6 * Math.exp(-(((f - 1150) / 300) ** 2)) + .25 * Math.exp(-(((f - 2900) / 500) ** 2))
  for (let h = 1; h <= 14; h++) {
    const amp = (.35 / h + formant(h * 220)) / h ** .3
    for (let i = 0; i < size; i++) table[i]! += amp * Math.sin(TAU * h * i / size)
  }
  let peak = 0
  for (const v of table) peak = Math.max(peak, Math.abs(v))
  for (let i = 0; i < size; i++) table[i] = table[i]! / peak
  return table
}

export function renderLegendaryCue(rate: number, cue: LegendaryCue): Float32Array {
  const p = SPEC[cue]
  const pcm = new Float32Array(Math.ceil(rate * p.seconds))
  const table = vowelTable(2048)
  const mask = table.length - 1
  // Two slightly detuned copies per choir voice for ensemble width.
  const voices = p.choir.flatMap(f => [f * 1.0023, f * .9977])
  const phases = new Float64Array(voices.length)
  let seed = p.seed
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
  const sparkle = Array.from({ length: p.sparkles }, (_, n) => ({
    at: p.hit + .06 + (n / p.sparkles) ** 1.35 * (p.seconds - p.hit) * .72 + rnd() * .03,
    f: 2600 + rnd() * 4200, amp: (.05 + rnd() * .035) * (1 - n / p.sparkles * .6),
  }))
  // Bell and gong partials as damped recursive resonators (y = 2r·cosω·y1 − r²·y2 ≡ gain·e^(−decay·v)·sin(ωv)):
  // two multiplies per sample instead of a Math.sin, measured 65 → 28 ms (warm, desktop) for the reveal at 48 kHz.
  const partials: { start: number; c: number; r2: number; y1: number; y2: number; attack: number; gain: number }[] = []
  const partial = (at: number, freq: number, gain: number, decay: number) => {
    const w = TAU * freq / rate, r = Math.exp(-decay / rate)
    // State holds s[n] and s[n−1] with s[0] = 0, s[−1] = −sin(ω)/r.
    partials.push({ start: Math.round(at * rate), c: 2 * r * Math.cos(w), r2: r * r, y1: 0, y2: -Math.sin(w) / r, attack: 1, gain })
  }
  for (const [ratio, gain, decay] of [[1, .12, 3.2], [2.76, .07, 5.5], [5.4, .045, 9], [8.93, .03, 14]] as const) partial(p.hit, p.gong * ratio, gain, decay)
  p.bells.forEach((bf, n) => {
    const at = p.hit + .015 + n * p.step, d = 2.6 + n * .35
    partial(at, bf, .11, d); partial(at, bf * 2, .045, d + 4); partial(at, bf * 2.76, .03, d + 7); partial(at, bf * 4.07, .016, d + 13)
  })
  const attackStep = Math.exp(-700 / rate)
  const reflections = [[.023, .22], [.041, -.16], [.067, .13], [.097, -.1], [.131, .085], [.173, .06]]
    .map(([t, g]) => [Math.max(1, Math.round(rate * t!)), g!] as const)
  const highpass = 1 - Math.exp(-TAU * 24 / rate)
  let low = 0, riserLow = 0, subPhase = 0, dc = 0, peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    const noise = rnd() * 2 - 1
    low += (noise - low) * (1 - Math.exp(-TAU * 1900 / rate))
    let x = 0
    // 1. Reverse-air riser: cutoff and level climb exponentially, then cut on the hit.
    if (p.riser && t < p.hit) {
      const k = t / p.hit
      const cutoff = 300 * Math.pow(22, k)
      riserLow += (noise - riserLow) * (1 - Math.exp(-TAU * cutoff / rate))
      const glide = Math.sin(TAU * (180 * t + 900 * t * t / (2 * p.hit)))
      x += (riserLow * .34 + glide * .05) * k ** 2.4 * Math.min(1, (p.hit - t) / .012)
    }
    const u = t - p.hit
    if (u >= 0) {
      // 2. Impact: pitch-dropping sub, broadband transient and an inharmonic bronze gong.
      const f = p.sub[1] + (p.sub[0] - p.sub[1]) * Math.exp(-u * 11)
      subPhase += TAU * f / rate
      x += Math.sin(subPhase) * .52 * (1 - Math.exp(-u * 900)) * Math.exp(-u * (cue === 'legendaryClaim' ? 13 : 5.5))
      x += (noise - low) * .42 * Math.exp(-u * 70) + low * .18 * Math.exp(-u * 22)
      // 4. Formant choir pad with gentle 5.2 Hz vibrato; swells after the hit, releases before the end.
      const swell = Math.min(1, u / (cue === 'legendaryClaim' ? .06 : .22)) * Math.min(1, (p.seconds - t) / (p.seconds - p.hit) * 1.6)
      if (swell > 0) {
        const vib = 1 + .0035 * Math.sin(TAU * 5.2 * t)
        let pad = 0
        for (let n = 0; n < voices.length; n++) {
          phases[n] = (phases[n]! + voices[n]! * vib * table.length / rate) % table.length
          pad += table[phases[n]! & mask]!
        }
        x += pad / voices.length * .2 * swell * Math.exp(-u * (cue === 'legendaryClaim' ? 3.6 : 1.25))
      }
    }
    // 3. Bronze gong + staggered bell arpeggio (strike and inharmonic partials) for a rising "unlock".
    for (const q of partials) {
      if (i < q.start) continue
      x += q.y1 * q.gain * (1 - q.attack)
      q.attack *= attackStep
      const next = q.c * q.y1 - q.r2 * q.y2
      q.y2 = q.y1; q.y1 = next
    }
    // 5. Glass sparkles: short FM chimes scattered over the tail.
    for (const s of sparkle) {
      const v = t - s.at
      if (v < 0 || v > .25) continue
      x += Math.sin(TAU * s.f * v + 1.4 * Math.sin(TAU * s.f * .5 * v)) * s.amp * (1 - Math.exp(-v * 1500)) * Math.exp(-v * 26)
    }
    // Damped early reflections give space without a convolution reverb.
    let room = 0
    for (const [delay, gain] of reflections) if (i >= delay) room += pcm[i - delay]! * gain
    const mixed = Math.tanh(x * 1.25 + room)
    dc += (mixed - dc) * highpass
    const fade = Math.min(1, t / .002, (pcm.length - 1 - i) / (rate * .12))
    const value = (mixed - dc) * Math.max(0, fade)
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak > 0 ? p.peak / peak : 0
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
  pcm[0] = 0
  pcm[pcm.length - 1] = 0
  return pcm
}
