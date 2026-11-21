import type { GameMode, SfxCue } from '../types'

/** Minimal `<audio>` surface the engine uses for the MP3 score (testable with a fake). */
export interface BgmElement {
  paused: boolean
  volume: number
  currentTime: number
  play(): Promise<void> | void
  pause(): void
}

/** Minimal Storage surface for the saved toggles. */
export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Port of the original audio globals and functions (`ac`, `master`, `musicBus`, `wakeAudio`,
 * `audioTone`, `playSfx`, `menuScore`, `music`, `toggleMusic`, `toggleSfx`, bgm handling in `screen`).
 */
export interface AudioSystem {
  /** true once an AudioContext exists (`window.__test.audio`). */
  readonly unlocked: boolean
  readonly musicOn: boolean
  readonly sfxOn: boolean
  /** Original `wakeAudio()`: lazily create + resume the AudioContext. */
  wake(): void
  playSfx(cue: SfxCue): void
  /** Original `music()`, called once per animation frame with the current mode. */
  tick(mode: GameMode): void
  /** bgm side of original `screen(name)`: pause/rewind/volume/play and menu motif reset. */
  onScreen(mode: GameMode): void
  /** Original `noteTime = ac ? ac.currentTime + delay : 0` (battle tune restart). */
  resetBattleClock(delay: number): void
  /** Original `toggleMusic()`; `mode` decides whether bgm resumes. Returns new musicOn. */
  toggleMusic(mode: GameMode): boolean
  /** Original `toggleSfx()`. Returns new sfxOn. */
  toggleSfx(): boolean
}
