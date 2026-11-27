/** Original one-shot Hall Foley: authored metal, glass, magic, low resonance and chamber reflections.
 * A finite palette shared by all nodes; no third-party samples, gameplay RNG or extra AudioContext. */
const PALETTE = {
  hover:     { seconds: .12, peak: .19, strike: 580, notes: [880, 1320], onset: .009, step: .026, decay: 34, charge: .035, bass: 0, metal: .07, air: .035 },
  inspect:   { seconds: .28, peak: .34, strike: 340, notes: [523.25, 783.99, 1046.5], onset: .018, step: .043, decay: 17, charge: .095, bass: 196, metal: .12, air: .07 },
  deny:      { seconds: .36, peak: .34, strike: 110, notes: [293.66, 207.65], onset: .03, step: .09, decay: 15, charge: .065, bass: 98, metal: .17, air: .025 },
  rank:      { seconds: .74, peak: .65, strike: 143, notes: [261.63, 392, 523.25], onset: .12, step: .065, decay: 7, charge: .32, bass: 130.81, metal: .21, air: .12 },
  'rank-2': { seconds: .78, peak: .67, strike: 174, notes: [293.66, 440, 587.33, 739.99], onset: .105, step: .075, decay: 7.4, charge: .30, bass: 146.83, metal: .23, air: .13 },
  'rank-3': { seconds: .84, peak: .70, strike: 130.81, notes: [220, 329.63, 440, 659.25], onset: .09, step: .093, decay: 6.2, charge: .35, bass: 110, metal: .26, air: .14 },
  'rank-4': { seconds: .91, peak: .74, strike: 164.81, notes: [246.94, 369.99, 493.88, 739.99, 987.77], onset: .10, step: .08, decay: 5.8, charge: .40, bass: 123.47, metal: .28, air: .18 },
  milestone: { seconds: .90, peak: .68, strike: 123.47, notes: [246.94, 311.13, 369.99, 493.88, 622.25, 987.77], onset: .065, step: .075, decay: 4.8, charge: .31, bass: 123.47, metal: .20, air: .21 },
  route:     { seconds: .92, peak: .71, strike: 196, notes: [293.66, 440, 587.33, 880], onset: .11, step: .15, decay: 8, charge: .37, bass: 146.83, metal: .15, air: .19 },
  equipment: { seconds: .86, peak: .72, strike: 95, notes: [196, 293.66, 392], onset: .18, step: .075, decay: 7, charge: .22, bass: 98, metal: .32, air: .055 },
  keystone: { seconds: 1.14, peak: .77, strike: 116, notes: [174.61,261.63,349.23,523.25,698.46], onset: .14, step: .09, decay: 5.5, charge: .39, bass: 87.31, metal: .32, air: .14 },
  signature: { seconds: 1.27, peak: .78, strike: 185, notes: [220,329.63,554.37,659.25,880], onset: .16, step: .105, decay: 5.1, charge: .46, bass: 110, metal: .23, air: .23 },
  resonance: { seconds: 1.42, peak: .79, strike: 146, notes: [293.66,392,587.33,784,1174.66,1568], onset: .14, step: .14, decay: 5.2, charge: .52, bass: 73.42, metal: .18, air: .26 },
  attune: { seconds: .58, peak: .51, strike: 440, notes: [440,659.25,880], onset: .055, step: .06, decay: 10, charge: .18, bass: 220, metal: .10, air: .13 },
  'signature-attune': { seconds: .78, peak: .61, strike: 294, notes: [293.66,440,739.99,880], onset: .075, step: .07, decay: 8, charge: .28, bass: 146.83, metal: .13, air: .19 },
  'resonance-attune': { seconds: .94, peak: .66, strike: 392, notes: [261.63,392,523.25,783.99,1046.5], onset: .065, step: .11, decay: 7, charge: .35, bass: 130.81, metal: .12, air: .25 },
  release: { seconds: .48, peak: .44, strike: 260, notes: [659.25,440,293.66], onset: .035, step: .085, decay: 9, charge: .19, bass: 146.83, metal: .09, air: .15 },
  blessing:  { seconds: 1.02, peak: .69, strike: 392, notes: [329.63, 440, 659.25, 880, 1046.5], onset: .11, step: .086, decay: 5.5, charge: .43, bass: 164.81, metal: .08, air: .22 },
} as const

