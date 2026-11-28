import type { AudioContextLike, GainLike } from './engine'

type Analyser = Pick<AnalyserNode, 'fftSize' | 'getFloatTimeDomainData'>
type Signal = { peak: number; rmsMax: number; samples: number }
type Tap = { bus: GainLike; node: Analyser; data: Float32Array<ArrayBuffer>; signal: Signal | null }

interface Snapshot {
  audioContext: AudioContextState | 'unavailable'
  interrupted: boolean
  resumePending: boolean
  externalScoreActive: boolean
  bgmEnabled: boolean
  bgmVolume: number
  bgmSource: string
  sfxEnabled: boolean
  sfxVolume: number
  sfxPending: boolean
}

/** Opt-in DEV only. An unconnected analyser output is a passive post-gain tap,
 * not a second playback path. Bus measurements include any remaining combat/UI tails. */
export function createResultAudioDiagnostics(
  snapshot: () => Snapshot,
  graph: () => { context: AudioContextLike | null; music: GainLike | null; sfx: GainLike | null },
) {
  let timer: ReturnType<typeof setInterval> | undefined
  let startedAt = 0
  let nextReport = 0
  let outcome: 'victory' | 'defeat' | null = null
  let bgmScheduled = false
  let sfxScheduled = false
  let resumeError: string | null = null
  let taps: { bgm: Tap | null; sfx: Tap | null } = { bgm: null, sfx: null }
  let attachedContext: AudioContextLike | null = null

  const detach = (): void => {
    for (const tap of [taps.bgm, taps.sfx]) {
      if (!tap) continue
      try {
        ;(tap.bus as GainLike & { disconnect?(destination: object): unknown }).disconnect?.(tap.node)
      } catch { /* diagnostics must never alter playback */ }
    }
    taps = { bgm: null, sfx: null }
    attachedContext = null
  }

  const attach = (): void => {
    const { context, music, sfx } = graph()
    if (!context || !music || !sfx || context === attachedContext) return
    detach()
    attachedContext = context
    const tap = (bus: GainLike): Tap | null => {
      try {
        const node = context.createAnalyser?.()
        if (!node) return null
        node.fftSize = 2048
        const data = new Float32Array(node.fftSize)
        bus.connect(node)
        return { bus, node, data, signal: null }
      } catch { return null }
    }
    // SFX and music are independent taps, never connected to the destination.
    taps.sfx = tap(sfx)
    taps.bgm = tap(music)
  }

  const measure = (tap: Tap | null): void => {
    if (!tap) return
    try {
      tap.node.getFloatTimeDomainData(tap.data)
      let peak = 0, squares = 0
      for (const value of tap.data) {
        if (!Number.isFinite(value)) return
        peak = Math.max(peak, Math.abs(value))
        squares += value * value
      }
      const rms = Math.sqrt(squares / tap.data.length)
      tap.signal = {
        peak: Math.max(tap.signal?.peak ?? 0, peak),
        rmsMax: Math.max(tap.signal?.rmsMax ?? 0, rms),
        samples: (tap.signal?.samples ?? 0) + 1,
      }
    } catch { /* unsupported analyser; leave signal unavailable */ }
  }

  const publish = (): void => {
    if (!outcome) return
    const state = snapshot()
    // New objects prevent lazy DevTools expansion from displaying later mutations.
    console.info('[Audio][Result]', {
      outcome, elapsedMs: Date.now() - startedAt, ...state, bgmScheduled, sfxScheduled, resumeError,
      bgmSignal: taps.bgm?.signal ? { ...taps.bgm.signal } : null,
      sfxSignal: taps.sfx?.signal ? { ...taps.sfx.signal } : null,
    })
  }

  const stop = (): void => {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
    outcome = null
    detach()
  }

  return {
    start(next: 'victory' | 'defeat') {
      stop()
      outcome = next
      startedAt = Date.now()
      nextReport = 1000
      bgmScheduled = false
      sfxScheduled = false
      resumeError = null
      attach()
      publish()
      // Inspect the first 12 seconds only: bounded work and no per-frame logs.
      timer = setInterval(() => {
        attach()
        const state = snapshot()
        if (state.audioContext === 'running' && !state.interrupted) {
          measure(taps.bgm)
          measure(taps.sfx)
        }
        const elapsed = Date.now() - startedAt
        if (elapsed >= nextReport || elapsed >= 12000) {
          publish()
          nextReport = elapsed + 1000
        }
        if (elapsed >= 12000) stop()
      }, 50)
    },
    markMusic() { if (outcome) bgmScheduled = true },
    markSfx() { if (outcome) sfxScheduled = true },
    markResumeError(error: unknown) {
      if (outcome) resumeError = error instanceof Error ? error.message : String(error)
    },
    stop,
  }
}
