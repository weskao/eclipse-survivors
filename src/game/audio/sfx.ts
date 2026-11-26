import type { SfxCue } from '../types'

/** `[midi pitch, start delay s, duration s, gain, oscillator wave]` — original `sfxCues` tuples. */
export type SfxTone = readonly [number, number, number, number, OscillatorType]

/** Minimum seconds between two plays of the same cue (original `sfxCooldown`). */
export const SFX_COOLDOWN: Record<SfxCue, number> = {
  ui: 0.07, hover: 0.15, select: 0.09, start: 0.4, pause: 0.2, resume: 0.2, upgrade: 0.1, level: 0.26,
  dash: 0.28, knight: 0.12, ranger: 0.1, wizard: 0.15, chain: 0.23, kill: 0.14, boss: 0.8, bossDefeat: 0.8,
  hurt: 0.28, 'hurt-heavy': .34, 'hurt-critical': .39, 'hurt-extreme': .48, pickup: 0.16, scene: 0.45, deny: 0.22, victory: 1, defeat: 1, bolt: 0.3, frost: 0.5, meteor: 0.45, vortex: 0.5,
  'shadowblade-special': 0.55, 'spirit-summoner-special': 0.9, 'crimson-paladin-special': 0.75, 'crimson-paladin-retribution': 0.6,
}

