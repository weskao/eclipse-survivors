import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('gothic menu soundtrack', () => {
  it('plays the dedicated orchestral track on a gesture, not the old synthesizer', () => {
    const menuBgm = new FakeBgm()
    const audio = createAudioSystem({ bgm, menuBgm, storage: null, createContext: () => ctx })
    expect(menuBgm.playCalls).toBe(0)
    audio.wake()
    expect(menuBgm.playCalls).toBe(1)
    audio.tick('menu')
    expect(ctx.oscillators).toHaveLength(0)
    audio.onScreen('play')
    expect(menuBgm.paused).toBe(true)
    expect(bgm.playCalls).toBe(1)
    audio.onScreen('menu')
    expect(bgm.paused).toBe(true)
    expect(menuBgm.currentTime).toBe(0)
    expect(menuBgm.playCalls).toBe(2)
  })

  it('applies user volume and mute to both menu and battle tracks', () => {
    const menuBgm = new FakeBgm()
    const audio = createAudioSystem({ bgm, menuBgm, storage: null, createContext: () => ctx })
    audio.wake()
    audio.setMusicVolume(40)
    expect(menuBgm.volume).toBeCloseTo(0.78 * 0.4)
    audio.toggleMusic('menu')
    expect(menuBgm.paused).toBe(true)
    expect(bgm.paused).toBe(true)
    audio.toggleMusic('menu')
    expect(menuBgm.playCalls).toBe(2)
    audio.interrupt()
    expect(menuBgm.paused).toBe(true)
    audio.wake()
    expect(menuBgm.playCalls).toBe(3)
    audio.dispose()
    expect(menuBgm.paused).toBe(true)
  })

  it('does not resume menu music when the preference is disabled', () => {
    const menuBgm = new FakeBgm()
    const storage = new MemStorage()
    storage.setItem('starMusic', 'off')
    const audio = createAudioSystem({ bgm, menuBgm, storage, createContext: () => ctx })
    audio.wake()
    audio.onScreen('menu')
    expect(menuBgm.playCalls).toBe(0)
    audio.toggleMusic('menu')
    expect(menuBgm.playCalls).toBe(1)
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
    expect(bgm.volume).toBeCloseTo(0.2375)
    expect(audio.musicOn).toBe(true)
    expect(audio.sfxOn).toBe(true)
    audio.toggleMusic('play')
    audio.toggleSfx()
    audio.setMusicVolume(80)
    audio.setSfxVolume(70)
    expect(audio.musicOn).toBe(false)
    expect(audio.sfxOn).toBe(false)
  })

  it('raises both battle buses by 25% without changing menu or result levels', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    const sfx = ctx.gains[0]!.gain
    const music = ctx.gains[1]!.gain
    expect(sfx.calls.at(-1)?.args[0]).toBeCloseTo(0.65)
    expect(music.calls.at(-1)?.args[0]).toBeCloseTo(0.8125)
    expect(bgm.volume).toBeCloseTo(0.475)
    audio.onScreen('level')
    audio.setMusicVolume(50)
    audio.setSfxVolume(40)
    expect(music.calls.at(-1)?.args[0]).toBeCloseTo(0.40625)
    expect(sfx.calls.at(-1)?.args[0]).toBeCloseTo(0.26)
    expect(bgm.volume).toBeCloseTo(0.2375)
    audio.toggleMusic('level')
    audio.toggleSfx()
    expect(music.calls.at(-1)?.args[0]).toBe(0)
    expect(sfx.calls.at(-1)?.args[0]).toBe(0)
    audio.toggleMusic('level')
    audio.toggleSfx()
    expect(music.calls.at(-1)?.args[0]).toBeCloseTo(0.40625)
    expect(sfx.calls.at(-1)?.args[0]).toBeCloseTo(0.26)
    audio.onScreen('result')
    expect(music.calls.at(-1)?.args[0]).toBeCloseTo(0.325)
    expect(sfx.calls.at(-1)?.args[0]).toBeCloseTo(0.208)
    audio.onScreen('menu')
    expect(bgm.volume).toBeCloseTo(0.19)
  })

  it('uses the boosted mix when the first gesture starts in battle', () => {
    const audio = make()
    audio.onScreen('play')
    audio.wake()
    expect(ctx.gains[0]!.gain.value).toBeCloseTo(0.65)
    expect(ctx.gains[1]!.gain.value).toBeCloseTo(0.8125)
  })

  it('restores the previous audible level from zero when toggling sound on', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    audio.setMusicVolume(37)
    audio.setSfxVolume(28)
    audio.setMusicVolume(0)
    audio.setSfxVolume(0)
    expect(bgm.volume).toBe(0)
    audio.toggleMusic('play')
    expect(audio.musicOn).toBe(true)
    expect(audio.musicVolume).toBe(37)
    audio.toggleSfx()
    expect(audio.sfxOn).toBe(true)
    expect(audio.sfxVolume).toBe(28)
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

  it('plays one cached hero confirmation sample with no generic tone, and honors cooldown and mute', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 10
    audio.playSfx('hero-select')
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.oscillators).toHaveLength(0)
    expect(ctx.sources[0]!.loop).toBe(false)
    const sample = ctx.sources[0]!.buffer
    expect(sample?.duration).toBeCloseTo(.44, 3)
    ctx.currentTime = 10.1
    audio.playSfx('hero-select')
    expect(ctx.sources).toHaveLength(1)
    ctx.currentTime = 10.3
    audio.playSfx('hero-select')
    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources[1]!.buffer).toBe(sample)
    audio.setSfxVolume(0)
    ctx.currentTime = 11
    audio.playSfx('hero-select')
    expect(ctx.sources).toHaveLength(2)
    expect(created).toBe(1)
  })

  it.each(['legendaryReveal', 'legendaryClaim'] as const)('plays one cached %s Foley buffer without a generic tone', cue => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 20
    audio.playSfx(cue)
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.oscillators).toHaveLength(0)
    expect(ctx.sources[0]!.loop).toBe(false)
    const sample = ctx.sources[0]!.buffer
    ctx.currentTime = 22
    audio.playSfx(cue)
    expect(ctx.sources[1]!.buffer).toBe(sample)
    audio.setSfxVolume(0)
    ctx.currentTime = 24
    audio.playSfx(cue)
    expect(ctx.sources).toHaveLength(2)
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

  it('adds a single noise or sampled source for knight, dash, hurt, boss', () => {
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

  it('continues the fallback battle tune through level selection but not pause', () => {
    const audio = make()
    audio.wake()
    audio.tick('paused')
    expect(ctx.oscillators).toHaveLength(0)
    bgm.paused = false
    audio.tick('play')
    audio.tick('level')
    expect(ctx.oscillators).toHaveLength(0)
    bgm.paused = true
    audio.tick('play')
    const before = ctx.oscillators.length
    expect(before).toBeGreaterThan(0)
    ctx.currentTime = 2
    audio.tick('level')
    expect(ctx.oscillators.length).toBeGreaterThan(before)
    const during = ctx.oscillators.length
    ctx.currentTime = 4
    audio.tick('paused')
    expect(ctx.oscillators).toHaveLength(during)
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

describe('result scene music', () => {
  it('switches from battle music to the authored joyful victory theme, and plays only on the music bus', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    expect(bgm.paused).toBe(false)
    audio.setResultTheme?.('victory')
    audio.onScreen('result')
    expect(bgm.paused).toBe(true)
    audio.tick('result')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
    const pitches = ctx.oscillators.map(note => Math.round(69 + 12 * Math.log2(note.frequency.value / 440)))
    expect(pitches).toContain(72)
    expect(ctx.oscillators.some(note => note.targets[0] === ctx.gains[2])).toBe(true)
  })

  it('silences the result score when music is muted without muting independent victory SFX', () => {
    const audio = make()
    audio.wake()
    audio.setResultTheme?.('victory')
    audio.onScreen('result')
    audio.toggleMusic('result')
    audio.tick('result')
    expect(ctx.oscillators).toHaveLength(0)
    audio.playSfx('victory')
    expect(ctx.oscillators.length).toBeGreaterThan(0)
  })

  it('does not loop the victory theme forever and stops after leaving results', () => {
    const audio = make()
    audio.wake()
    audio.setResultTheme?.('victory')
    audio.onScreen('result')
    for (let i = 0; i < 100; i++) { ctx.currentTime = i * 0.3; audio.tick('result') }
    const end = ctx.oscillators.length
    ctx.currentTime = 50
    audio.tick('result')
    expect(ctx.oscillators.length).toBe(end)
    audio.onScreen('menu')
    audio.tick('result')
    expect(ctx.oscillators.length).toBe(end)
  })
})

describe('sampled orchestral expedition victory', () => {
  it('plays a finite pre-rendered theme through the existing music bus', async () => {
    const requested: string[] = []
    const audio = createAudioSystem({
      bgm, storage: null, createContext: () => ctx,
      victoryTrack: '/audio/eclipse-victory.wav',
      loadMusic: async url => {
        requested.push(url)
        return ctx.createBuffer(2, 672000, 24000)
      },
    })
    audio.wake()
    audio.onScreen('play')
    audio.setResultTheme?.('victory')
    audio.onScreen('result')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(requested).toEqual(['/audio/eclipse-victory.wav'])
    const source = ctx.sources.at(-1)!
    expect(source.loop).toBe(false)
    expect(source.targets[0]).toBe(ctx.gains.at(-1))
    expect(ctx.gains.at(-1)?.targets[0]).toBe(ctx.gains[1])
    audio.tick('result')
    expect(ctx.oscillators).toHaveLength(0)
    audio.onScreen('menu')
    expect(source.stoppedAt).not.toBeNull()
  })

  it('honors music mute and resumes without starting a loop', async () => {
    const audio = createAudioSystem({
      bgm, storage: null, createContext: () => ctx,
      victoryTrack: 'victory.wav',
      loadMusic: async () => ctx.createBuffer(2, 672000, 24000),
    })
    audio.wake()
    audio.setResultTheme?.('victory')
    audio.onScreen('result')
    await new Promise(resolve => setTimeout(resolve, 0))
    const first = ctx.sources.at(-1)!
    audio.toggleMusic('result')
    expect(first.stoppedAt).not.toBeNull()
    audio.toggleMusic('result')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources.at(-1)?.loop).toBe(false)
    audio.interrupt()
    expect(ctx.sources.at(-1)?.stoppedAt).not.toBeNull()
  })

  it('falls back to finite synth if the file is unavailable', async () => {
    const audio = createAudioSystem({
      bgm, storage: null, createContext: () => ctx,
      victoryTrack: 'missing.wav', loadMusic: async () => null,
    })
    audio.wake()
    audio.setResultTheme?.('victory')
    audio.onScreen('result')
    await new Promise(resolve => setTimeout(resolve, 0))
    audio.tick('result')
    expect(ctx.sources).toHaveLength(0)
    expect(ctx.oscillators.length).toBeGreaterThan(0)
  })

  it('does not request the victory file on defeat', () => {
    const loaded: string[] = []
    const audio = createAudioSystem({
      bgm, storage: null, createContext: () => ctx,
      victoryTrack: 'victory.wav',
      loadMusic: async url => { loaded.push(url); return null },
    })
    audio.wake()
    audio.setResultTheme?.('defeat')
    audio.onScreen('result')
    audio.tick('result')
    expect(loaded).toHaveLength(0)
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
  it('keeps the same media track, volume and position through level selection', async () => {
    const audio = make()
    audio.onScreen('play')
    bgm.currentTime = 42
    audio.onScreen('level')
    await Promise.resolve()
    expect(bgm.paused).toBe(false)
    expect(bgm.volume).toBeCloseTo(0.475)
    expect(bgm.currentTime).toBe(42)
    audio.onScreen('play')
    expect(bgm.playCalls).toBe(1)
    expect(bgm.currentTime).toBe(42)
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
    // Restarted at step 0: layered chord, pulse, and lead return together.
    expect(ctx.oscillators.length - first).toBeGreaterThanOrEqual(5)
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

describe('original boss score replaces battle music', () => {
  it('fades down the exploration track, plays the named theme, and restores normal music', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    const baseline = ctx.oscillators.length
    audio.setBossTheme?.('frost-sovereign', 1)
    audio.setCombatIntensity('boss')
    for (let i = 0; i < 40; i++) audio.tick('play')
    expect(bgm.volume).toBe(0)
    expect(ctx.oscillators.length).toBeGreaterThan(baseline)
    audio.setBossTheme?.(null)
    audio.setCombatIntensity('combat')
    for (let i = 0; i < 40; i++) audio.tick('play')
    expect(bgm.volume).toBeCloseTo(0.4375)
  })
})

describe('cinematic sampled boss music', () => {
  const tracks = {
    'abyss-monarch': ['abyss-p1.mp3','abyss-p2.mp3','abyss-p3.mp3'],
    'frost-sovereign': ['frost-p1.mp3','frost-p2.mp3','frost-p3.mp3'],
    'infernal-titan': ['infernal-p1.mp3','infernal-p2.mp3','infernal-p3.mp3'],
    'eclipse-seraph': ['seraph-p1.mp3','seraph-p2.mp3','seraph-p3.mp3'],
  } as const

  it('uses a sampled 15-second suspense cue then replaces it with the actual boss theme', async () => {
    const loaded: string[] = []
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => ctx,
      bossTracks: tracks, warningTrack: 'warning.mp3',
      loadMusic: async url => { loaded.push(url); return ctx.createBuffer(2, 480000, 24000) },
    })
    audio.wake()
    audio.onScreen('play')
    audio.setBossWarning?.(15)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(loaded).toContain('warning.mp3')
    const warning = ctx.sources.at(-1)
    expect(warning?.startedAt).not.toBeNull()
    expect(ctx.gains[1]!.gain.calls.at(-1)?.args[0]).toBeCloseTo(0.8125)
    for (let i = 0; i < 40; i++) audio.tick('play')
    expect(bgm.volume).toBeCloseTo(0.15)
    audio.setBossTheme?.('frost-sovereign', 1)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(loaded).toContain('frost-p1.mp3')
    expect(warning?.stoppedAt).not.toBeNull()
    const bossVoice = ctx.gains.at(-1)!
    expect(ctx.sources.at(-1)?.targets[0]).toBe(bossVoice)
    expect(bossVoice.targets[0]).toBe(ctx.gains[1])
    expect(bossVoice.gain.calls.at(-1)?.args[0]).toBeCloseTo(0.78)
  })

  it('keeps phase changes on the same audio timeline without restarting from zero', async () => {
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => ctx,
      bossTracks: tracks, loadMusic: async () => ctx.createBuffer(2, 480000, 24000),
    })
    audio.wake()
    audio.onScreen('play')
    audio.setBossTheme?.('infernal-titan', 1)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(ctx.sources.at(-1)?.loop).toBe(true)
    ctx.currentTime = 7
    audio.setBossTheme?.('infernal-titan', 3)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(ctx.sources.at(-1)?.offset).toBeGreaterThan(6)
    expect(ctx.sources.at(-1)?.loop).toBe(true)
  })

  it('silences pre-rendered music on pause/mute and resumes without a duplicate loop', async () => {
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => ctx,
      bossTracks: tracks, loadMusic: async () => ctx.createBuffer(2, 480000, 24000),
    })
    audio.wake()
    audio.onScreen('play')
    audio.setBossTheme?.('eclipse-seraph', 1)
    await new Promise(resolve => setTimeout(resolve, 0))
    const first = ctx.sources.at(-1)
    audio.onScreen('paused')
    expect(first?.stoppedAt).toBe(ctx.currentTime)
    audio.onScreen('play')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(ctx.sources.length).toBeGreaterThan(1)
    audio.toggleMusic('play')
    expect(ctx.sources.at(-1)?.stoppedAt).not.toBeNull()
  })
})

describe('hero active skill audio lifetime', () => {
  const cue = 'shadowblade-special' as const
  const sampled = async () => {
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => ctx,
      loadHeroSfx: async () => ctx.createBuffer(1, 96000, 48000),
    })
    audio.wake()
    audio.onScreen('play')
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    return audio
  }

  it.each(['level', 'paused', 'result'] as const)('lets the cast finish on %s without replaying it', async mode => {
    const audio = await sampled()
    audio.playSfx(cue)
    const source = ctx.sources.at(-1)!
    ctx.currentTime = .1
    audio.onScreen(mode)
    expect(source.stoppedAt).toBeNull()
    expect(ctx.suspendCalls).toBe(0)
    audio.onScreen('play')
    expect(ctx.sources).toHaveLength(1)
    expect(source.stoppedAt).toBeNull()
    audio.onScreen('menu')
    expect(source.stoppedAt).toBe(.1)
    audio.dispose()
  })

  it('does not truncate a prior cast even if another valid cue starts before it ends', async () => {
    const audio = await sampled()
    audio.playSfx(cue)
    const first = ctx.sources.at(-1)!
    ctx.currentTime = .1
    audio.playSfx('spirit-summoner-special')
    const second = ctx.sources.at(-1)!
    expect(first.stoppedAt).toBeNull()
    expect(second).not.toBe(first)
    ctx.currentTime = .2
    audio.onScreen('menu')
    expect(first.stoppedAt).toBe(.2)
    expect(second.stoppedAt).toBe(.2)
    audio.dispose()
  })

  it('preloads the Crimson Retribution burst and layers it over an unfinished barrier cast', async () => {
    const urls: string[] = []
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => ctx,
      loadHeroSfx: async url => { urls.push(url); return ctx.createBuffer(1, 48000, 48000) },
    })
    audio.wake()
    audio.onScreen('play')
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(urls.some(url => url.endsWith('audio/heroes/crimson-paladin-retribution.wav'))).toBe(true)
    audio.playSfx('crimson-paladin-special')
    const cast = ctx.sources.at(-1)!
    ctx.currentTime = .4
    const oscillators = ctx.oscillators.length
    audio.playSfx('crimson-paladin-retribution')
    const burst = ctx.sources.at(-1)!
    expect(burst).not.toBe(cast)
    expect(cast.stoppedAt).toBeNull()
    expect(ctx.oscillators).toHaveLength(oscillators) // the sample replaces, never doubles, the synth fallback
    audio.onScreen('menu')
    expect(burst.stoppedAt).toBe(.4)
    audio.dispose()
  })

  it('does not stop already completed samples on returning home', async () => {
    const audio = await sampled()
    audio.playSfx(cue)
    const source = ctx.sources.at(-1)!
    ctx.currentTime = 3
    audio.onScreen('menu')
    expect(source.stoppedAt).toBeNull()
    audio.dispose()
  })

  it('keeps the synth fallback through overlays but cancels every remaining note on Home', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    audio.playSfx('spirit-summoner-special')
    const notes = [...ctx.oscillators]
    expect(notes.length).toBeGreaterThan(1)
    const planned = notes.map(note => note.stoppedAt)
    ctx.currentTime = .1
    audio.onScreen('level')
    audio.onScreen('paused')
    audio.onScreen('result')
    expect(notes.map(note => note.stoppedAt)).toEqual(planned)
    expect(ctx.oscillators).toHaveLength(notes.length)
    audio.onScreen('menu')
    expect(notes.every(note => note.stoppedAt === .1)).toBe(true)
    audio.dispose()
  })

  it.each(['mute', 'volume', 'interrupt', 'dispose'] as const)('preserves the explicit %s stop policy', async action => {
    const audio = await sampled()
    audio.playSfx(cue)
    const source = ctx.sources.at(-1)!
    ctx.currentTime = .1
    if (action === 'mute') audio.toggleSfx()
    else if (action === 'volume') audio.setSfxVolume(0)
    else if (action === 'interrupt') audio.interrupt()
    else audio.dispose()
    expect(source.stoppedAt).toBe(.1)
    if (action !== 'dispose') audio.dispose()
  })
})

