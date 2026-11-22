import type { CombatIntensity } from './types'

/** Schedules one oscillator note (the engine's `audioTone`). */
export type ToneFn = (midi: number, at: number, dur: number, vol: number, wave: OscillatorType, bus: 'sfx' | 'music') => void

export interface Score {
  /** Set the next-note time (original `menuNoteTime` / `noteTime` assignments). */
  setClock(t: number): void
  /** Queue notes that fall inside the lookahead window starting at `now`. */
  schedule(now: number, tone: ToneFn): void
}

export interface BattleScore extends Score {
  setIntensity(intensity: CombatIntensity): void
}

export interface MenuScore extends Score {
  /** Restart the motif from its first beat (original `menuStep = 0`). */
  resetStep(): void
}

const MENU_ROOTS = [45, 41, 43, 40]
// Original title theme: a brighter A-minor procession with an audible lead,
// low string pulses and ceremonial accents. One phrase per chord.
const MENU_MELODY = [
  69, 72, 76, 74, 72, 69, 72, 76,
  77, 76, 72, 69, 72, 74, 72, 69,
  71, 74, 79, 77, 74, 71, 74, 79,
  76, 74, 71, 68, 71, 74, 76, 69,
]

/** Layered dark-fantasy title music; no downloaded assets or realtime allocations. */
export function createMenuScore(): MenuScore {
  let noteTime = 0
  let step = 0
  return {
    setClock(t) { noteTime = t },
    resetStep() { step = 0 },
    schedule(now, tone) {
      if (noteTime < now - 0.5) noteTime = now + 0.04
      let queued = 0
      while (noteTime < now + 0.2 && queued++ < 2) {
        const root = MENU_ROOTS[Math.floor(step / 8) % MENU_ROOTS.length]!
        const beat = step % 8
        if (beat === 0) {
          tone(root + 12, noteTime, 1.8, 0.06, 'triangle', 'music')
          tone(root + 19, noteTime + 0.04, 1.5, 0.04, 'triangle', 'music')
          tone(root + 24, noteTime + 0.07, 1.2, 0.024, 'sine', 'music')
        }
        // A crisp low-string ostinato is audible even on small phone speakers.
        if (beat % 2 === 0) tone(root, noteTime, 0.16, beat === 0 ? 0.11 : 0.08, 'sawtooth', 'music')
        if (beat === 2 || beat === 6) tone(root + 12, noteTime, 0.11, 0.055, 'sawtooth', 'music')
        const melody = MENU_MELODY[step % MENU_MELODY.length]!
        tone(melody, noteTime, beat === 3 || beat === 7 ? 0.15 : 0.23, beat % 2 === 0 ? 0.13 : 0.10, 'triangle', 'music')
        if (beat === 0 || beat === 4) tone(melody - 12, noteTime + 0.04, 0.22, 0.03, 'sine', 'music')
        noteTime += 0.3
        step++
      }
    },
  }
}

export const BATTLE_TUNE: ReadonlyArray<number | null> = [
  72, 76, 79, 76, 74, 72, 69, null, 70, 74, 77, 74, 72, 70, 67, null,
  72, 76, 79, 81, 79, 76, 74, 72, 69, 72, 76, 74, 72, 69, 67, null,
]
const BATTLE_ROOTS = [48, 46, 43, 45]

/** Battle melody used while the MP3 score is paused/unavailable (original `music`, minus the gate). */
export function createBattleScore(): BattleScore {
  let noteTime = 0
  let step = 0
  let intensity: CombatIntensity = 'calm'
  return {
    setClock(t) { noteTime = t },
    setIntensity(next) { intensity = next },
    schedule(now, tone) {
      if (noteTime < now - 0.2) noteTime = now + 0.04
      let count = 0
      while (noteTime < now + 0.17 && count++ < 3) {
        const i = step % 32
        if (i % 8 === 0) {
          const root = BATTLE_ROOTS[Math.floor(i / 8)]
          tone(root, noteTime, 1.15, 0.034, 'sine', 'music')
          tone(root + 12, noteTime, 0.92, 0.015, 'triangle', 'music')
          tone(root + 19, noteTime, 1.1, 0.012, 'sine', 'music')
          if (intensity === 'boss') tone(root - 12, noteTime, 0.78, 0.038, 'sawtooth', 'music')
        }
        const melody = BATTLE_TUNE[i]
        if (melody != null) tone(melody + (intensity === 'boss' ? -12 : 0), noteTime, 0.32, intensity === 'boss' ? 0.028 : 0.024, 'triangle', 'music')
        if (i % 4 === 2) tone(60 + Math.floor(i / 8) * 2, noteTime, 0.14, 0.013, 'sine', 'music')
        if (intensity !== 'calm' && i % 4 === 0) tone(36, noteTime, 0.1, intensity === 'boss' ? 0.032 : 0.015, 'triangle', 'music')
        noteTime += intensity === 'boss' ? 0.26 : 0.34
        step++
      }
    },
  }
}
