import { random } from '../math'
import type { GameMode, SfxCue } from '../types'
import { createBattleScore, createMenuScore } from './music'
import { NOISE_CUES, SFX_COOLDOWN, SFX_CUES } from './sfx'
import type { AudioSystem, BgmElement, SettingsStorage } from './types'

// Minimal structural slice of the Web Audio API actually used, so a fake can stand in for it.
export interface AudioParamLike {
  value: number
  setValueAtTime(value: number, time: number): unknown
  exponentialRampToValueAtTime(value: number, time: number): unknown
  setTargetAtTime(value: number, time: number, timeConstant: number): unknown
}
export interface AudioNodeLike { connect(destination: object): unknown }
export interface GainLike extends AudioNodeLike { gain: AudioParamLike }
export interface OscillatorLike extends AudioNodeLike {
  type: OscillatorType
  frequency: { value: number }
  start(when: number): void
  stop(when: number): void
}
export interface BufferLike { getChannelData(channel: number): Float32Array }
export interface BufferSourceLike extends AudioNodeLike {
  buffer: BufferLike | null
  start(when: number): void
  stop(when: number): void
}
export interface FilterLike extends AudioNodeLike {
  type: BiquadFilterType
  frequency: { value: number }
}
export interface AudioContextLike {
  readonly currentTime: number
  readonly state: AudioContextState
  readonly sampleRate: number
  readonly destination: object
  resume(): Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainLike
  createBuffer(channels: number, length: number, sampleRate: number): BufferLike
  createBufferSource(): BufferSourceLike
  createBiquadFilter(): FilterLike
}

export interface AudioSystemOptions {
  bgm: BgmElement
  /** Omit for `localStorage`; `null` disables persistence. */
  storage?: SettingsStorage | null
  /** Omit for `window.AudioContext ?? webkitAudioContext`. */
  createContext?: () => AudioContextLike | null
}

type SafariWindow = Window & { webkitAudioContext?: new () => AudioContextLike }

const defaultCreateContext = (): AudioContextLike | null => {
  if (typeof window === 'undefined') return null
  const w: SafariWindow = window
  const Ctor = window.AudioContext ?? w.webkitAudioContext
  return Ctor ? new Ctor() : null
}

const defaultStorage = (): SettingsStorage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const MUSIC_GAIN = 0.65

export function createAudioSystem(opts: AudioSystemOptions): AudioSystem {
  const { bgm } = opts
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage
  const createContext = opts.createContext ?? defaultCreateContext
  let ac: AudioContextLike | null = null
  let master: GainLike | null = null
  let musicBus: GainLike | null = null
  let musicOn = true
  let sfxOn = true
  const menu = createMenuScore()
  const battle = createBattleScore()
  const sfxLast = new Map<SfxCue, number>()

  bgm.volume = 0.38
  try {
    musicOn = storage?.getItem('starMusic') !== 'off'
    sfxOn = storage?.getItem('starSfx') !== 'off'
  } catch {
    /* storage blocked: keep defaults */
  }

  const save = (key: string, on: boolean): void => {
    try {
      storage?.setItem(key, on ? 'on' : 'off')
    } catch {
      /* storage blocked */
    }
  }

  const playScore = (): void => {
    if (musicOn && bgm.paused) Promise.resolve(bgm.play()).catch(() => {})
  }

  const tone = (midi: number, at: number, dur: number, vol = 0.035, wave: OscillatorType = 'triangle', bus: 'sfx' | 'music' = 'sfx'): void => {
    if (!ac || !master) return
    const o = ac.createOscillator()
    const v = ac.createGain()
    o.type = wave
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    v.gain.setValueAtTime(0.0001, at)
    v.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), at + Math.min(0.02, dur * 0.25))
    v.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(v)
    v.connect(bus === 'music' && musicBus ? musicBus : master)
    o.start(at)
    o.stop(at + dur + 0.03)
  }

  const noiseBurst = (now: number): void => {
    if (!ac || !master) return
    const duration = 0.065
    const length = Math.ceil(ac.sampleRate * duration)
    const buf = ac.createBuffer(1, length, ac.sampleRate)
    const samples = buf.getChannelData(0)
    for (let i = 0; i < length; i++) samples[i] = (random() * 2 - 1) * (1 - i / length)
    const source = ac.createBufferSource()
    const filter = ac.createBiquadFilter()
    const volume = ac.createGain()
    source.buffer = buf
    filter.type = 'highpass'
    filter.frequency.value = 500
    volume.gain.setValueAtTime(0.016, now)
    volume.gain.exponentialRampToValueAtTime(0.001, now + duration)
    source.connect(filter)
    filter.connect(volume)
    volume.connect(master)
    source.start(now)
    source.stop(now + duration)
  }

  const wake = (): void => {
    try {
      if (!ac) {
        const created = createContext()
        if (!created) return
        ac = created
        master = ac.createGain()
        master.gain.value = 0.52
        master.connect(ac.destination)
        musicBus = ac.createGain()
        musicBus.gain.value = musicOn ? MUSIC_GAIN : 0
        musicBus.connect(ac.destination)
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {})
    } catch {
      ac = null
      master = null
      musicBus = null
    }
  }

  const running = (): AudioContextLike | null => (ac && ac.state === 'running' ? ac : null)

  return {
    get unlocked() { return ac !== null },
    get musicOn() { return musicOn },
    get sfxOn() { return sfxOn },
    wake,
    playSfx(cue) {
      const ctx = running()
      if (!sfxOn || !ctx) return
      const now = ctx.currentTime
      if (now - (sfxLast.get(cue) ?? -100) < SFX_COOLDOWN[cue]) return
      sfxLast.set(cue, now)
      for (const [pitch, delay, duration, gain, wave] of SFX_CUES[cue]) tone(pitch, now + delay, duration, gain, wave)
      if (NOISE_CUES.has(cue)) noiseBurst(now)
    },
    tick(mode) {
      const ctx = running()
      if (mode === 'menu') {
        if (musicOn && ctx) menu.schedule(ctx.currentTime, tone)
        return
      }
      if (!musicOn || mode !== 'play' || !ctx || !bgm.paused) return
      battle.schedule(ctx.currentTime, tone)
    },
    onScreen(mode: GameMode) {
      if (mode === 'menu' || mode === 'paused' || mode === 'result') bgm.pause()
      if (mode === 'menu') {
        bgm.currentTime = 0
        menu.setClock(ac ? ac.currentTime + 0.06 : 0)
        menu.resetStep()
      }
      bgm.volume = mode === 'level' ? 0.2 : 0.38
      if (mode === 'play') playScore()
    },
    resetBattleClock(delay) {
      battle.setClock(ac ? ac.currentTime + delay : 0)
    },
    toggleMusic(mode) {
      musicOn = !musicOn
      save('starMusic', musicOn)
      if (ac && musicBus) musicBus.gain.setTargetAtTime(musicOn ? MUSIC_GAIN : 0, ac.currentTime, 0.06)
      if (musicOn) {
        wake()
        if (mode === 'play') playScore()
        const t = ac ? ac.currentTime + 0.04 : 0
        menu.setClock(t)
        battle.setClock(t)
      } else {
        bgm.pause()
      }
      return musicOn
    },
    toggleSfx() {
      sfxOn = !sfxOn
      save('starSfx', sfxOn)
      if (sfxOn) wake()
      return sfxOn
    },
  }
}