it('plays five different claim signatures through the real audio scheduler', () => {
  const signatures = Array.from({ length: 5 }, (_, tier) => {
    ctx = new FakeAudioContext()
    const audio = make()
    audio.wake()
    audio.playSfx('treasureClaim', tier)
    const signature = ctx.oscillators.map(n => [n.type, n.frequency.value, n.startedAt, n.stoppedAt])
    expect(signature.length).toBeGreaterThanOrEqual(3)
    expect(signature.length).toBeLessThanOrEqual(6)
    audio.dispose()
    return JSON.stringify(signature)
  })
  expect(new Set(signatures).size).toBe(5)
})

describe('sampled hero hurt feedback', () => {
  it('uses one finite cached sample, no overlapping generic tone, and respects mute', () => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    ctx.currentTime = 10
    audio.playSfx('hurt-heavy')
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.oscillators).toHaveLength(0)
    expect(ctx.sources[0]!.loop).toBe(false)
    const first = ctx.sources[0]!.buffer
    ctx.currentTime = 11
    audio.playSfx('hurt-heavy')
    expect(ctx.sources[1]!.buffer).toBe(first)
    ctx.currentTime = 12
    audio.playSfx('hurt-critical')
    expect(ctx.sources[2]!.buffer).not.toBe(first)
    audio.setSfxVolume(0)
    ctx.currentTime = 13
    audio.playSfx('hurt-extreme')
    expect(ctx.sources).toHaveLength(3)
  })
})


