import type { SfxCue } from '../../types'
import type { SfxTone } from '../sfx'

/** Sound events independent of legacy gameplay names. */
export const ES2_CUES = [
  'sword-attack', 'arrow-release', 'arrow-impact', 'spell-cast',
  'elemental-explosion', 'critical-hit', 'damage', 'protection', 'dash',
  'level-up', 'skill-evolution', 'treasure-open', 'rare-loot',
  'ui-select', 'ui-confirm', 'ui-cancel', 'boss-intro', 'boss-death',
  'elite-intro',
] as const
export type Es2Cue = typeof ES2_CUES[number]

export interface CueDefinition {
  readonly legacy: SfxCue
  /** [MIDI, delay sec, duration sec, linear gain, oscillator shape] */
  readonly notes: readonly SfxTone[]
  readonly cooldown: number
  readonly priority?: 'essential'
}

/**
 * Newly composed accent tones are sent through the existing SFX gain bus.
 * Every event also has an existing-engine fallback when no tone port is wired.
 * No samples, soundfonts, downloaded media, or new audio dependencies.
 */
export const CUE_MAP: Record<Es2Cue, CueDefinition> = {
  'sword-attack': { legacy: 'knight', notes: [[54, 0, 0.095, 0.029, 'sawtooth'], [42, 0.028, 0.12, 0.019, 'triangle']], cooldown: 0.115 },
  'arrow-release': { legacy: 'ranger', notes: [[86, 0, 0.065, 0.025, 'triangle'], [79, 0.05, 0.105, 0.014, 'sine']], cooldown: 0.085 },
  'arrow-impact': { legacy: 'kill', notes: [[65, 0, 0.055, 0.027, 'triangle'], [41, 0.02, 0.12, 0.018, 'sine']], cooldown: 0.09 },
  'spell-cast': { legacy: 'wizard', notes: [[72, 0, 0.18, 0.029, 'sine'], [84, 0.065, 0.24, 0.022, 'triangle']], cooldown: 0.13 },
  'elemental-explosion': { legacy: 'meteor', notes: [[43, 0, 0.32, 0.049, 'sawtooth'], [55, 0.04, 0.23, 0.026, 'triangle'], [79, 0.12, 0.2, 0.013, 'sine']], cooldown: 0.32 },
  'critical-hit': { legacy: 'chain', notes: [[81, 0, 0.1, 0.035, 'sawtooth'], [93, 0.04, 0.15, 0.018, 'sine']], cooldown: 0.12 },
  damage: { legacy: 'hurt', notes: [[44, 0, 0.16, 0.029, 'triangle'], [32, 0.07, 0.16, 0.017, 'sine']], cooldown: 0.25, priority: 'essential' },
  protection: { legacy: 'frost', notes: [[76, 0, 0.21, 0.023, 'sine'], [81, 0.055, 0.26, 0.021, 'triangle']], cooldown: 0.22 },
  dash: { legacy: 'dash', notes: [[55, 0, 0.095, 0.03, 'sawtooth'], [74, 0.04, 0.16, 0.02, 'triangle']], cooldown: 0.24 },
  'level-up': { legacy: 'level', notes: [[67, 0, 0.16, 0.028, 'triangle'], [74, 0.09, 0.22, 0.03, 'sine'], [79, 0.21, 0.3, 0.019, 'sine']], cooldown: 0.4, priority: 'essential' },
  'skill-evolution': { legacy: 'upgrade', notes: [[62, 0, 0.3, 0.03, 'triangle'], [74, 0.15, 0.4, 0.026, 'sine'], [86, 0.3, 0.49, 0.023, 'triangle']], cooldown: 0.4, priority: 'essential' },
  'treasure-open': { legacy: 'pickup', notes: [[69, 0, 0.17, 0.018, 'sine'], [76, 0.09, 0.24, 0.027, 'triangle'], [81, 0.2, 0.28, 0.021, 'sine']], cooldown: 0.28 },
  'rare-loot': { legacy: 'upgrade', notes: [[74, 0, 0.21, 0.021, 'sine'], [81, 0.17, 0.28, 0.023, 'triangle'], [88, 0.31, 0.37, 0.023, 'sine']], cooldown: 0.28, priority: 'essential' },
  'ui-select': { legacy: 'hover', notes: [[79, 0, 0.055, 0.015, 'sine']], cooldown: 0.07 },
  'ui-confirm': { legacy: 'select', notes: [[69, 0, 0.085, 0.027, 'triangle'], [81, 0.055, 0.13, 0.016, 'sine']], cooldown: 0.09 },
  'ui-cancel': { legacy: 'pause', notes: [[66, 0, 0.11, 0.02, 'triangle'], [57, 0.07, 0.14, 0.018, 'sine']], cooldown: 0.1 },
  'boss-intro': { legacy: 'boss', notes: [[38, 0, 0.55, 0.053, 'sawtooth'], [50, 0.16, 0.53, 0.03, 'triangle'], [62, 0.33, 0.55, 0.016, 'sine']], cooldown: 1.2, priority: 'essential' },
  'boss-death': { legacy: 'bossDefeat', notes: [[43, 0, 0.36, 0.037, 'sawtooth'], [55, 0.18, 0.46, 0.028, 'triangle'], [67, 0.34, 0.5, 0.019, 'sine']], cooldown: 1.1, priority: 'essential' },
  'elite-intro': { legacy: 'scene', notes: [[46, 0, 0.3, 0.03, 'sawtooth'], [58, 0.08, 0.41, 0.023, 'triangle']], cooldown: 0.8, priority: 'essential' },
}
