import type { ToneFn } from '../music'

/**
 * Original, procedural dark-fantasy themes. All pitches and phrases are authored
 * here: no streamed media, downloaded samples or third-party soundtrack.
 * The host audio engine owns the AudioContext, tone generator and volume bus.
 */
export const ES2_SCENES = [
  'menu', 'exploration', 'combat', 'battle', 'elite', 'boss', 'victory', 'defeat',
] as const
export type Es2Scene = typeof ES2_SCENES[number]

interface Theme {
  readonly melody: readonly (number | null)[]
  readonly roots: readonly number[]
  readonly beat: number
  readonly wave: OscillatorType
  readonly pressure: 0 | 1 | 2 | 3
  readonly oneShot?: boolean
}

// Distinct motifs: ceremonial menu, wandering exploration, ascending tension,
// rapid battle, dissonant elite warning, abyssal boss, resolution and lament.
const THEMES: Record<Es2Scene, Theme> = {
  menu: {
    melody: [69, 72, 76, 74, 72, 69, 67, 64, 69, 72, 77, 76, 74, 72, 69, null],
    roots: [45, 41, 43, 40], beat: 0.34, wave: 'triangle', pressure: 0,
  },
  exploration: {
    melody: [64, 67, 71, null, 69, 67, 64, 62, 64, 67, 72, 71, 69, null, 67, 64],
    roots: [40, 43, 45, 38], beat: 0.46, wave: 'sine', pressure: 0,
  },
  combat: {
    melody: [65, 69, 72, 69, 67, 65, 64, 62, 65, 69, 74, 72, 69, 67, 65, null],
    roots: [41, 38, 43, 40], beat: 0.28, wave: 'triangle', pressure: 1,
  },
  battle: {
    melody: [72, 76, 79, 76, 74, 72, 69, null, 72, 77, 81, 79, 77, 74, 72, 69],
    roots: [48, 46, 43, 45], beat: 0.225, wave: 'sawtooth', pressure: 2,
  },
  elite: {
    melody: [70, 73, 77, 76, 73, 70, 68, null, 70, 75, 78, 77, 73, 70, 65, null],
    roots: [46, 42, 44, 41], beat: 0.27, wave: 'triangle', pressure: 2,
  },
  boss: {
    melody: [60, 63, 67, 66, 63, 60, 58, 54, 60, 65, 68, 67, 65, 63, 58, null],
    roots: [36, 39, 34, 38], beat: 0.205, wave: 'sawtooth', pressure: 3,
  },
  victory: {
    melody: [72, 76, 79, 84, 83, 79, 76, 72, 74, 77, 81, 84, 88, 84, 79, 72],
    roots: [48, 53, 55, 48], beat: 0.29, wave: 'triangle', pressure: 0, oneShot: true,
  },
  defeat: {
    melody: [55, 52, 48, 47, 43, null, 40, null, 52, 48, 45, 43, 40, 36, null, null],
    roots: [40, 36, 38, 33], beat: 0.44, wave: 'sine', pressure: 0, oneShot: true,
  },
}

interface Layer { scene: Es2Scene; nextAt: number; step: number }

const CROSSFADE_SECONDS = 1.2
const LOOKAHEAD_SECONDS = 0.12
const MAX_BEATS_PER_TICK = 3
const clamp = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0

export interface Es2Score {
  readonly currentScene: Es2Scene
  readonly fadingFrom: Es2Scene | null
  change(scene: Es2Scene, now: number): void
  schedule(now: number, tone: ToneFn, level: number): void
  interrupt(): void
  resume(now: number): void
  dispose(): void
}

/** Pure scheduler: never creates or retains an AudioContext, node, or timer. */
export function createEs2Score(): Es2Score {
  let current: Layer = { scene: 'menu', nextAt: 0, step: 0 }
  let previous: Layer | null = null
  let fadeStartedAt = 0
  let initialized = false
  let interrupted = false
  let disposed = false

  const emit = (layer: Layer, now: number, tone: ToneFn, gainAt: (at: number) => number): void => {
    const theme = THEMES[layer.scene]
    if (theme.oneShot && layer.step >= theme.melody.length) return
    // Mobile backgrounding and jank must not cause thousands of catch-up notes.
    if (layer.nextAt < now - 0.3) layer.nextAt = now + 0.02
    let queued = 0
    while (layer.nextAt < now + LOOKAHEAD_SECONDS && queued++ < MAX_BEATS_PER_TICK) {
      if (theme.oneShot && layer.step >= theme.melody.length) break
      const step = layer.step
      const at = layer.nextAt
      const root = theme.roots[Math.floor(step / 4) % theme.roots.length]!
      const melody = theme.melody[step % theme.melody.length]
      const sound = (pitch: number, delay: number, duration: number, volume: number, wave: OscillatorType): void => {
        const level = gainAt(at) * volume
        if (level > 0.0002) tone(pitch, at + delay, duration, Math.min(level, 0.14), wave, 'music')
      }
      if (step % 4 === 0) {
        sound(root, 0, theme.beat * 3.3, 0.044, 'sine')
        sound(root + 12, 0.025, theme.beat * 2, 0.025, 'triangle')
      }
      if (melody !== null) sound(melody, 0, theme.beat * 0.86, 0.082, theme.wave)
      if (step % 2 === 0) sound(root - 12, 0, 0.12, 0.028 + theme.pressure * 0.009, 'triangle')
      if (theme.pressure >= 1 && step % 2 === 1) sound(root + 19, 0.01, 0.09, 0.012, 'sine')
      if (theme.pressure >= 2 && step % 2 === 0) sound(36, 0.015, 0.09, 0.013 + theme.pressure * 0.006, 'sawtooth')
      if (theme.pressure >= 3 && step % 4 === 2) sound(root + 31, 0.04, 0.15, 0.019, 'sawtooth')
      layer.nextAt += theme.beat
      layer.step++
    }
  }

  return {
    get currentScene() { return current.scene },
    get fadingFrom() { return previous?.scene ?? null },
    change(scene, now) {
      if (disposed || !Number.isFinite(now) || (initialized && current.scene === scene)) return
      if (!initialized) {
        current = { scene, nextAt: now, step: 0 }
        initialized = true
        return
      }
      previous = current
      current = { scene, nextAt: now + 0.02, step: 0 }
      fadeStartedAt = now
    },
    schedule(now, tone, level) {
      if (disposed || interrupted || !Number.isFinite(now)) return
      const volume = clamp(level)
      if (volume <= 0) return
      if (!initialized) initialized = true
      if (!previous) {
        emit(current, now, tone, () => volume)
        return
      }
      // Evaluate the fade at each actual note time, not at the RAF time:
      // otherwise the incoming theme loses its first downbeat at gain = 0.
      const fadeInAt = (at: number): number => clamp((at - fadeStartedAt) / CROSSFADE_SECONDS)
      emit(previous, now, tone, at => volume * (1 - fadeInAt(at)))
      emit(current, now, tone, at => volume * fadeInAt(at))
      if (now - fadeStartedAt >= CROSSFADE_SECONDS) previous = null
    },
    interrupt() {
      interrupted = true
      previous = null
    },
    resume(now) {
      if (disposed || !Number.isFinite(now)) return
      interrupted = false
      // Resume from the current phrase without resurrecting previously queued beats.
      current.nextAt = now + 0.02
    },
    dispose() {
      disposed = true
      previous = null
    },
  }
}
