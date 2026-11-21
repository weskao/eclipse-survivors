/** Schedules one oscillator note (the engine's `audioTone`). */
export type ToneFn = (midi: number, at: number, dur: number, vol: number, wave: OscillatorType, bus: 'sfx' | 'music') => void

export interface Score {
  /** Set the next-note time (original `menuNoteTime` / `noteTime` assignments). */
  setClock(t: number): void
  /** Queue notes that fall inside the lookahead window starting at `now`. */
  schedule(now: number, tone: ToneFn): void
}

export interface MenuScore extends Score {
  /** Restart the motif from its first beat (original `menuStep = 0`). */
  resetStep(): void
}

const MENU_ROOTS = [45, 41, 43, 40]
const MENU_RUN = [12, 15, 19, 22]

/** A low cinematic minor-key title motif (original `menuScore`, minus the mode/state gate). */
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
        const root = MENU_ROOTS[Math.floor(step / 8) % 4]
        const beat = step % 8
        if (beat === 0) {
          tone(root - 12, noteTime, 2.55, 0.033, 'sine', 'music')
          tone(root + 7, noteTime + 0.12, 2.15, 0.024, 'triangle', 'music')
          tone(root + 15, noteTime + 0.27, 1.7, 0.015, 'sine', 'music')
        }
        if (beat === 2 || beat === 5) tone(root + MENU_RUN[(step >> 1) % 4], noteTime, 0.65, 0.019, 'sine', 'music')
        noteTime += 0.45
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
export function createBattleScore(): Score {
  let noteTime = 0
  let step = 0
  return {
    setClock(t) { noteTime = t },
    schedule(now, tone) {
      if (noteTime < now - 0.2) noteTime = now + 0.04
      let count = 0
      while (noteTime < now + 0.17 && count++ < 3) {
        const i = step % 32
        if (i % 8 === 0) {
          const root = BATTLE_ROOTS[Math.floor(i / 8)]
          tone(root, noteTime, 1.15, 0.034, 'sine', 'sfx')
          tone(root + 12, noteTime, 0.92, 0.015, 'triangle', 'sfx')
          tone(root + 19, noteTime, 1.1, 0.012, 'sine', 'sfx')
        }
        const melody = BATTLE_TUNE[i]
        if (melody != null) tone(melody, noteTime, 0.32, 0.024, 'triangle', 'sfx')
        if (i % 4 === 2) tone(60 + Math.floor(i / 8) * 2, noteTime, 0.14, 0.013, 'sine', 'sfx')
        noteTime += 0.34
        step++
      }
    },
  }
}
