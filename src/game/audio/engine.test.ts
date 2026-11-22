import { beforeEach, describe, expect, it } from 'vitest'
import type { BgmElement, SettingsStorage } from './types'
import { createAudioSystem } from './engine'
import { FakeAudioContext } from './fakeAudio'

class FakeBgm implements BgmElement {
  paused = true
  volume = 0
  currentTime = 0
  playCalls = 0
  pauseCalls = 0
  play(): Promise<void> { this.playCalls++; this.paused = false; return Promise.resolve() }
  pause(): void { this.pauseCalls++; this.paused = true }
}

class MemStorage implements SettingsStorage {
  readonly data = new Map<string, string>()
  getItem(k: string): string | null { return this.data.get(k) ?? null }
  setItem(k: string, v: string): void { this.data.set(k, v) }
}

const throwing: SettingsStorage = {
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('denied') },
}

let ctx: FakeAudioContext
let bgm: FakeBgm
let created = 0
const make = (storage: SettingsStorage | null = new MemStorage()) =>
  createAudioSystem({ bgm, storage, createContext: () => { created++; return ctx } })

beforeEach(() => {
  ctx = new FakeAudioContext()
  bgm = new FakeBgm()
  created = 0
})

describe('wake', () => {
  it('creates no AudioContext until wake()', () => {
    const audio = make()
    expect(audio.unlocked).toBe(false)
    expect(created).toBe(0)
    audio.wake()
    expect(audio.unlocked).toBe(true)
    audio.wake()
    expect(created).toBe(1)
  })

  it('sets master .52 and music bus .65 (0 when music is off)', () => {
    make().wake()
    expect(ctx.gains.map(g => g.gain.value)).toEqual([0.52, 0.65])
    ctx = new FakeAudioContext()
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    make(storage).wake()
    expect(ctx.gains.map(g => g.gain.value)).toEqual([0.52, 0])
  })

  it('resumes a suspended context', () => {
    ctx.state = 'suspended'
    make().wake()
    expect(ctx.resumeCalls).toBe(1)
  })

  it('stays locked when no context is available or creation throws', () => {
    const none = createAudioSystem({ bgm, storage: null, createContext: () => null })
    none.wake()
    expect(none.unlocked).toBe(false)
    const boom = createAudioSystem({ bgm, storage: null, createContext: () => { throw new Error('x') } })
    boom.wake()
    expect(boom.unlocked).toBe(false)
  })
})

describe('independent, persisted audio volumes', () => {
  it('defaults to the existing loudness and persists independent levels', () => {
    const storage = new MemStorage()
    const audio = make(storage)
    expect(audio.musicVolume).toBe(100)
    expect(audio.sfxVolume).toBe(100)
    audio.setMusicVolume(45)
    audio.setSfxVolume(25)
    expect(storage.data.get('eclipseMusicVolume')).toBe('45')
    expect(storage.data.get('eclipseSfxVolume')).toBe('25')
    expect(audio.musicVolume).toBe(45)
    expect(audio.sfxVolume).toBe(25)
    const restored = make(storage)
    expect(restored.musicVolume).toBe(45)
    expect(restored.sfxVolume).toBe(25)
  })

  it('applies volume to both synth buses and the MP3, without changing mute switches', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    audio.setMusicVolume(50)
    audio.setSfxVolume(40)
    expect(ctx.gains[0]!.gain.setTargetAtTime).toBeDefined()
    expect(ctx.gains[0]!.gain.value).toBeCloseTo(0.52)
    expect(bgm.volume).toBeCloseTo(0.19)
    expect(audio.musicOn).toBe(true)
    expect(audio.sfxOn).toBe(true)
    audio.toggleMusic('play')
    audio.toggleSfx()
    audio.setMusicVolume(80)
    audio.setSfxVolume(70)
    expect(audio.musicOn).toBe(false)
    expect(audio.sfxOn).toBe(false)
  })

  it('sanitizes corrupt stored values and clamps invalid changes', () => {
    const storage = new MemStorage()
    storage.setItem('eclipseMusicVolume', 'Infinity')
    storage.setItem('eclipseSfxVolume', '-50')
    const audio = make(storage)
    expect(audio.musicVolume).toBe(100)
    expect(audio.sfxVolume).toBe(0)
    audio.setMusicVolume(125)
    audio.setSfxVolume(Number.NaN)
    expect(audio.musicVolume).toBe(100)
    expect(audio.sfxVolume).toBe(0)
  })
})

