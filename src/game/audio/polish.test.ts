import { beforeEach, describe, expect, it } from 'vitest'
import { createAudioSystem } from './engine'
import { FakeAudioContext } from './fakeAudio'
import type { BgmElement } from './types'

class Bgm implements BgmElement {
  paused = true
  volume = 0
  currentTime = 0
  plays = 0
  pauses = 0
  play(): Promise<void> { this.plays++; this.paused = false; return Promise.resolve() }
  pause(): void { this.pauses++; this.paused = true }
}

let ctx: FakeAudioContext
let bgm: Bgm
beforeEach(() => { ctx = new FakeAudioContext(); bgm = new Bgm() })
const make = () => createAudioSystem({ bgm, storage: null, createContext: () => ctx })

describe('mobile interruption and recovery', () => {
  it('stops both audio paths while interrupted and resumes only on a later gesture', async () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    expect(bgm.plays).toBe(1)
    audio.interrupt()
    expect(bgm.paused).toBe(true)
    expect(ctx.suspendCalls).toBe(1)
    audio.onScreen('play')
    audio.tick('play')
    expect(bgm.plays).toBe(1)
    audio.wake()
    await Promise.resolve()
    expect(ctx.resumeCalls).toBe(1)
    expect(bgm.plays).toBe(2)
  })

  it('honors the music setting after interruption without disabling SFX', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    audio.toggleMusic('play')
    audio.interrupt()
    audio.wake()
    expect(bgm.paused).toBe(true)
    expect(audio.sfxOn).toBe(true)
    ctx.currentTime = 5
    audio.playSfx('hurt')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
  })

  it('recovers from a suspended context and can be restarted after disposal', async () => {
    const audio = make()
    audio.wake()
    ctx.state = 'suspended'
    audio.wake()
    await Promise.resolve()
    expect(ctx.resumeCalls).toBe(1)
    audio.dispose()
    audio.wake()
    expect(audio.unlocked).toBe(true)
  })
})

describe('adaptive battle audio and allocation bounds', () => {
  it('boss mode adds music-layer notes even over a playing MP3, calm mode does not', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    audio.setCombatIntensity('calm')
    audio.tick('play')
    expect(ctx.oscillators).toHaveLength(0)
    audio.setCombatIntensity('boss')
    audio.tick('play')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
    const musicBus = ctx.gains[1]!
    expect(ctx.gains.slice(2).some(n => n.targets.includes(musicBus))).toBe(true)
  })

  it('reuses the short noise buffer across frequent impactful cues', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 5
    audio.playSfx('hurt')
    ctx.currentTime = 5.3
    audio.playSfx('hurt')
    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources[0]!.buffer).toBe(ctx.sources[1]!.buffer)
  })

  it('limits bursts of noncritical sound events while preserving victory', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 10
    for (const cue of ['ui','hover','select','upgrade','level','dash','knight','ranger','wizard','chain','kill','pickup'] as const) audio.playSfx(cue)
    const count = ctx.oscillators.length
    audio.playSfx('victory')
    expect(ctx.oscillators.length).toBeGreaterThan(count)
    expect(count).toBeLessThan(24)
  })
})
