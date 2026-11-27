/** Original dark-fantasy hero confirmation: bronze latch, E-minor resonance and short stone-room tail. */
export function renderHeroSelectSample(rate: number): Float32Array {
  const pcm = new Float32Array(Math.ceil(.44 * rate))
  const tau = 2 * Math.PI
  const lowPole = 1 - Math.exp(-tau * 380 / rate)
  const highPole = 1 - Math.exp(-tau * 3400 / rate)
  const dcPole = 1 - Math.exp(-tau * 22 / rate)
  const reflection = Math.round(.027 * rate), reflection2 = Math.round(.053 * rate)
  let seed = 7411, low = 0, high = 0, dc = 0, peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = seed / 2147483648 - 1
    low += (noise - low) * lowPole
    high += (noise - high) * highPole
    // A soft leather/bronze contact gives the selection a tangible onset.
    const contact = (high - low) * .34 * Math.exp(-t * 95)
    const weight = Math.sin(tau * (82 * t + .65 * (1 - Math.exp(-t * 32)))) * .32 * Math.exp(-t * 24)
    const metal = (Math.sin(tau * 643 * t) * .15 * Math.exp(-t * 18)
      + Math.sin(tau * 1079 * t) * .10 * Math.exp(-t * 28)
      + Math.sin(tau * 1921 * t) * .065 * Math.exp(-t * 46))
    const u = Math.max(0, t - .025)
    const v = Math.max(0, t - .065)
    const body = (Math.sin(tau * 164.814 * t) * .21 + Math.sin(tau * 246.942 * t) * .10) * Math.exp(-t * 10)
    const seal = (Math.sin(tau * 391.995 * u) * .12 + Math.sin(tau * 659.255 * v) * .085)
      * (1 - Math.exp(-u * 80)) * Math.exp(-u * 9)
    const air = (high - low) * .075 * (1 - Math.exp(-u * 90)) * Math.exp(-u * 11)
    const room = (i >= reflection ? pcm[i - reflection]! * .22 : 0)
      - (i >= reflection2 ? pcm[i - reflection2]! * .13 : 0)
    const dry = (contact + weight + metal + body + seal + air) * Math.min(1, t / .003)
    const mixed = Math.tanh(dry + room)
    dc += (mixed - dc) * dcPole
    const value = (mixed - dc) * Math.min(1, (pcm.length - 1 - i) / (rate * .065))
    pcm[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const gain = peak > 0 ? .42 / peak : 0
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
  return pcm
}