describe('Adventurer Hall upgrade Foley', () => {
  it('caches finite rank/milestone samples separately and respects the existing mute setting', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 10
    audio.playSfx('upgrade', 1)
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.sources[0]!.buffer?.length).toBe(Math.ceil(48000 * .74))
    expect(ctx.sources[0]!.loop).toBe(false)
    const rank = ctx.sources[0]!.buffer
    ctx.currentTime = 11
    audio.playSfx('upgrade', 1)
    expect(ctx.sources[1]!.buffer).toBe(rank)
    ctx.currentTime = 12
    audio.playSfx('upgrade', 2)
    expect(ctx.sources[2]!.buffer?.length).toBe(Math.ceil(48000 * 1.05))
    expect(ctx.sources[2]!.buffer).not.toBe(rank)
    audio.setSfxVolume(0)
    ctx.currentTime = 13
    audio.playSfx('upgrade', 1)
    expect(ctx.sources).toHaveLength(3)
  })
})

describe('Hall sampled feedback routing', () => {
  it('plays one cached sample per Hall event, with no generic oscillators', () => {
    const audio = make()
    audio.wake()
    const events = [['hover',1],['select',1],['deny',1],['upgrade',1],['upgrade',2],['upgrade',3],['upgrade',4],['upgrade',5]] as const
    for (const [index, [cue, variant]] of events.entries()) {
      ctx.currentTime = 10 + index * 2
      audio.playSfx(cue, variant)
    }
    expect(ctx.sources).toHaveLength(8)
    expect(ctx.oscillators).toHaveLength(0)
    expect(new Set(ctx.sources.map(source => source.buffer)).size).toBe(8)
    expect(ctx.sources.every(source => !source.loop)).toBe(true)
    audio.setSfxVolume(0)
    ctx.currentTime = 30
    audio.playSfx('upgrade', 5)
    expect(ctx.sources).toHaveLength(8)
    audio.dispose()
  })
})

