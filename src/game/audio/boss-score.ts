import type { BossId } from '../content/bosses/definitions'
import type { ToneFn } from './music'

/**
 * Four original, deterministic dark-fantasy boss themes. The same Web Audio
 * music bus and user volume are used; no additional engine or downloaded music.
 * Each boss keeps its motif while phases add rhythmic and harmonic pressure.
 */
interface Theme {
  readonly bpm: number
  readonly roots: readonly number[]
  readonly melody: readonly (number | null)[]
  readonly lead: OscillatorType
  readonly accent: OscillatorType
}

export const BOSS_THEMES: Record<BossId, Theme> = {
  'abyss-monarch': {
    bpm: 112, roots: [36, 34, 32, 35], lead: 'triangle', accent: 'sawtooth',
    melody: [60, 63, 67, 66, 63, 60, 58, null, 60, 65, 68, 67, 63, 58, 55, null],
  },
  'frost-sovereign': {
    bpm: 96, roots: [38, 41, 36, 43], lead: 'sine', accent: 'triangle',
    melody: [74, 77, 81, 79, 77, null, 72, 74, 76, 79, 82, 81, 77, 74, 72, null],
  },
  'infernal-titan': {
    bpm: 140, roots: [40, 38, 43, 41], lead: 'sawtooth', accent: 'triangle',
    melody: [64, 67, 70, 72, 70, 67, 64, 62, 65, 69, 72, 74, 72, 69, 65, 64],
  },
  'eclipse-seraph': {
    bpm: 126, roots: [45, 41, 46, 44], lead: 'triangle', accent: 'sine',
    melody: [72, 76, 79, 83, 81, 79, 76, null, 74, 78, 81, 84, 83, 79, 76, 72],
  },
}
const LOOKAHEAD = 0.15
const MAX_BEATS = 2

export interface BossScore {
  select(id: BossId | null, phase: number, now: number): void
  schedule(now: number, tone: ToneFn): void
}

export function createBossScore(): BossScore {
  let id: BossId | null = null
  let phase = 1
  let nextAt = 0
  let step = 0

  const emit = (midi: number, at: number, duration: number, volume: number,
    wave: OscillatorType, tone: ToneFn): void => {
    tone(midi, at, duration, volume, wave, 'music')
  }

  return {
    select(next, nextPhase, now) {
      if (next !== id) {
        id = next
        step = 0
        nextAt = Number.isFinite(now) ? now + 0.025 : 0
      }
      phase = Math.max(1, Math.min(3, Number.isFinite(nextPhase) ? Math.floor(nextPhase) : 1))
    },
    schedule(now, tone) {
      if (!id || !Number.isFinite(now)) return
      const theme = BOSS_THEMES[id]
      const pulse = 30 / theme.bpm // eighth notes
      // Never queue a backlog after a pause, frozen tab or overloaded phone.
      if (nextAt < now - 0.35) nextAt = now + 0.02
      let queued = 0
      while (nextAt < now + LOOKAHEAD && queued++ < MAX_BEATS) {
        const at = nextAt
        const beat = step % theme.melody.length
        const root = theme.roots[Math.floor(step / 4) % theme.roots.length]!
        const melody = theme.melody[beat]
        if (beat % 4 === 0) {
          // Distant choir/organ, a bass pedal and a dark fifth.
          emit(root, at, pulse * 3.3, 0.050, 'sine', tone)
          emit(root + 12, at + 0.025, pulse * 2.8, 0.034, 'triangle', tone)
          emit(root + 19, at + 0.04, pulse * 2.3, 0.018, 'sine', tone)
        }
        if (melody !== null) emit(melody, at, pulse * 0.78, 0.078, theme.lead, tone)
        if (beat % 2 === 0) emit(root - 12, at, 0.10, 0.050, theme.accent, tone)
        if (phase >= 2) {
          // The second phase thickens harmony without restarting the melody.
          emit(root + 7, at + 0.012, pulse * 0.62, 0.017, 'triangle', tone)
          if (beat % 2 === 0) emit(36, at, 0.09, 0.035, 'triangle', tone)
        }
        if (phase >= 3) {
          // A faster battle ostinato and darker rhythm for the final phase.
          emit(36, at + 0.03, 0.11, 0.052, 'sawtooth', tone)
          emit(root - 12, at + 0.04, 0.13, 0.038, 'sine', tone)
          emit(root + 12, at + 0.04, pulse * 0.7, 0.022, theme.accent, tone)
          emit(root + 19, at + 0.06, pulse * 0.50, 0.013, 'triangle', tone)
        }
        step++
        nextAt += pulse
      }
    },
  }
}
