import { describe, expect, it } from 'vitest'
import { renderBossPhaseSample } from './boss-phase-sample'
import { BOSS_DEFINITIONS, type BossId } from '../content/bosses/definitions'
import { createAudioSystem } from './engine'
import { FakeAudioContext } from './fakeAudio'

describe('cinematic boss phase cue', () => {
  it('has eight distinct finite, bounded, enveloped PCM cues', () => {
    const signatures = new Set<number>()
    for (const boss of Object.keys(BOSS_DEFINITIONS) as BossId[]) {
      const p2 = renderBossPhaseSample(boss, 2, 24000)
      const p3 = renderBossPhaseSample(boss, 3, 24000)
      expect(p3.length).toBeGreaterThan(p2.length)
      for (const pcm of [p2, p3]) {
        expect(pcm.every(Number.isFinite)).toBe(true)
        expect(pcm[0]).toBeCloseTo(0, 5)
        expect(pcm.at(-1)).toBeCloseTo(0, 5)
        const peak = pcm.reduce((m, n) => Math.max(m, Math.abs(n)), 0)
        expect(peak).toBeGreaterThan(.5)
        expect(peak).toBeLessThan(.9)
        signatures.add(pcm.reduce((sum, n, i) => sum + Math.abs(n) * (i % 11 + 1), 0))
      }
    }
    expect(signatures.size).toBe(8)
  })
  it('plays exactly one finite sample through SFX, not the music bus, and honors mute', () => {
    const ctx = new FakeAudioContext()
    const bgm = { paused: true, volume: 0, currentTime: 0, play() {}, pause() {} }
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => ctx })
    audio.wake(); audio.onScreen('play')
    audio.playSfx('boss-phase-2', 0)
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.sources[0]!.targets).toContain(ctx.gains[0])
    expect(ctx.sources[0]!.loop).toBe(false)
    expect(ctx.oscillators).toHaveLength(0)
    audio.playSfx('boss-phase-2', 0)
    expect(ctx.sources).toHaveLength(1)
    audio.playSfx('boss-phase-3', 0)
    expect(ctx.sources).toHaveLength(2)
    audio.setSfxVolume(0)
    ctx.currentTime = 10
    audio.playSfx('boss-phase-3', 1)
    expect(ctx.sources).toHaveLength(2)
    audio.dispose()
  })
})
