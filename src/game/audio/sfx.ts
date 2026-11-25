import type { SfxCue } from '../types'

/** `[midi pitch, start delay s, duration s, gain, oscillator wave]` — original `sfxCues` tuples. */
export type SfxTone = readonly [number, number, number, number, OscillatorType]

/** Minimum seconds between two plays of the same cue (original `sfxCooldown`). */
export const SFX_COOLDOWN: Record<SfxCue, number> = {
  ui: 0.07, hover: 0.15, select: 0.09, start: 0.4, pause: 0.2, resume: 0.2, upgrade: 0.1, level: 0.26,
  dash: 0.28, knight: 0.12, ranger: 0.1, wizard: 0.15, chain: 0.23, kill: 0.14, killStreak: 0.65, massKill: 0.65, boss: 0.8, bossStagger: 0.8, bossDefeat: 0.8,
  treasureReveal: .35, treasureClaim: .35,
  hitNormal: 0.12, hitHeavy: 0.18, hitCritical: 0.22, hitElemental: .22, hitEvolved: .32, hitHero: .35, eliteKill: 0.45,
  hurt: 0.28, pickup: 0.16, pickupBurst: 0.28, evolution: 0.5, scene: 0.45, deny: 0.22, victory: 1, defeat: 1, bolt: 0.3, frost: 0.5, meteor: 0.45, vortex: 0.5,
  'shadowblade-special': 0.55, 'spirit-summoner-special': 0.9, 'crimson-paladin-special': 0.75,
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
  massKill: [[43, 0, 0.12, 0.055, 'triangle'], [62, 0.035, 0.2, 0.045, 'sawtooth'], [74, 0.09, 0.25, 0.035, 'sine']],
  killStreak: [[48, 0, 0.18, 0.055, 'triangle'], [60, 0.04, 0.27, 0.05, 'sawtooth'], [67, 0.12, 0.3, 0.04, 'triangle'], [76, 0.23, 0.4, 0.035, 'sine']],
  boss: [[38, 0, 0.65, 0.075, 'sawtooth'], [45, 0.13, 0.79, 0.04, 'triangle']],
  bossStagger: [[36, 0, 0.23, 0.07, 'triangle'], [55, 0.025, 0.24, 0.05, 'sawtooth'], [67, 0.12, 0.38, 0.035, 'sine'], [79, 0.2, 0.4, 0.025, 'triangle']],
  bossDefeat: [[52, 0, 0.4, 0.076, 'triangle'], [59, 0.2, 0.54, 0.055, 'sine'], [64, 0.34, 0.68, 0.05, 'sine']],
  treasureReveal: [[60,0,.18,.035,'triangle'],[72,.08,.32,.028,'sine']],
  treasureClaim: [[67,0,.16,.04,'triangle'],[79,.08,.24,.034,'sine'],[84,.18,.32,.024,'sine']],
  hitNormal: [[45, 0, .07, .025, 'triangle'], [76, .012, .055, .016, 'sine']],
  hitHeavy: [[31, 0, .14, .055, 'triangle'], [43, .012, .13, .032, 'sawtooth'], [65, .04, .18, .024, 'triangle']],
  hitCritical: [[38, 0, .12, .049, 'triangle'], [77, .015, .11, .035, 'sawtooth'], [89, .05, .2, .028, 'sine'], [96, .12, .22, .016, 'sine']],
  hitElemental: [[79, 0, .09, .028, 'sawtooth'], [91, .02, .13, .023, 'triangle'], [84, .07, .18, .018, 'sine']],
  hitEvolved: [[33, 0, .19, .044, 'triangle'], [57, .025, .17, .034, 'sawtooth'], [76, .09, .24, .023, 'sine']],
  hitHero: [[41, 0, .15, .047, 'triangle'], [65, .015, .19, .033, 'triangle'], [84, .08, .25, .025, 'sine'], [91, .16, .23, .016, 'sine']],
  eliteKill: [[36, 0, .21, .048, 'triangle'], [48, .05, .25, .036, 'sawtooth'], [67, .13, .28, .027, 'sine']],
  hurt: [[42, 0, 0.2, 0.07, 'sawtooth'], [35, 0.06, 0.19, 0.05, 'triangle'], [30, 0.12, 0.13, 0.022, 'sine']],
  pickup: [[81, 0, 0.1, 0.033, 'sine'], [88, 0.06, 0.16, 0.025, 'triangle'], [93, 0.12, 0.15, 0.014, 'sine']],
  pickupBurst: [[72, 0, 0.14, 0.05, 'triangle'], [84, 0.04, 0.18, 0.044, 'sine'], [88, 0.09, 0.2, 0.03, 'triangle'], [96, 0.14, 0.24, 0.022, 'sine']],
  evolution: [[43, 0, 0.38, 0.065, 'triangle'], [55, 0.04, 0.4, 0.055, 'sawtooth'], [67, 0.14, 0.45, 0.042, 'triangle'], [79, 0.24, 0.48, 0.035, 'sine'], [91, 0.36, 0.5, 0.025, 'sine']],
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
}