describe('Rapid Hall purchases', () => {
  it('crossfades the previous reward instead of stacking celebration audio', () => {
    const audio = make()
    audio.wake()
    ctx.currentTime = 10
    audio.playSfx('upgrade', 1)
    ctx.currentTime = 10.2
    audio.playSfx('upgrade', 3)
    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources[0]!.stoppedAt).toBeCloseTo(10.235, 3)
    expect(ctx.sources[1]!.stoppedAt).toBeNull()
    audio.dispose()
  })
})

describe('audio scene ownership and deferred trusted resume', () => {
  it.each(['victory', 'defeat'] as const)('releases the boss soundtrack on %s and restores the menu', async outcome => {
    const menu = new FakeBgm()
    const audio = createAudioSystem({
      bgm, menuBgm: menu, storage: null, createContext: () => ctx,
      bossTracks: { 'abyss-monarch': ['boss1.wav', 'boss2.wav', 'boss3.wav'] },
      victoryTrack: 'victory.wav',
      loadMusic: async () => ctx.createBuffer(2, 480000, 24000),
    })
    audio.wake()
    audio.onScreen('play')
    audio.setBossTheme?.('abyss-monarch')
    await new Promise(resolve => setTimeout(resolve, 0))
    const boss = ctx.sources.find(source => source.loop)!
    expect(boss).toBeDefined()
    audio.setResultTheme?.(outcome)
    audio.onScreen('result')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(boss.stoppedAt).not.toBeNull()
    expect(ctx.sources.filter(source => source.loop)).toEqual([boss])
    const before = ctx.oscillators.length
    audio.playSfx(outcome)
    expect(ctx.oscillators.length).toBeGreaterThan(before)
    audio.onScreen('menu')
    expect(menu.paused).toBe(false)
    ctx.currentTime = 2
    audio.playSfx('hero-select')
    expect(ctx.sources.at(-1)?.loop).toBe(false)
    audio.dispose()
  })

  it.each(['hero-select', 'victory', 'defeat'] as const)('preserves the first %s cue while a trusted gesture resumes the context', async cue => {
    ctx.state = 'suspended'
    let finish!: () => void
    ctx.resume = () => new Promise<void>(resolve => { finish = () => { ctx.state = 'running'; resolve() } })
    const audio = make()
    if (cue !== 'hero-select') { audio.setResultTheme?.(cue); audio.onScreen('result') }
    audio.wake()
    audio.playSfx(cue)
    expect(ctx.oscillators).toHaveLength(0)
    expect(ctx.sources).toHaveLength(0)
    finish()
    await Promise.resolve()
    await Promise.resolve()
    expect(ctx.oscillators.length + ctx.sources.length).toBeGreaterThan(0)
    audio.dispose()
  })

  it.each(['menu', 'mute'] as const)('does not replay an unheard terminal cue after %s', async action => {
    const audio = make()
    audio.wake()
    audio.onScreen('play')
    audio.interrupt()
    audio.onScreen('result')
    audio.setResultTheme?.('defeat')
    audio.playSfx('defeat')
    expect(ctx.oscillators).toHaveLength(0)
    if (action === 'menu') audio.onScreen('menu')
    else { audio.setSfxVolume(0); audio.setSfxVolume(100) }
    audio.wake()
    await Promise.resolve()
    const sfxNotes = ctx.oscillators.filter(note =>
      ctx.gains.some(gain => note.targets.includes(gain) && gain.targets.includes(ctx.gains[0]!)))
    expect(sfxNotes).toHaveLength(0)
    audio.dispose()
  })

  it('never replays a pending cue after interruption or a screen change', async () => {
    ctx.state = 'suspended'
    let finish!: () => void
    ctx.resume = () => new Promise<void>(resolve => { finish = () => { ctx.state = 'running'; resolve() } })
    const audio = make()
    audio.wake()
    audio.playSfx('hero-select')
    audio.onScreen('play')
    audio.interrupt()
    finish()
    await Promise.resolve()
    await Promise.resolve()
    expect(ctx.sources).toHaveLength(0)
    expect(ctx.oscillators).toHaveLength(0)
    audio.dispose()
  })
})

