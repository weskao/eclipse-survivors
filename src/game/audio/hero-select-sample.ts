export const HERO_SELECT_SECONDS = .6
/** Meaningful selection level: between Hall inspect (.34) and rank (.65), under the .85 ceiling. */
export const HERO_SELECT_PEAK = .58

// Struck-bell partial ratios (hum, prime, minor tierce, quint, nominal, upper) and per-partial decay.
const BELL: readonly (readonly [ratio: number, gain: number, decay: number])[] = [
  [.5, .16, 3.4], [1, .30, 5], [1.19, .13, 7.5], [1.5, .10, 8.5], [2, .14, 11], [2.74, .07, 17],
]

/**
 * Original dark-fantasy hero confirmation: a steel blade-draw scrape, a hilt striking an
 * oath bell (D5), an answering A5 bell a fifth above, drifting embers and a baked stone-hall tail.
 */
export function renderHeroSelectSample(rate: number): Float32Array {
  const pcm = new Float32Array(Math.ceil(HERO_SELECT_SECONDS * rate))
  const tau = 2 * Math.PI
  const pole = (hz: number) => 1 - Math.exp(-tau * hz / rate)
  const lowPole = pole(2200), highPole = pole(7500), airPole = pole(900), dcPole = pole(24)
  const strike = .03, answer = .125
  const reflections = [[.023, .2], [.041, -.12], [.067, .09]].map(([d, g]) => [Math.round(d! * rate), g!] as const)
  // Each partial is a damped phasor (sin(ωs + φ)·e^(−ds)) advanced by one complex multiply per
  // sample instead of sin + exp: this render runs synchronously on the first selection tap.
  const strikeAt = Math.round(strike * rate), answerAt = Math.round(answer * rate)
  const partials = [
    ...BELL.map(([ratio, gain, decay]) => ({ at: strikeAt, f: 587.33 * ratio, gain, decay, phase: 0 })),
    ...BELL.map(([ratio, gain, decay]) => ({ at: answerAt, f: 880 * ratio, gain: gain * .5, decay: decay * 1.15, phase: ratio })),
  ].map(p => {
    const w = tau * p.f / rate, r = Math.exp(-p.decay / rate)
    return { ...p, c: r * Math.cos(w), sn: r * Math.sin(w), re: Math.cos(p.phase), im: Math.sin(p.phase) }
  })
  let seed = 9203, low = 0, high = 0, air = 0, dc = 0, peak = 0, ember = 0, scrapePhase = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = seed / 2147483648 - 1
    low += (noise - low) * lowPole
    high += (noise - high) * highPole
    air += (noise - air) * airPole
    // Blade draw: bright noise band plus a rising steel resonance, swelling into the strike.
    const draw = t < strike ? Math.sin(Math.PI * .5 * t / strike) : Math.exp(-(t - strike) * 60)
    scrapePhase += tau * (1900 + 2400 * Math.min(1, t / strike)) / rate
    const scrape = draw * ((high - low) * .5 + Math.sin(scrapePhase) * .06 * (1 + noise * .5))
    const s = t - strike
    let hit = 0, bell = 0
    // Hilt contact: short broadband click and a light armoured thud (kept small for speaker clarity).
    if (s >= 0 && s < .12) hit = (high - air) * .55 * Math.exp(-s * 140) + Math.sin(tau * (150 * s - 40 * s * s)) * .12 * Math.exp(-s * 38)
    for (const p of partials) {
      if (i < p.at) continue
      const ramp = Math.min(1, (i - p.at) / (rate * (p.at === strikeAt ? .002 : .003)))
      bell += p.im * p.gain * ramp
      const re = p.re * p.c - p.im * p.sn
      p.im = p.re * p.sn + p.im * p.c
      p.re = re
    }
    // Sparse embers: seeded crackles thinning out over the tail.
    if (s > .05 && (seed & 1023) < 9 * Math.exp(-s * 4)) ember = (noise > 0 ? 1 : -1) * .16
    ember *= .82
    const embers = ember + (high - low) * .03 * (s > 0 ? Math.exp(-s * 6) : 0)
    let room = 0
    for (const [delay, gain] of reflections) if (i >= delay) room += pcm[i - delay]! * gain
    const mixed = Math.tanh(scrape + hit + bell + embers + room)
    dc += (mixed - dc) * dcPole
    const value = (mixed - dc) * Math.min(1, (pcm.length - 1 - i) / (rate * .08))
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak > 0 ? HERO_SELECT_PEAK / peak : 0
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
  pcm[0] = 0
  pcm[pcm.length - 1] = 0
  return pcm
}