type RankCue = 'rank' | 'rank-2' | 'rank-3' | 'rank-4' | 'milestone'
export type HallCue = keyof typeof PALETTE | `${RankCue}-route`
export const HALL_UPGRADE = { rank: 1, milestone: 2, route: 3, equipment: 4, blessing: 5, keystone:16, signature:17, resonance:18, attune:19, signatureAttune:20, resonanceAttune:21, release:22 } as const
const REWARD_CUES: readonly HallCue[] = ['rank', 'milestone', 'route', 'equipment', 'blessing', 'rank-2', 'rank-3', 'rank-4']
const RANK_CUES = ['rank', 'rank-2', 'rank-3', 'rank-4', 'milestone'] as const
const RANK_VARIANTS = [1, 6, 7, 8, 2] as const
/** Stage-specific cues plus a single mixed destination finale; future caps keep the final stage distinct. */
export function hallRankVariant(rank: number, cap: number, unlock: boolean): number {
  const stage = rank >= cap && cap > 0 ? 4 : Math.max(0, Math.min(3, Math.floor(rank) - 1))
  return unlock ? 11 + stage : RANK_VARIANTS[stage]!
}

/** Explicitly scoped variants keep ordinary combat upgrades and all generic UI sounds unchanged. */
export function hallCueKey(cue: string, variant?: number): HallCue | undefined {
  if (variant === undefined) return undefined
  if (cue === 'upgrade') {
    const ceremony = (['keystone','signature','resonance','attune','signature-attune','resonance-attune','release'] as const)[variant-16]
    if (ceremony) return ceremony
    const rank = RANK_CUES[variant - 11]
    return rank ? `${rank}-route` : REWARD_CUES[variant - 1]
  }
  if (variant !== 1) return undefined
  return cue === 'hover' ? 'hover' : cue === 'select' ? 'inspect' : cue === 'deny' ? 'deny' : undefined
}

export function renderHallCue(rate: number, kind: HallCue): Float32Array {
  if (kind.endsWith('-route')) {
    // One cached one-shot: source strike stays audible, then the downstream
    // arrival glints at 680ms with the visual destination pulse.
    const base = renderHallCue(rate, kind.slice(0, -6) as RankCue)
    const arrival = renderHallCue(rate, 'route')
    const offset = Math.round(rate * .68)
    const mix = new Float32Array(Math.max(base.length, offset + arrival.length))
    for (let i = 0; i < base.length; i++) mix[i] = base[i]! * .83
    for (let i = 0; i < arrival.length; i++) mix[offset + i] = Math.tanh(mix[offset + i]! + arrival[i]! * .72)
    return mix
  }
  if (kind === 'milestone') {
    // The last ordinary rank is the recognizable opening. At the crest's
    // inscription, answer it with a B-major bell chord and a lower octave.
    // Render once into the same cached buffer: no separate voices or timers.
    const motif = renderPalette(rate, 'rank-4')
    const finale = renderPalette(rate, 'milestone')
    const offset = Math.round(rate * .52)
    const pcm = new Float32Array(Math.max(motif.length, offset + finale.length))
    for (let i = 0; i < motif.length; i++) pcm[i] = motif[i]! * .86
    for (let i = 0; i < finale.length; i++) pcm[offset + i] = pcm[offset + i]! + finale[i]! * .74
    const peak = pcm.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
    const gain = peak > 0 ? .78 / peak : 0
    for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i]! * gain
    return pcm
  }
  return renderPalette(rate, kind as keyof typeof PALETTE)
}

