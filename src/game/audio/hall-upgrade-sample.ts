/** Authored one-shot metal latch, rising arcane energy, harmonic chimes and short chamber reflections.
 * Separate rank/milestone variants; deterministic, no gameplay RNG or external recordings. */
export function renderHallUpgradeSample(rate: number, milestone: boolean): Float32Array {
  const seconds = milestone ? 1.05 : .74
  const pcm = new Float32Array(Math.ceil(rate * seconds))
  const tau = 2 * Math.PI
  const bell = milestone ? [196, 293.66, 392, 493.88, 587.33] : [261.63, 392, 523.25]
  const delays = [.029, .047, .079, .121].map(t => Math.round(rate * t))
  let seed = 7193, filtered = 0, dc = 0, peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = seed / 2147483648 - 1
    filtered += (noise - filtered) * (1 - Math.exp(-tau * 1700 / rate))
    const latch = (noise - filtered) * .13 * Math.exp(-t * 85)
      + (Math.sin(tau * 143 * t) * .21 + Math.sin(tau * 937 * t) * .075
      + Math.sin(tau * 1471 * t) * .04) * Math.exp(-t * 27)
    const rise = Math.sin(Math.PI * Math.min(1, t / .32)) ** 2 * (t < .32 ? 1 : 0)
    const charge = (filtered * .12 + Math.sin(tau * (160 * t + 650 * t * t)) * .11
      + Math.sin(tau * (321 * t + 1300 * t * t)) * .038) * rise
    let chimes = 0
    for (let n = 0; n < bell.length; n++) {
      const u = t - (.12 + n * (milestone ? .075 : .065))
      if (u < 0) continue
      const f = bell[n]!
      const envelope = (1 - Math.exp(-u * 240)) * Math.exp(-u * (milestone ? 5 : 7))
      chimes += (Math.sin(tau * f * u) * .10
        + Math.sin(tau * f * 2.01 * u) * .042 * Math.exp(-u * 5)
        + Math.sin(tau * f * 3.17 * u) * .021 * Math.exp(-u * 12)) * envelope
    }
    const v = t - .21
    const bloom = v > 0 ? Math.sin(tau * (milestone ? 98 : 130.81) * v) * .13 * (1 - Math.exp(-v * 40)) * Math.exp(-v * 8) : 0
    const room = delays.reduce((sum, delay, n) => sum + (i >= delay ? pcm[i - delay]! * [.13, -.09, .075, -.04][n]! : 0), 0)
    const mixed = Math.tanh((latch + charge + chimes + bloom) * 1.35 + room)
    dc += (mixed - dc) * (1 - Math.exp(-tau * 22 / rate))
    const fade = Math.min(1, t / .003, (pcm.length - 1 - i) / (rate * .07))
    const value = (mixed - dc) * Math.max(0, fade)
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak > 0 ? (milestone ? .78 : .65) / peak : 0
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
  pcm[0] = 0
  pcm[pcm.length - 1] = 0
  return pcm
}
