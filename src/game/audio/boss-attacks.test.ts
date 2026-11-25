import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { BOSS_ATTACKS, BOSS_DEFINITIONS } from '../content/bosses/definitions'
import { ATTACK_PRESENTATION, RELEASE_OFFSET, RELEASE_DURATION } from '../content/bosses/attack-presentation'
import { createAudioSystem } from './engine'
import { FakeAudioContext } from './fakeAudio'

describe('boss attack sound banks', () => {
  it('covers every real attack with nonempty unique local warning/release slices and headroom', () => {
    expect(Object.keys(ATTACK_PRESENTATION).sort()).toEqual(Object.keys(BOSS_ATTACKS).sort())
    for (const boss of Object.values(BOSS_DEFINITIONS)) {
      const ids = [...new Set(boss.phases.flat())]
      const wav = readFileSync('public/audio/boss/attacks/' + boss.id + '.wav')
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
      const rate = wav.readUInt32LE(24)
      expect(rate).toBe(32000)
      const offsets = new Set<number>()
      for (const id of ids) {
        const p = ATTACK_PRESENTATION[id]
        expect(p.boss).toBe(boss.id)
        expect(p.windup).toBe(BOSS_ATTACKS[id].windup)
        expect(offsets.has(p.offset)).toBe(false)
        offsets.add(p.offset)
        expect(p.shake).toBeLessThanOrEqual(1.6)
        for (const [offset, duration] of [[p.offset,p.windup], [p.offset+RELEASE_OFFSET,RELEASE_DURATION]] as const) {
          const start = 44 + Math.round(offset*rate)*2, end = start + Math.round(duration*rate)*2
          expect(end).toBeLessThanOrEqual(wav.length)
          let peak = 0
          for (let i=start;i<end;i+=2) peak=Math.max(peak,Math.abs(wav.readInt16LE(i))/32767)
          expect(peak).toBeGreaterThan(0.05)
          expect(peak).toBeLessThan(0.81)
        }
      }
    }
  })
  it('plays exactly one non-looping slice per event, releases at the correct offset, and cancels on mute', async () => {
    const ctx = new FakeAudioContext()
    const bgm = { paused: true, currentTime: 0, volume: 0, play() {}, pause() {} }
    const load = vi.fn(async () => ctx.createBuffer(1, 48000*26, 48000))
    const audio = createAudioSystem({ bgm, createContext: () => ctx, storage: null, loadBossSfx: load })
    audio.wake(); audio.onScreen('play')
    audio.prepareBossAttackAudio?.('infernal-titan')
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    await Promise.resolve(); await Promise.resolve()
    audio.playBossAttack?.('titan-slam', 'warning')
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.sources[0]!.offset).toBe(ATTACK_PRESENTATION['titan-slam'].offset)
    expect(ctx.sources[0]!.loop).toBe(false)
    ctx.currentTime = 1.7
    audio.playBossAttack?.('titan-slam', 'release')
    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources[1]!.offset).toBe(ATTACK_PRESENTATION['titan-slam'].offset + RELEASE_OFFSET)
    audio.setSfxVolume(0)
    expect(ctx.sources[1]!.stoppedAt).toBe(ctx.currentTime)
    audio.playBossAttack?.('titan-rage', 'release')
    expect(ctx.sources).toHaveLength(2)
  })
})