export const SFX_CUES: Record<SfxCue, readonly SfxTone[]> = {
  ui: [[72, 0, 0.07, 0.02, 'sine']],
  hover: [[79, 0, 0.06, 0.012, 'sine']],
  select: [[64, 0, 0.13, 0.057, 'triangle'], [76, 0.06, 0.18, 0.039, 'sine']],
  start: [[48, 0, 0.47, 0.085, 'sawtooth'], [55, 0.11, 0.65, 0.05, 'triangle'], [72, 0.18, 0.77, 0.055, 'sine']],
  pause: [[67, 0, 0.12, 0.041, 'sine'], [55, 0.08, 0.25, 0.035, 'triangle']],
  resume: [[55, 0, 0.12, 0.045, 'triangle'], [67, 0.07, 0.2, 0.044, 'sine']],
  upgrade: [[74, 0, 0.12, 0.05, 'triangle'], [79, 0.08, 0.18, 0.045, 'sine'], [86, 0.16, 0.32, 0.035, 'sine'], [98, 0.26, 0.28, 0.018, 'sine']],
  level: [[60, 0, 0.22, 0.05, 'triangle'], [67, 0.11, 0.32, 0.045, 'sine'], [72, 0.23, 0.44, 0.04, 'sine']],
  dash: [[43, 0, 0.16, 0.055, 'sawtooth'], [69, 0.06, 0.22, 0.04, 'triangle']],
  knight: [[53, 0, 0.13, 0.055, 'sawtooth'], [41, 0.035, 0.11, 0.031, 'triangle']],
  ranger: [[79, 0, 0.09, 0.045, 'triangle'], [91, 0.04, 0.12, 0.026, 'sine']],
  wizard: [[71, 0, 0.2, 0.056, 'sine'], [83, 0.08, 0.27, 0.036, 'triangle']],
  chain: [[79, 0, 0.12, 0.053, 'sawtooth'], [91, 0.07, 0.24, 0.04, 'triangle']],
  kill: [[47, 0, 0.13, 0.042, 'triangle'], [35, 0.05, 0.18, 0.023, 'sine']],
  boss: [[38, 0, 0.65, 0.075, 'sawtooth'], [45, 0.13, 0.79, 0.04, 'triangle']],
  bossDefeat: [[52, 0, 0.4, 0.076, 'triangle'], [59, 0.2, 0.54, 0.055, 'sine'], [64, 0.34, 0.68, 0.05, 'sine']],
  hurt: [[42, 0, 0.2, 0.07, 'sawtooth'], [35, 0.06, 0.19, 0.05, 'triangle'], [30, 0.12, 0.13, 0.022, 'sine']],
  // Emergency fallback only: the primary hurt cues use original cached PCM.
  'hurt-heavy': [[34, 0, .22, .075, 'triangle'], [47, .025, .12, .045, 'sine']],
  'hurt-critical': [[38, 0, .20, .075, 'triangle'], [68, .012, .14, .04, 'triangle'], [79, .03, .12, .022, 'sine']],
  'hurt-extreme': [[29, 0, .3, .08, 'triangle'], [41, .018, .21, .05, 'sine'], [57, .03, .15, .035, 'triangle']],
  pickup: [[81, 0, 0.1, 0.033, 'sine'], [88, 0.06, 0.16, 0.025, 'triangle'], [93, 0.12, 0.15, 0.014, 'sine']],
  scene: [[57, 0, 0.35, 0.035, 'sine'], [64, 0.1, 0.52, 0.032, 'triangle'], [76, 0.26, 0.64, 0.022, 'sine']],
  deny: [[56, 0, 0.11, 0.026, 'triangle'], [49, 0.09, 0.18, 0.019, 'sine']],
  victory: [[64, 0, 0.28, 0.043, 'triangle'], [67, 0.13, 0.34, 0.035, 'sine'], [76, 0.29, 0.43, 0.023, 'sine']],
  defeat: [[52, 0, 0.44, 0.06, 'triangle'], [47, 0.2, 0.52, 0.05, 'sawtooth'], [40, 0.44, 0.74, 0.05, 'sine']],
  bolt: [[83, 0, 0.17, 0.045, 'sawtooth'], [95, 0.04, 0.12, 0.035, 'triangle']],
  frost: [[81, 0, 0.3, 0.035, 'sine'], [88, 0.1, 0.46, 0.03, 'triangle']],
  meteor: [[45, 0, 0.39, 0.067, 'sawtooth'], [52, 0.08, 0.34, 0.042, 'triangle']],
  vortex: [[52, 0, 0.5, 0.06, 'triangle'], [59, 0.16, 0.5, 0.033, 'sine']],
  // Shadow: sharp paired blade accents and a descending, dark afterimage.
  'shadowblade-special': [[43, 0, 0.22, 0.078, 'triangle'], [88, 0, 0.09, 0.035, 'sawtooth'], [76, 0.075, 0.13, 0.043, 'sawtooth'], [57, 0.14, 0.25, 0.04, 'triangle'], [31, 0.19, 0.3, 0.045, 'sine']],
  // Spirit: rising spectral layers converge into a soft, airy resonance.
  'spirit-summoner-special': [[48, 0, 0.65, 0.051, 'sine'], [67, 0.025, 0.45, 0.041, 'triangle'], [75, 0.12, 0.55, 0.038, 'sine'], [82, 0.25, 0.68, 0.03, 'sine'], [87, 0.36, 0.69, 0.022, 'triangle']],
  // Paladin: weighty shield impact, metallic overtones and a protective chord.
  'crimson-paladin-special': [[36, 0, 0.36, 0.085, 'triangle'], [48, 0.018, 0.19, 0.052, 'sawtooth'], [79, 0.035, 0.24, 0.032, 'triangle'], [55, 0.13, 0.61, 0.052, 'triangle'], [67, 0.21, 0.58, 0.037, 'sine'], [72, 0.29, 0.55, 0.024, 'sine']],
  // Burst fallback: low blast, fractured overtone, falling ember tail.
  'crimson-paladin-retribution': [[31, 0, 0.42, 0.085, 'sawtooth'], [43, 0.01, 0.3, 0.06, 'triangle'], [86, 0.02, 0.16, 0.03, 'sawtooth'], [62, 0.08, 0.45, 0.04, 'triangle'], [50, 0.2, 0.6, 0.03, 'sine']],
}

/** Cues that also get a short percussive noise burst. */
export const NOISE_CUES: ReadonlySet<SfxCue> = new Set<SfxCue>(['knight', 'dash', 'hurt', 'boss'])
