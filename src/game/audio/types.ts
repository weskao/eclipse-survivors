import type { GameMode, SfxCue } from '../types'
import type { ToneFn } from './music'
import type { BossAttackId, BossId } from '../content/bosses/definitions'
import type { BossAttackStage } from '../content/bosses/attack-presentation'

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
export type CombatIntensity = 'calm' | 'combat' | 'boss'

/** Skill/relic selection freezes gameplay, not the expedition soundtrack. */
export const isBattleMusicMode = (mode: GameMode): boolean => mode === 'play' || mode === 'level'

/**
 * Port of the original audio globals and functions (`ac`, `master`, `musicBus`, `wakeAudio`,
 * `audioTone`, `playSfx`, `menuScore`, `music`, `toggleMusic`, `toggleSfx`, bgm handling in `screen`).
 */
export interface AudioSystem {
  /** true once an AudioContext exists (`window.__test.audio`). */
  readonly unlocked: boolean
  /** One shared context/oscillator port for authored ES2 music; no extra AudioContext. */
  createEs2Port?(): { now: () => number; isRunning: () => boolean; tone: ToneFn }
  /** Suppress legacy media and synth only when the ES2 host score is enabled. */
  setExternalScoreActive?(active: boolean): void
  readonly musicOn: boolean
  readonly sfxOn: boolean
  /** User volume preferences from 0 to 100; mute switches remain independent. */
  readonly musicVolume: number
  readonly sfxVolume: number
  setMusicVolume(volume: number): void
  setSfxVolume(volume: number): void
  /** Original `wakeAudio()`: lazily create + resume the AudioContext. */
  wake(): void
  /** Suspend playback on focus, visibility and operating-system interruptions. */
  interrupt(): void
  /** Adapt the score without modifying gameplay rules. */
  setCombatIntensity(intensity: CombatIntensity): void
  /** An actual completed run selects a finite, authored results score; no additional media load. */
  setResultTheme?(theme: 'victory' | 'defeat' | null): void
  /** Sets the authored theme for the actual live boss; optional for test adapters. */
  setBossTheme?(id: BossId | null, phase?: number): void
  /** Set the real upcoming-boss countdown, or null when none is scheduled. */
  setBossWarning?(seconds: number | null): void
  prepareBossAttackAudio?(id: BossId | null): void
  playBossAttack?(id: BossAttackId, stage: BossAttackStage): void
  cancelBossAttackAudio?(): void
  playSfx(cue: SfxCue, milestone?: number): void
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
  /** Stop bgm and close the AudioContext (unmount / HMR); a later wake() starts fresh. */
  dispose(): void
}