describe('playSfx', () => {
  it('is a no-op before wake', () => {
    const audio = make()
    audio.playSfx('ui')
    expect(ctx.oscillators).toHaveLength(0)
  })

  it('is a no-op when sfx is off or the context is not running', () => {
    const storage = new MemStorage()
    storage.setItem('starSfx', 'off')
    const off = make(storage)
    off.wake()
    off.playSfx('ui')
    expect(ctx.oscillators).toHaveLength(0)

    ctx = new FakeAudioContext()
    const audio = make()
    audio.wake()
    ctx.state = 'suspended'
    audio.playSfx('ui')
    expect(ctx.oscillators).toHaveLength(0)
  })

  it('plays one oscillator per tone with the original pitch math', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 5
    audio.playSfx('select')
    expect(ctx.oscillators).toHaveLength(2)
    const [a, b] = ctx.oscillators
    expect(a.type).toBe('triangle')
    expect(a.frequency.value).toBeCloseTo(440 * 2 ** ((64 - 69) / 12))
    expect(a.startedAt).toBeCloseTo(5)
    expect(a.stoppedAt).toBeCloseTo(5 + 0.13 + 0.03)
    expect(b.startedAt).toBeCloseTo(5.06)
    expect(b.type).toBe('sine')
  })

  it('throttles the same cue inside its cooldown, not different cues', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 10
    audio.playSfx('ui') // cooldown .07, 1 tone
    ctx.currentTime = 10.05
    audio.playSfx('ui')
    expect(ctx.oscillators).toHaveLength(1)
    audio.playSfx('hover')
    expect(ctx.oscillators).toHaveLength(2)
    ctx.currentTime = 10.08
    audio.playSfx('ui')
    expect(ctx.oscillators).toHaveLength(3)
  })

  it('adds the noise burst only for knight, dash, hurt, boss', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 100
    for (const cue of ['knight', 'dash', 'hurt', 'boss'] as const) {
      const before = ctx.sources.length
      audio.playSfx(cue)
      expect(ctx.sources.length).toBe(before + 1)
    }
    const before = ctx.sources.length
    for (const cue of ['ui', 'ranger', 'wizard', 'kill', 'vortex'] as const) audio.playSfx(cue)
    expect(ctx.sources.length).toBe(before)
    const src = ctx.sources[0]
    expect(src.buffer?.length).toBe(Math.ceil(48000 * 0.065))
    expect(src.startedAt).toBe(100)
    expect(src.stoppedAt).toBeCloseTo(100.065)
    expect(ctx.filters[0].type).toBe('highpass')
    expect(ctx.filters[0].frequency.value).toBe(500)
  })
})

describe('tick', () => {
  it('schedules menu notes only after wake, in menu mode, with music on', () => {
    const audio = make()
    audio.tick('menu')
    expect(created).toBe(0)
    audio.wake()
    expect(ctx.oscillators).toHaveLength(0)
    audio.tick('menu')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
  })

  it('menu mode schedules the motif; music off or non-running does not', () => {
    const audio = make()
    audio.wake()
    audio.tick('menu')
    expect(ctx.oscillators.length).toBeGreaterThan(0)

    ctx = new FakeAudioContext()
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    const quiet = make(storage)
    quiet.wake()
    quiet.tick('menu')
    expect(ctx.oscillators).toHaveLength(0)

    ctx = new FakeAudioContext()
    const suspended = make()
    suspended.wake()
    ctx.state = 'suspended'
    suspended.tick('menu')
    expect(ctx.oscillators).toHaveLength(0)
  })

  it('battle tune only in play mode while bgm is paused', () => {
    const audio = make()
    audio.wake()
    audio.tick('level')
    audio.tick('paused')
    expect(ctx.oscillators).toHaveLength(0)
    bgm.paused = false
    audio.tick('play')
    expect(ctx.oscillators).toHaveLength(0)
    bgm.paused = true
    audio.tick('play')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
  })

  it('resetBattleClock restarts the tune clock from currentTime + delay', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 50
    audio.resetBattleClock(0.5)
    audio.tick('play') // lookahead .17 < .5 -> nothing yet
    expect(ctx.oscillators).toHaveLength(0)
    ctx.currentTime = 50.4
    audio.tick('play')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
  })
})

