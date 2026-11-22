import type { GameMode } from '../../types'
import type { ToneFn } from '../music'
import type { AudioSystem } from '../types'
import { CUE_MAP, type Es2Cue } from './cues'
import { createEs2Score, type Es2Scene } from './score'

export interface Es2AudioOptions {
  /** The already-created src/game/audio/engine.ts audio instance; never wrap another context. */
  audio: AudioSystem
  /** Current seconds on that SAME AudioContext, supplied by integration. */
  now: () => number
  /** Optional existing engine tone method; omit to use legacy SFX/music fallback. */
  tone?: ToneFn
  /** Check the shared context's state; prevents scheduling while Safari/iOS suspends it. */
  isRunning?: () => boolean
}

export interface Es2AudioAdapter {
  readonly musicOn: boolean
  readonly sfxOn: boolean
  readonly musicVolume: number
  readonly sfxVolume: number
  readonly scene: Es2Scene
  setScene(scene: Es2Scene): void
  /** Only call from trusted user gestures, never from a timer/visibility callback. */
  wakeFromGesture(): void
  interrupt(): void
  /** Resume after mobile/visibility interruption from a trusted user gesture. */
  resumeFromGesture(): void
  /** Replaces audio.tick(mode) once the existing engine tone port is wired. */
  tick(mode: GameMode): void
  /** New semantic cue with legacy SfxCue fallback. */
  play(cue: Es2Cue): void
  setMusicVolume(value: number): void
  setSfxVolume(value: number): void
  toggleMusic(mode: GameMode): boolean
  toggleSfx(): boolean
  /** Drops this extension's state; the engine still owns audio.dispose(). */
  dispose(): void
}

const MAX_CUES_PER_100MS = 8

/**
 * An opt-in extension, not a new audio engine. Existing audio retains AudioContext,
 * HTML media, gain buses, user preference keys, autoplay policy and lifecycle.
 */
export function createEs2AudioAdapter({ audio, now, tone, isRunning }: Es2AudioOptions): Es2AudioAdapter {
  const score = createEs2Score()
  const cooldowns = new Map<Es2Cue, number>()
  const recent: number[] = []
  let scene: Es2Scene = 'menu'
  let interrupted = false
  let disposed = false
  let awake = false

  const musicalMode = (mode: GameMode): boolean =>
    mode === 'menu' || mode === 'play' ||
    (mode === 'result' && (scene === 'victory' || scene === 'defeat'))

  const wake = (): void => {
    if (disposed) return
    audio.wake()
    awake = audio.unlocked
    interrupted = false
    score.resume(now())
  }

  return {
    get musicOn() { return audio.musicOn },
    get sfxOn() { return audio.sfxOn },
    get musicVolume() { return audio.musicVolume },
    get sfxVolume() { return audio.sfxVolume },
    get scene() { return scene },
    setScene(next) {
      if (disposed || scene === next) return
      scene = next
      score.change(next, now())
      audio.setCombatIntensity(next === 'boss' ? 'boss' : next === 'combat' || next === 'battle' || next === 'elite' ? 'combat' : 'calm')
    },
    wakeFromGesture: wake,
    interrupt() {
      if (disposed || interrupted) return
      interrupted = true
      audio.interrupt()
      score.interrupt()
    },
    resumeFromGesture: wake,
    tick(mode) {
      if (disposed || interrupted || !awake || !audio.musicOn || audio.musicVolume <= 0 || !musicalMode(mode) || isRunning?.() === false) return
      if (!tone) {
        // Integration can adopt ES2 cues first and wire music separately.
        audio.tick(mode)
        return
      }
      // The existing musicBus already applies the user's music volume.
      score.schedule(now(), tone, 1)
    },
    play(cue) {
      if (disposed || interrupted || !awake || !audio.sfxOn || audio.sfxVolume <= 0 || isRunning?.() === false) return
      const at = now()
      if (!Number.isFinite(at)) return
      const definition = CUE_MAP[cue]
      if (at - (cooldowns.get(cue) ?? -Infinity) < definition.cooldown) return
      // At most eight timestamps are retained. Critical one-shots can bypass a
      // saturated window, while normal crowd attacks remain bounded.
      while (recent.length && at - recent[0]! >= 0.1) recent.shift()
      if (recent.length >= MAX_CUES_PER_100MS && definition.priority !== 'essential') return
      if (recent.length < MAX_CUES_PER_100MS) recent.push(at)
      cooldowns.set(cue, at)
      audio.playSfx(definition.legacy)
      if (!tone) return
      for (const [pitch, delay, duration, volume, wave] of definition.notes) {
        tone(pitch, at + delay, duration, volume, wave, 'sfx')
      }
    },
    setMusicVolume(value) { if (!disposed) audio.setMusicVolume(value) },
    setSfxVolume(value) { if (!disposed) audio.setSfxVolume(value) },
    toggleMusic(mode) { return disposed ? audio.musicOn : audio.toggleMusic(mode) },
    toggleSfx() { return disposed ? audio.sfxOn : audio.toggleSfx() },
    dispose() {
      if (disposed) return
      disposed = true
      interrupted = true
      awake = false
      score.dispose()
      cooldowns.clear()
      recent.length = 0
      // The shared owner still handles actual AudioContext and media disposal.
    },
  }
}
