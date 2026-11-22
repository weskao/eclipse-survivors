import { random } from '../math'
import type { GameMode, SfxCue } from '../types'
import { createBattleScore, createMenuScore } from './music'
import { NOISE_CUES, SFX_COOLDOWN, SFX_CUES } from './sfx'
import type { AudioSystem, BgmElement, CombatIntensity, SettingsStorage } from './types'

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
  suspend(): Promise<void>
  close(): Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainLike
  createBuffer(channels: number, length: number, sampleRate: number): BufferLike
  createBufferSource(): BufferSourceLike
  createBiquadFilter(): FilterLike
}

export interface AudioSystemOptions {
  bgm: BgmElement
  /** Pre-rendered title music; when omitted, retain the legacy synth for tests/fallback. */
  menuBgm?: BgmElement
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
const SFX_GAIN = 0.52
const clampVolume = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback
const MAX_SFX_PER_100MS = 8
const ESSENTIAL_SFX: ReadonlySet<SfxCue> = new Set(['start', 'pause', 'resume', 'upgrade', 'level', 'hurt', 'boss', 'bossDefeat', 'victory', 'defeat'])

export function createAudioSystem(opts: AudioSystemOptions): AudioSystem {
  const { bgm, menuBgm } = opts
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage
  const createContext = opts.createContext ?? defaultCreateContext
  let ac: AudioContextLike | null = null
  let master: GainLike | null = null
  let musicBus: GainLike | null = null
  let musicOn = true
  let sfxOn = true
  let musicVolume = 100
  let sfxVolume = 100
  let interrupted = false
  let mode: GameMode = 'menu'
  let intensity: CombatIntensity = 'calm'
  let noiseBuffer: BufferLike | null = null
  const recentSfx: number[] = []
  const menu = createMenuScore()
  const battle = createBattleScore()
  const sfxLast = new Map<SfxCue, number>()

  bgm.volume = 0.38
  try {
    musicOn = storage?.getItem('starMusic') !== 'off'
    sfxOn = storage?.getItem('starSfx') !== 'off'
    const storedMusic = storage?.getItem('eclipseMusicVolume')
    const storedSfx = storage?.getItem('eclipseSfxVolume')
    if (storedMusic !== null && storedMusic !== undefined) musicVolume = clampVolume(Number(storedMusic), 100)
    if (storedSfx !== null && storedSfx !== undefined) sfxVolume = clampVolume(Number(storedSfx), 100)
  } catch {
    /* storage blocked: keep defaults */
  }

  let previousMusicVolume = musicVolume || 100
  let previousSfxVolume = sfxVolume || 100

  const save = (key: string, on: boolean): void => {
    try {
      storage?.setItem(key, on ? 'on' : 'off')
    } catch {
      /* storage blocked */
    }
  }

  const menuLevel = (): number => 0.78 * musicVolume / 100

  const mp3Level = (): number =>
    (mode === 'level' ? 0.2 : intensity === 'boss' && mode === 'play' ? 0.27 :
      intensity === 'combat' && mode === 'play' ? 0.35 : 0.38) * musicVolume / 100

  bgm.volume = mp3Level()
  if (menuBgm) menuBgm.volume = menuLevel()

  const activeTrack = (): BgmElement | undefined =>
    mode === 'menu' ? menuBgm : mode === 'play' ? bgm : undefined

  const playScore = (): void => {
    const track = activeTrack()
    if (!track || !musicOn || !musicVolume || interrupted || !track.paused) return
    // Media playback must start from a trusted input gesture on iOS and Android.
    try {
      Promise.resolve(track.play()).then(() => {
        if (activeTrack() !== track || !musicOn || !musicVolume || interrupted) track.pause()
      }).catch(() => { /* Browser may require another gesture; keep user's preference. */ })
    } catch { /* A restricted audio element must not break game input. */ }
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

  // When the MP3 is playing, keep only subtle rhythmic accents from the synth.
  const combatPercussion = (midi: number, at: number, dur: number, vol: number, wave: OscillatorType, bus: 'sfx' | 'music'): void => {
    if (midi === 36) tone(midi, at, dur, vol, wave, bus)
  }

  const noiseBurst = (now: number): void => {
    if (!ac || !master) return
    const duration = 0.065
    const length = Math.ceil(ac.sampleRate * duration)
    if (!noiseBuffer) {
      noiseBuffer = ac.createBuffer(1, length, ac.sampleRate)
      const samples = noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) samples[i] = (random() * 2 - 1) * (1 - i / length)
    }
    const source = ac.createBufferSource()
    const filter = ac.createBiquadFilter()
    const volume = ac.createGain()
    source.buffer = noiseBuffer
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
    const recovering = interrupted || (ac !== null && ac.state !== 'running' && ac.state !== 'closed')
    interrupted = false
    try {
      // Mobile media can remain unpaused yet silent after an OS interruption.
      // Re-establish the HTMLMediaElement path on the next trusted gesture.
      const track = activeTrack()
      if (recovering && musicOn && track && !track.paused) track.pause()
      if (!ac || ac.state === 'closed') {
        const created = createContext()
        if (!created) { playScore(); return }
        ac = created
        noiseBuffer = null
        master = ac.createGain()
        master.gain.value = sfxOn ? SFX_GAIN * sfxVolume / 100 : 0
        master.connect(ac.destination)
        musicBus = ac.createGain()
        musicBus.gain.value = musicOn ? MUSIC_GAIN * musicVolume / 100 : 0
        musicBus.connect(ac.destination)
      }
      if (ac.state !== 'running' && ac.state !== 'closed') {
        void ac.resume().catch(() => { /* Browsers may require another gesture. */ })
      }
      playScore()
    } catch {
      ac = null
      master = null
      musicBus = null
    }
  }

  const interrupt = (): void => {
    if (interrupted) return
    interrupted = true
    bgm.pause()
    menuBgm?.pause()
    if (ac && ac.state === 'running') {
      void ac.suspend().catch(() => { /* Visibility can change during suspension. */ })
    }
  }

  const running = (): AudioContextLike | null =>
    (!interrupted && ac && ac.state === 'running' ? ac : null)

  return {
    get unlocked() { return ac !== null },
    get musicOn() { return musicOn },
    get sfxOn() { return sfxOn },
    get musicVolume() { return musicVolume },
    get sfxVolume() { return sfxVolume },
    setMusicVolume(value: number) {
      musicVolume = clampVolume(value, musicVolume)
      if (musicVolume > 0) previousMusicVolume = musicVolume
      try { storage?.setItem('eclipseMusicVolume', String(musicVolume)) } catch { /* unavailable */ }
      bgm.volume = mp3Level()
      if (menuBgm) menuBgm.volume = menuLevel()
      if (ac && musicBus) musicBus.gain.setTargetAtTime(musicOn ? MUSIC_GAIN * musicVolume / 100 : 0, ac.currentTime, 0.06)
      if (!musicVolume) { bgm.pause(); menuBgm?.pause() }
      else if (musicOn) playScore()
    },
    setSfxVolume(value: number) {
      sfxVolume = clampVolume(value, sfxVolume)
      if (sfxVolume > 0) previousSfxVolume = sfxVolume
      try { storage?.setItem('eclipseSfxVolume', String(sfxVolume)) } catch { /* unavailable */ }
      if (ac && master) master.gain.setTargetAtTime(sfxOn ? SFX_GAIN * sfxVolume / 100 : 0, ac.currentTime, 0.06)
    },
    wake,
    interrupt,
    setCombatIntensity(next) {
      if (intensity === next) return
      intensity = next
      battle.setIntensity(next)
      if (next === 'boss') battle.setClock(ac ? ac.currentTime + 0.04 : 0)
    },
    playSfx(cue) {
      const ctx = running()
      if (!sfxOn || !sfxVolume || !ctx) return
      const now = ctx.currentTime
      if (now - (sfxLast.get(cue) ?? -100) < SFX_COOLDOWN[cue]) return
      while (recentSfx.length && now - recentSfx[0]! >= 0.1) recentSfx.shift()
      if (recentSfx.length >= MAX_SFX_PER_100MS && !ESSENTIAL_SFX.has(cue)) return
      recentSfx.push(now)
      sfxLast.set(cue, now)
      for (const [pitch, delay, duration, gain, wave] of SFX_CUES[cue]) tone(pitch, now + delay, duration, gain, wave)
      if (NOISE_CUES.has(cue)) noiseBurst(now)
    },
    tick(mode) {
      const ctx = running()
      if (!musicOn || !musicVolume || !ctx) return
      if (mode === 'menu') { if (!menuBgm) menu.schedule(ctx.currentTime, tone); return }
      if (mode !== 'play') return
      if (bgm.paused || intensity === 'boss') battle.schedule(ctx.currentTime, tone)
      else if (intensity === 'combat') battle.schedule(ctx.currentTime, combatPercussion)
      if (!bgm.paused) {
        const target = mp3Level()
        const delta = target - bgm.volume
        if (Math.abs(delta) > 0.001) bgm.volume += Math.sign(delta) * Math.min(Math.abs(delta), 0.012)
      }
    },
    onScreen(nextMode: GameMode) {
      const previous = mode
      mode = nextMode
      if (mode !== 'menu') menuBgm?.pause()
      if (mode === 'menu' || mode === 'paused' || mode === 'result') bgm.pause()
      if (mode === 'menu') {
        intensity = 'calm'
        battle.setIntensity('calm')
        bgm.currentTime = 0
        if (previous !== 'menu' && menuBgm) menuBgm.currentTime = 0
        menu.setClock(ac ? ac.currentTime + 0.06 : 0)
        menu.resetStep()
      }
      bgm.volume = mp3Level()
      if (menuBgm) menuBgm.volume = menuLevel()
      if (mode === 'play' || mode === 'menu') playScore()
    },
    resetBattleClock(delay) {
      battle.setClock(ac ? ac.currentTime + delay : 0)
    },
    toggleMusic(screen) {
      mode = screen
      if (musicVolume === 0) {
        musicVolume = previousMusicVolume
        try { storage?.setItem('eclipseMusicVolume', String(musicVolume)) } catch { /* unavailable */ }
        bgm.volume = mp3Level()
        if (menuBgm) menuBgm.volume = menuLevel()
        if (musicOn) {
          if (ac && musicBus) musicBus.gain.setTargetAtTime(MUSIC_GAIN * musicVolume / 100, ac.currentTime, 0.06)
          wake()
          return true
        }
      }
      musicOn = !musicOn
      save('starMusic', musicOn)
      if (ac && musicBus) musicBus.gain.setTargetAtTime(musicOn ? MUSIC_GAIN * musicVolume / 100 : 0, ac.currentTime, 0.06)
      if (musicOn) {
        wake()
        if (screen === 'play') playScore()
        const t = ac ? ac.currentTime + 0.04 : 0
        menu.setClock(t)
        battle.setClock(t)
      } else {
        bgm.pause()
        menuBgm?.pause()
      }
      return musicOn
    },
    toggleSfx() {
      if (sfxVolume === 0) {
        sfxVolume = previousSfxVolume
        try { storage?.setItem('eclipseSfxVolume', String(sfxVolume)) } catch { /* unavailable */ }
        if (sfxOn) {
          if (ac && master) master.gain.setTargetAtTime(SFX_GAIN * sfxVolume / 100, ac.currentTime, 0.06)
          wake()
          return true
        }
      }
      sfxOn = !sfxOn
      save('starSfx', sfxOn)
      if (ac && master) master.gain.setTargetAtTime(sfxOn ? SFX_GAIN * sfxVolume / 100 : 0, ac.currentTime, 0.06)
      if (sfxOn) wake()
      return sfxOn
    },
    dispose() {
      interrupted = true
      bgm.pause()
      menuBgm?.pause()
      ac?.close().catch(() => {})
      ac = null
      master = null
      musicBus = null
      noiseBuffer = null
      sfxLast.clear()
      recentSfx.length = 0
    },
  }
}