describe('toggles', () => {
  it('reads initial values and persists on|off', () => {
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    const audio = make(storage)
    expect(audio.musicOn).toBe(false)
    expect(audio.sfxOn).toBe(true)
    expect(audio.toggleMusic('menu')).toBe(true)
    expect(storage.data.get('starMusic')).toBe('on')
    expect(audio.toggleSfx()).toBe(false)
    expect(storage.data.get('starSfx')).toBe('off')
    expect(audio.toggleSfx()).toBe(true)
    expect(storage.data.get('starSfx')).toBe('on')
    expect(audio.toggleMusic('menu')).toBe(false)
    expect(storage.data.get('starMusic')).toBe('off')
  })

  it('toggling music on wakes audio, resumes bgm in play, ramps the bus', () => {
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    const audio = make(storage)
    audio.toggleMusic('play')
    expect(audio.unlocked).toBe(true)
    expect(bgm.playCalls).toBe(1)
    ctx.currentTime = 2
    audio.toggleMusic('play')
    expect(bgm.pauseCalls).toBe(1)
    const bus = ctx.gains[1].gain.calls.find(c => c.fn === 'setTargetAtTime')
    expect(bus?.args).toEqual([0, 2, 0.06])
  })

  it('toggling music on outside play does not start bgm', () => {
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    make(storage).toggleMusic('menu')
    expect(bgm.playCalls).toBe(0)
  })

  it('toggling sfx on wakes audio', () => {
    const storage = new MemStorage()
    storage.setItem('starSfx', 'off')
    const audio = make(storage)
    audio.toggleSfx()
    expect(audio.unlocked).toBe(true)
  })

  it('a throwing storage does not break construction or toggles', () => {
    const audio = make(throwing)
    expect(audio.musicOn).toBe(true)
    expect(audio.sfxOn).toBe(true)
    expect(audio.toggleMusic('menu')).toBe(false)
    expect(audio.toggleSfx()).toBe(false)
  })

  it('works with no storage at all', () => {
    const audio = make(null)
    expect(audio.toggleSfx()).toBe(false)
  })
})

describe('onScreen', () => {
  it('level lowers bgm volume to .20; play restores .38 and plays', () => {
    const audio = make()
    audio.onScreen('level')
    expect(bgm.volume).toBe(0.2)
    audio.onScreen('play')
    expect(bgm.volume).toBe(0.38)
    expect(bgm.playCalls).toBe(1)
  })

  it('does not play bgm when music is off', () => {
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    make(storage).onScreen('play')
    expect(bgm.playCalls).toBe(0)
  })

  it('menu, paused and result pause bgm; menu also rewinds', () => {
    const audio = make()
    bgm.currentTime = 42
    audio.onScreen('paused')
    audio.onScreen('result')
    expect(bgm.pauseCalls).toBe(2)
    expect(bgm.currentTime).toBe(42)
    audio.onScreen('menu')
    expect(bgm.pauseCalls).toBe(3)
    expect(bgm.currentTime).toBe(0)
    expect(bgm.volume).toBe(0.38)
  })

  it('menu resets the motif so it restarts at the first beat', () => {
    const audio = make()
    audio.wake()
    audio.tick('menu')
    const first = ctx.oscillators.length
    audio.onScreen('menu')
    ctx.currentTime = 20
    audio.tick('menu')
    // restarted at step 0: chord of 3 again (first call queued 2 steps -> 3 notes)
    expect(ctx.oscillators.length - first).toBe(3)
  })
})

describe('dispose', () => {
  it('pauses bgm, closes the context, and lets a later wake() start fresh', () => {
    const audio = make()
    audio.wake()
    bgm.paused = false
    audio.dispose()
    expect(bgm.paused).toBe(true)
    expect(ctx.state).toBe('closed')
    expect(audio.unlocked).toBe(false)
    audio.wake()
    expect(created).toBe(2)
  })
})

describe('interruption edge cases', () => {
  it('restarts a stuck media element after the context suspends without a visibility event', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    expect(bgm.playCalls).toBe(1)
    // Some mobile browsers report media as still playing while sound is silent.
    ctx.state = 'suspended'
    bgm.paused = false
    audio.wake()
    expect(bgm.pauseCalls).toBeGreaterThan(0)
    expect(bgm.playCalls).toBe(2)
  })

  it('avoids duplicate suspension when both blur and visibilitychange fire', () => {
    const audio = make()
    audio.wake()
    audio.interrupt()
    audio.interrupt()
    expect(ctx.suspendCalls).toBe(1)
  })
})
