import type { BossId } from '../content/bosses/definitions'
import type { AudioContextLike, AudioSystemOptions, BufferLike, BufferSourceLike, GainLike } from './engine'

interface Voice {
  readonly key: string
  readonly source: BufferSourceLike
  readonly gain: GainLike
  readonly started: number
  readonly offset: number
  readonly duration: number
  readonly loop: boolean
}

/**
 * One sampled soundtrack sequencer inside the existing unlocked Web Audio context.
 * No new AudioContext, media autoplay, per-frame fetch, or timer-driven music.
 * Each phase variation is rendered from the same score and starts at the same
 * musical offset; a short gain crossfade replaces abrupt track restarts.
 */
export function createCinematicMusic(
  opts: Pick<AudioSystemOptions, 'bossTracks' | 'warningTrack' | 'victoryTrack' | 'defeatTrack' | 'loadMusic'>,
  context: () => AudioContextLike | null,
  musicBus: () => GainLike | null,
  allowed: () => boolean,
  onResultScheduled?: () => void,
): {
  readonly playingBoss: boolean
  readonly resultFallback: boolean
  result(theme: 'victory' | 'defeat' | null): void
  boss(id: BossId | null, phase?: number): void
  warning(seconds: number | null): void
  sync(): void
  stop(remember?: boolean): void
  dispose(): void
} {
  let bossId: BossId | null = null
  let phase = 1
  let remaining: number | null = null
  let resultTheme: 'victory' | 'defeat' | null = null
  let voice: Voice | null = null
  let paused: { key: string; offset: number } | null = null
  let loading: string | null = null
  let serial = 0
  const cached = new Map<string, Promise<BufferLike | null>>()
  const failed = new Set<string>()

  const resultTrack = (): string | undefined =>
    resultTheme === 'victory' ? opts.victoryTrack : resultTheme === 'defeat' ? opts.defeatTrack : undefined
  const wanted = (): { key: string; url: string; loop: boolean } | null => {
    if (resultTheme) {
      const url = resultTrack()
      return url ? { key: 'result:' + resultTheme, url, loop: false } : null
    }
    if (bossId) {
      const url = opts.bossTracks?.[bossId]?.[phase - 1]
      return url ? { key: 'boss:' + bossId + ':' + phase, url, loop: true } : null
    }
    return remaining !== null && opts.warningTrack
      ? { key: 'warning', url: opts.warningTrack, loop: false } : null
  }
  const position = (v: Voice, now: number): number => {
    const t = v.offset + Math.max(0, now - v.started)
    return v.loop ? t % v.duration : Math.min(v.duration, t)
  }
  const stop = (remember = false): void => {
    serial++
    loading = null
    const last = voice
    voice = null
    if (remember && last && context()) paused = { key: last.key, offset: position(last, context()!.currentTime) }
    if (!remember) paused = null
    if (!last || !context()) return
    const now = context()!.currentTime
    if (remember) last.gain.gain.setValueAtTime(0, now)
    else last.gain.gain.setTargetAtTime(0.0001, now, 0.14)
    try { last.source.stop(remember ? now : now + 0.85) } catch { /* already stopped */ }
  }
  const decode = (url: string, ctx: AudioContextLike): Promise<BufferLike | null> => {
    const existing = cached.get(url)
    if (existing) return existing
    const promise = Promise.resolve().then(() => opts.loadMusic
      ? opts.loadMusic(url, ctx)
      : ctx.decodeAudioData && typeof fetch === 'function'
        ? fetch(url).then(res => {
          if (!res.ok) throw new Error('Cinematic music unavailable')
          return res.arrayBuffer()
        }).then(data => ctx.decodeAudioData!(data))
        : null).catch(() => null)
    cached.set(url, promise)
    // Keep at most two decoded phase variants at a time on memory-limited devices.
    while (cached.size > 2) cached.delete(cached.keys().next().value!)
    return promise
  }
  const sync = (): void => {
    const ctx = context()
    const next = wanted()
    if (!next || !ctx || ctx.state === 'closed' || !allowed()) {
      if (voice || loading) stop(!!next)
      return
    }
    // A suspended context freezes its own audio clock. Keep the live source
    // (and pending phase intent) until resume; don't restart/fade it on a tap.
    if (ctx.state !== 'running') return
    if (voice?.key === next.key || loading === next.key || failed.has(next.url)) return
    const previous = voice
    const offset = paused?.key === next.key ? paused.offset
      : previous && bossId && previous.key.startsWith('boss:' + bossId + ':')
        ? position(previous, ctx.currentTime)
        : next.key === 'warning' ? Math.max(0, 15 - (remaining ?? 15)) : 0
    stop()
    const token = ++serial
    loading = next.key
    void decode(next.url, ctx).then(buffer => {
      if (token !== serial) return
      loading = null
      if (!buffer) { failed.add(next.url); return }
      if (ctx !== context() || ctx.state !== 'running' || !allowed() || wanted()?.key !== next.key) return
      const duration = Math.max(0.01, buffer.duration ?? 1)
      const startOffset = next.loop ? offset % duration : Math.min(offset, duration - 0.01)
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      source.loop = next.loop
      source.connect(gain)
      gain.connect(musicBus() ?? ctx.destination)
      const now = ctx.currentTime
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.setTargetAtTime(next.loop ? 0.78 : 0.58, now, 0.32)
      try {
        source.start(now + 0.02, startOffset)
        voice = { key: next.key, source, gain, started: now + 0.02,
          offset: startOffset, duration, loop: next.loop }
        paused = null
        if (next.key.startsWith('result:')) onResultScheduled?.()
      } catch { failed.add(next.url) }
    })
  }

  return {
    get playingBoss() { return !!(voice && voice.key.startsWith('boss:')) },
    get resultFallback() {
      const url = resultTrack()
      return !url || failed.has(url)
    },
    result(theme) {
      if (theme === resultTheme) return
      resultTheme = theme
      if (theme) { bossId = null; remaining = null }
      sync()
    },
    boss(id, newPhase = 1) {
      const targetPhase = Number.isFinite(newPhase) ? Math.max(1, Math.min(3, Math.floor(newPhase))) : 1
      if (id === bossId && phase === targetPhase) return
      bossId = id
      phase = targetPhase
      if (id) remaining = null
      sync()
    },
    warning(seconds) {
      const next = seconds === null || !Number.isFinite(seconds) || seconds < 0 || seconds > 15
        ? null : Math.ceil(seconds)
      if (remaining === next) return
      remaining = next
      if (!bossId) sync()
    },
    sync, stop,
    dispose() {
      stop()
      cached.clear()
      failed.clear()
      bossId = null
      remaining = null
      resultTheme = null
    },
  }
}
