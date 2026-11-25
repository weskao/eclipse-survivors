import type { AudioContextLike, BufferLike, BufferSourceLike, GainLike, OscillatorLike } from './engine'
import type { BossAttackId, BossId } from '../content/bosses/definitions'
import { ATTACK_PRESENTATION, RELEASE_DURATION, RELEASE_OFFSET, type BossAttackStage } from '../content/bosses/attack-presentation'

type Voice = { source: Pick<BufferSourceLike | OscillatorLike, 'stop'>; end: number; stage: BossAttackStage }
type Load = (url: string, ctx: AudioContextLike) => Promise<BufferLike | null>
/** One active bank, one warning and at most two release tails. No render-frame work. */
export function createBossAttackAudio(
  context: () => AudioContextLike | null, destination: () => GainLike | null,
  enabled: () => boolean, fallback: (id: BossAttackId, stage: BossAttackStage) => OscillatorLike | undefined,
  load?: Load,
) {
  let selected: BossId | null = null
  let loadedContext: AudioContextLike | null = null
  let bank: BufferLike | null = null
  let version = 0
  const voices: Voice[] = []
  function cancel(stage?: BossAttackStage): void {
    const now = context()?.currentTime ?? 0
    for (let i = voices.length - 1; i >= 0; i--) {
      const voice = voices[i]!
      if (voice.end <= now || !stage || voice.stage === stage) {
        if (voice.end > now) try { voice.source.stop(now) } catch { /* already stopped */ }
        voices.splice(i, 1)
      }
    }
  }
  function prepare(id: BossId | null): void {
    const ctx = context()
    if (id === selected && ctx === loadedContext) return
    cancel()
    selected = id; loadedContext = ctx; bank = null
    const token = ++version
    if (!id || !ctx || (!load && (!ctx.decodeAudioData || typeof fetch !== 'function'))) return
    const url = import.meta.env.BASE_URL + 'audio/boss/attacks/' + id + '.wav'
    void Promise.resolve().then(() => load ? load(url, ctx) : fetch(url).then(res => {
      if (!res.ok) throw new Error('Boss attack bank unavailable')
      return res.arrayBuffer()
    }).then(data => ctx.decodeAudioData!(data))).then(buffer => {
      if (version === token && context() === ctx) bank = buffer
    }).catch(() => { /* immediate fallback; no delayed playback */ })
  }
  function play(id: BossAttackId, stage: BossAttackStage): void {
    const ctx = context(), bus = destination()
    if (!ctx || ctx.state !== 'running' || !bus || !enabled()) return
    const profile = ATTACK_PRESENTATION[id]
    prepare(profile.boss)
    cancel('warning')
    const now = ctx.currentTime
    // At most two concurrent release tails; never steal an unrelated hero voice.
    if (stage === 'release' && voices.length >= 2) {
      const old = voices.shift()!
      try { old.source.stop(now) } catch { /* already ended */ }
    }
    const offset = profile.offset + (stage === 'release' ? RELEASE_OFFSET : 0)
    const duration = stage === 'release' ? RELEASE_DURATION : profile.windup
    if (bank && (bank.duration === undefined || bank.duration >= offset + duration - 0.002)) {
      try {
        const source = ctx.createBufferSource()
        source.buffer = bank; source.loop = false
        source.connect(bus); source.start(now, offset); source.stop(now + duration)
        voices.push({ source, end: now + duration, stage })
        return
      } catch { /* asset/playback failure only */ }
    }
    const source = fallback(id, stage)
    if (source) voices.push({ source, end: now + Math.min(duration, 0.55), stage })
  }
  return { prepare, play, cancel }
}