describe('opt-in DEV result audio diagnostics', () => {
  it.each(['defeat', 'victory'] as const)('reports actual %s scheduling separately from sampled bus signals', async outcome => {
    const originalUrl = window.location.href
    window.history.replaceState(null, '', '?audioDiagnostics=1')
    vi.useFakeTimers()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const analysers: Array<{ fftSize: number; getFloatTimeDomainData(data: Float32Array): void }> = []
    const context = Object.assign(ctx, { createAnalyser() {
      const amplitude = analysers.length === 0 ? 0.125 : 0.25
      const node = { fftSize: 2048, getFloatTimeDomainData(data: Float32Array) {
        data.fill(amplitude)
      } }
      analysers.push(node)
      return node
    } })
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => context,
      victoryTrack: 'victory.wav', loadMusic: async () => context.createBuffer(2, 48000, 48000) })
    try {
      audio.wake()
      audio.onScreen('play')
      audio.onScreen('result')
      audio.setResultTheme?.(outcome)
      audio.tick('result')
      audio.playSfx(outcome)
      await vi.advanceTimersByTimeAsync(1000)
      expect(log).toHaveBeenCalledWith('[Audio][Result]', expect.objectContaining({
        outcome, audioContext: 'running', bgmEnabled: true, bgmVolume: 100,
        bgmScheduled: true, sfxEnabled: true, sfxVolume: 100, sfxScheduled: true,
        bgmSource: outcome === 'victory' ? 'victory.wav' : 'synth',
        bgmSignal: expect.objectContaining({ peak: 0.25, rmsMax: 0.25 }),
        sfxSignal: expect.objectContaining({ peak: 0.125, rmsMax: 0.125 }),
      }))
      expect(analysers).toHaveLength(2)
      expect(ctx.gains[0]!.targets).toContain(analysers[0])
      expect(ctx.gains[1]!.targets).toContain(analysers[1])
      audio.onScreen('menu')
      const count = log.mock.calls.length
      await vi.advanceTimersByTimeAsync(2000)
      expect(log.mock.calls).toHaveLength(count)
    } finally {
      audio.dispose()
      log.mockRestore()
      vi.useRealTimers()
      window.history.replaceState(null, '', originalUrl)
    }
  })

  it('reports muted and unavailable signals without claiming playback', async () => {
    const originalUrl = window.location.href
    window.history.replaceState(null, '', '?audioDiagnostics=1')
    vi.useFakeTimers()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const audio = make()
    try {
      audio.wake()
      audio.setMusicVolume(0)
      audio.setSfxVolume(0)
      audio.onScreen('result')
      audio.setResultTheme?.('defeat')
      audio.tick('result')
      audio.playSfx('defeat')
      await vi.advanceTimersByTimeAsync(1000)
      expect(log).toHaveBeenCalledWith('[Audio][Result]', expect.objectContaining({
        outcome: 'defeat', bgmVolume: 0, sfxVolume: 0,
        bgmScheduled: false, sfxScheduled: false, bgmSignal: null, sfxSignal: null,
      }))
    } finally {
      audio.dispose()
      log.mockRestore()
      vi.useRealTimers()
      window.history.replaceState(null, '', originalUrl)
    }
  })

  it('does not attach diagnostic nodes or emit logs without opt-in', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const createAnalyser = vi.fn()
    const audio = createAudioSystem({ bgm, storage: null, createContext: () => Object.assign(ctx, { createAnalyser }) })
    try {
      audio.wake()
      audio.onScreen('result')
      audio.setResultTheme?.('defeat')
      audio.tick('result')
      expect(createAnalyser).not.toHaveBeenCalled()
      expect(log).not.toHaveBeenCalled()
    } finally { audio.dispose(); log.mockRestore() }
  })
})