/** Cues that also get a short percussive noise burst. */
export const NOISE_CUES: ReadonlySet<SfxCue> = new Set<SfxCue>(['knight', 'dash', 'hurt', 'boss'])

/** Precomputed, distinct musical accents; no additional per-hit audio allocation. */
const STREAK_TONES: Readonly<Record<number, readonly SfxTone[]>> = {
  10: SFX_CUES.killStreak,
  25: [[43,0,.22,.052,'triangle'],[55,.06,.24,.045,'sawtooth'],[67,.15,.32,.033,'triangle'],[79,.23,.45,.028,'sine']],
  50: [[36,0,.28,.058,'triangle'],[55,.04,.25,.046,'sawtooth'],[64,.12,.34,.037,'triangle'],[76,.22,.42,.029,'sine'],[88,.36,.35,.018,'sine']],
  100: [[31,0,.35,.065,'triangle'],[43,.04,.36,.046,'sawtooth'],[55,.14,.4,.038,'triangle'],[67,.26,.46,.031,'sine'],[79,.4,.4,.025,'sine']],
  200: [[28,0,.39,.064,'triangle'],[40,.035,.42,.048,'sawtooth'],[55,.13,.45,.042,'triangle'],[64,.26,.49,.033,'sine'],[76,.4,.53,.025,'sine'],[88,.53,.48,.018,'sine']],
  500: [[24,0,.48,.07,'triangle'],[36,.04,.45,.049,'sawtooth'],[48,.16,.46,.043,'triangle'],[67,.29,.55,.036,'sine'],[79,.46,.62,.029,'sine'],[91,.64,.65,.02,'sine']],
}
export function milestoneTones(count: number): readonly SfxTone[] {
  return STREAK_TONES[count] ?? SFX_CUES.killStreak
}

const TREASURE_TONES: readonly (readonly SfxTone[])[] = [
  SFX_CUES.treasureReveal,
  [[55,0,.18,.035,'triangle'],[67,.09,.25,.035,'sine'],[79,.18,.30,.025,'sine']],
  [[48,0,.22,.05,'triangle'],[60,.07,.30,.036,'triangle'],[72,.17,.35,.03,'sine'],[84,.28,.34,.023,'sine']],
  [[36,0,.35,.058,'triangle'],[48,.04,.36,.044,'sawtooth'],[67,.14,.38,.037,'triangle'],[79,.27,.42,.028,'sine'],[91,.40,.48,.02,'sine']],
  [[33,0,.29,.055,'triangle'],[46,.04,.34,.045,'sawtooth'],[58,.14,.36,.033,'triangle'],[65,.24,.38,.025,'sine']],
]
export function treasureTones(tier: number): readonly SfxTone[] {
  return TREASURE_TONES[tier] ?? SFX_CUES.treasureReveal
}

/** Claim celebrates the actual acquired relic, independently of the chest reveal tier. */
const TREASURE_CLAIM_TONES: readonly (readonly SfxTone[])[] = [
  SFX_CUES.treasureClaim,
  [[60,0,.18,.042,'triangle'],[72,.05,.22,.034,'sine'],[84,.14,.28,.025,'sine']],
  [[48,0,.22,.052,'triangle'],[67,.04,.25,.034,'sawtooth'],[79,.12,.3,.027,'triangle'],[91,.23,.34,.018,'sine']],
  [[36,0,.28,.06,'triangle'],[55,.045,.32,.04,'sawtooth'],[67,.14,.38,.035,'triangle'],[79,.27,.42,.027,'sine'],[91,.4,.45,.018,'sine']],
  [[39,0,.22,.05,'triangle'],[46,.03,.24,.036,'sawtooth'],[58,.12,.32,.03,'triangle'],[65,.22,.36,.022,'sine']],
]
export function treasureClaimTones(tier: number): readonly SfxTone[] {
  return TREASURE_CLAIM_TONES[tier] ?? SFX_CUES.treasureClaim
}