function renderPalette(rate: number, kind: keyof typeof PALETTE): Float32Array {
  const p = PALETTE[kind]
  const pcm = new Float32Array(Math.ceil(rate * p.seconds))
  const tau = 2 * Math.PI
  const delays = [.019, .037, .067, .113].map(t => Math.max(1, Math.round(rate * t)))
  const reflections = [.14, -.085, .067, -.035]
  const lowpass = 1 - Math.exp(-tau * 1700 / rate)
  const highpass = 1 - Math.exp(-tau * 22 / rate)
  const direction = kind === 'deny' || kind === 'release' ? -1 : 1
  const grand = kind === 'milestone' || kind === 'keystone' || kind === 'signature' || kind === 'resonance'
  const weight = grand ? 1 : p.seconds >= .58 ? .45 : .12
  let seed = 7193, filtered = 0, dc = 0, peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = seed / 2147483648 - 1
    filtered += (noise - filtered) * lowpass
    const ring = Math.sin(tau * p.strike * t) * .7 + Math.sin(tau * p.strike * 6.553 * t) * .22 + Math.sin(tau * p.strike * 10.29 * t) * .12
    const latch = p.metal * ((noise - filtered) * .63 * Math.exp(-t * 95) + ring * Math.exp(-t * 29))
    const chargeEnvelope = t < p.charge ? Math.sin(Math.PI * t / p.charge) ** 2 : 0
    const phase = tau * (190 * t + direction * 630 * t * t)
    const charge = (filtered * p.air + Math.sin(phase) * .105 + Math.sin(phase * 2.013) * .033) * chargeEnvelope
    let chimes = 0
    for (let n = 0; n < p.notes.length; n++) {
      const u = t - (p.onset + n * p.step)
      if (u < 0) continue
      const frequency = p.notes[n]!
      const envelope = (1 - Math.exp(-u * 240)) * Math.exp(-u * p.decay)
      chimes += (Math.sin(tau * frequency * u) * .10
        + Math.sin(tau * frequency * 2.01 * u) * .042 * Math.exp(-u * 5)
        + Math.sin(tau * frequency * 3.17 * u) * .021 * Math.exp(-u * 12)) * envelope
    }
    const v = t - p.onset
    const bloom = p.bass && v > 0 ? (Math.sin(tau * p.bass * v) + .24 * Math.sin(tau * p.bass * 2 * v)) * .12 * (1 - Math.exp(-v * 40)) * Math.exp(-v * (p.decay + 1)) : 0
    const k = t - .095
    const forged = kind === 'equipment' && k > 0 ? (Math.sin(tau * 690 * k) * .095 + (noise - filtered) * .11) * Math.exp(-k * 45) : 0
    const room = delays.reduce((sum, delay, n) => sum + (i >= delay ? pcm[i - delay]! * reflections[n]! : 0), 0)
    // A voiced low register, second anvil strike and slowly opening harmonic tail
    // add body without increasing the peak or prolonging interaction latency.
    const u = t - p.onset
    const body = p.bass && u > 0 ? weight * .18 * (1 - Math.exp(-u*38)) * Math.exp(-u*3.3) *
      (Math.sin(tau*p.bass*u) + .36*Math.sin(tau*p.bass*2*u)) : 0
    const tailTime = t - p.seconds*.42
    const tail = grand && tailTime > 0 ? .19 * Math.sin(Math.PI*Math.min(1,tailTime/(p.seconds*.58))) *
      (Math.sin(tau*p.notes[0]*tailTime) + .46*Math.sin(tau*p.notes[p.notes.length-1]!*tailTime)) : 0
    const strikeTime=t-p.onset-.085
    const second=weight*.12*(strikeTime>0?Math.exp(-strikeTime*24)*(Math.sin(tau*p.strike*2.71*strikeTime)+.28*(noise-filtered)):0)
    const mixed = Math.tanh((latch + charge + chimes + bloom + forged + body + tail + second) * 1.35 + room)
    dc += (mixed - dc) * highpass
    const fade = Math.min(1, t / .003, (pcm.length - 1 - i) / (rate * Math.min(.07, p.seconds * .18)))
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

// Compatibility with the existing rank/milestone sample tests.
export function renderHallUpgradeSample(rate: number, milestone: boolean): Float32Array {
  return renderHallCue(rate, milestone ? 'milestone' : 'rank')
}
