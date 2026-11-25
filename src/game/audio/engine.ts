import { random } from '../math'
import type { GameMode, SfxCue } from '../types'
import { createBattleScore, createMenuScore } from './music'
import { createBossScore } from './boss-score'
import { createCinematicMusic } from './cinematic'
import { createEs2Score } from './es2/score'
import type { BossId } from '../content/bosses/definitions'
import { ATTACK_PRESENTATION } from '../content/bosses/attack-presentation'
import { createBossAttackAudio } from './boss-attacks'
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
export interface BufferLike { getChannelData(channel: number): Float32Array; readonly duration?: number }
export interface BufferSourceLike extends AudioNodeLike {
  buffer: BufferLike | null
  loop?: boolean
  start(when: number, offset?: number): void
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
  decodeAudioData?(data: ArrayBuffer): Promise<BufferLike>
  createBiquadFilter(): FilterLike
}

export interface AudioSystemOptions {
  bgm: BgmElement
  /** Pre-rendered title music; when omitted, retain the legacy synth for tests/fallback. */
  menuBgm?: BgmElement
  bossTracks?: Partial<Record<BossId, readonly [string, string, string]>>
  warningTrack?: string
  /** Pre-rendered, non-looping victory theme (falls back to ES2 synthesis on load error). */
  victoryTrack?: string
  loadMusic?: (url: string, ctx: AudioContextLike) => Promise<BufferLike | null>
  /** Testable loader for the short, pre-rendered hero cast samples. */
  loadHeroSfx?: (url: string, ctx: AudioContextLike) => Promise<BufferLike | null>
  loadBossSfx?: (url: string, ctx: AudioContextLike) => Promise<BufferLike | null>
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
const HERO_CAST_CUES = ['shadowblade-special', 'spirit-summoner-special', 'crimson-paladin-special'] as const
const MAX_SFX_PER_100MS = 8
const ESSENTIAL_SFX: ReadonlySet<SfxCue> = new Set(['start', 'pause', 'resume', 'upgrade', 'level', 'hurt', 'boss', 'bossDefeat', 'victory', 'defeat',
  'shadowblade-special', 'spirit-summoner-special', 'crimson-paladin-special'])

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
  let externalScoreActive = false
  let mode: GameMode = 'menu'
  let intensity: CombatIntensity = 'calm'
  let warningMix = false
  let noiseBuffer: BufferLike | null = null
  const heroCastBuffers = new Map<SfxCue, BufferLike>()
  // A cast belongs to the expedition, not the transient gameplay screen. Track both
  // decoded one-shots and finite synth fallback notes so Home can cancel either path.
  const heroCastVoices: { source: Pick<BufferSourceLike, 'stop'>; endsAt: number }[] = []
  const pruneHeroCasts = (now: number): void => {
    for (let i = heroCastVoices.length - 1; i >= 0; i--) {
      if (heroCastVoices[i]!.endsAt <= now) heroCastVoices.splice(i, 1)
    }
  }
  const stopHeroCast = (): void => {
    if (ac) {
      pruneHeroCasts(ac.currentTime)
      for (const { source } of heroCastVoices) {
        try { source.stop(ac.currentTime) } catch { /* already ended */ }
      }
    }
    heroCastVoices.length = 0
  }
  const preloadHeroCasts = (ctx: AudioContextLike): void => {
    heroCastBuffers.clear()
    if (!opts.loadHeroSfx && (!ctx.decodeAudioData || typeof fetch !== 'function')) return
    for (const cue of HERO_CAST_CUES) {
      const url = import.meta.env.BASE_URL + 'audio/heroes/' + cue + '.wav'
      void Promise.resolve().then(() => opts.loadHeroSfx
        ? opts.loadHeroSfx(url, ctx)
        : fetch(url).then(res => {
          if (!res.ok) throw new Error('Hero cast sample unavailable')
          return res.arrayBuffer()
        }).then(data => ctx.decodeAudioData!(data)))
        .then(buffer => {
          if (buffer && ac === ctx) heroCastBuffers.set(cue, buffer)
        }).catch(() => { /* retain immediate fallback, never replay a missed cast */ })
    }
  }
  const recentSfx: number[] = []
  const menu = createMenuScore()
  const battle = createBattleScore()
  const bossScore = createBossScore()
  let fallbackBossId: BossId | null = null
  const cinematic = createCinematicMusic(opts, () => ac, () => musicBus,
    () => (mode === 'play' || mode === 'result') && !interrupted && musicOn && musicVolume > 0)
  let resultScore = createEs2Score()
  let resultScene: 'victory' | 'defeat' | null = null
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
    (mode === 'level' ? 0.2 : intensity === 'boss' && mode === 'play' ? 0 :
      warningMix && mode === 'play' ? 0.12 :
      intensity === 'combat' && mode === 'play' ? 0.35 : 0.38) * musicVolume / 100

  bgm.volume = mp3Level()
  if (menuBgm) menuBgm.volume = menuLevel()

  const activeTrack = (): BgmElement | undefined =>
    externalScoreActive ? undefined : mode === 'menu' ? menuBgm : mode === 'play' ? bgm : undefined

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

  const tone = (midi: number, at: number, dur: number, vol = 0.035, wave: OscillatorType = 'triangle', bus: 'sfx' | 'music' = 'sfx'): OscillatorLike | undefined => {
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
    return o
  }

  const bossAttacks = createBossAttackAudio(() => ac, () => master,
    () => !interrupted && sfxOn && sfxVolume > 0 && mode === 'play',
    (id, stage) => {
      const p = ATTACK_PRESENTATION[id]
      const midi = 69 + 12 * Math.log2(p.pitch / 440)
      return tone(midi + (stage === 'warning' ? 5 : 0), ac!.currentTime,
        stage === 'warning' ? 0.35 : 0.5, stage === 'warning' ? 0.035 : 0.075,
        p.boss === 'infernal-titan' ? 'triangle' : 'sine')
    }, opts.loadBossSfx)

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
        preloadHeroCasts(ac)
      }
      if (ac.state !== 'running' && ac.state !== 'closed') {
        void ac.resume().catch(() => { /* Browsers may require another gesture. */ })
      }
      playScore()
      cinematic.sync()
      if (recovering && ac && resultScene) resultScore.resume(ac.currentTime)
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
    cinematic.stop(true)
    stopHeroCast()
    bossAttacks.cancel()
    resultScore.interrupt()
    if (ac && ac.state === 'running') {
      void ac.suspend().catch(() => { /* Visibility can change during suspension. */ })
    }
  }

  const running = (): AudioContextLike | null =>
    (!interrupted && ac && ac.state === 'running' ? ac : null)

  return {
    get unlocked() { return ac !== null },
    createEs2Port() {
      return {
        now: () => ac?.currentTime ?? 0,
        isRunning: () => running() !== null,
        tone: (midi: number, at: number, dur: number, vol: number, wave: OscillatorType, bus: 'sfx' | 'music') => {
          if (running()) tone(midi, at, dur, vol, wave, bus)
        },
      }
    },
    setExternalScoreActive(active: boolean) {
      externalScoreActive = active
      if (active) { bgm.pause(); menuBgm?.pause() }
      else playScore()
    },
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
      if (!musicVolume) { bgm.pause(); menuBgm?.pause(); cinematic.stop(true) }
      else if (musicOn) { playScore(); cinematic.sync() }
    },
    setSfxVolume(value: number) {
      sfxVolume = clampVolume(value, sfxVolume)
      if (sfxVolume > 0) previousSfxVolume = sfxVolume
      else { stopHeroCast(); bossAttacks.cancel() }
      try { storage?.setItem('eclipseSfxVolume', String(sfxVolume)) } catch { /* unavailable */ }
      if (ac && master) master.gain.setTargetAtTime(sfxOn ? SFX_GAIN * sfxVolume / 100 : 0, ac.currentTime, 0.06)
    },
    wake,
    interrupt,
    setResultTheme(next) {
      resultScene = next
      resultScore.dispose()
      resultScore = createEs2Score()
      if (next) resultScore.change(next, ac ? ac.currentTime + 0.02 : 0)
      cinematic.result(next === 'victory')
    },
    setCombatIntensity(next) {
      if (intensity === next) return
      intensity = next
      battle.setIntensity(next)
      if (next === 'boss') battle.setClock(ac ? ac.currentTime + 0.04 : 0)
    },
    setBossTheme(id: BossId | null, phase = 1) {
      // The ID comes from the actual living actor, never a predicted timer.
      bossScore.select(id, phase, ac ? ac.currentTime : 0)
      fallbackBossId = id
      if (id) warningMix = false
      cinematic.boss(id, phase)
    },
    setBossWarning(seconds) {
      warningMix = seconds !== null && seconds > 0 && seconds <= 15
      cinematic.warning(seconds)
    },
    prepareBossAttackAudio(id) { bossAttacks.prepare(id) },
    playBossAttack(id, stage) { bossAttacks.play(id, stage) },
    cancelBossAttackAudio() { bossAttacks.cancel() },
    playSfx(cue) {
      const ctx = running()
      if (!sfxOn || !sfxVolume || !ctx) return
      const now = ctx.currentTime
      if (now - (sfxLast.get(cue) ?? -100) < SFX_COOLDOWN[cue]) return
      while (recentSfx.length && now - recentSfx[0]! >= 0.1) recentSfx.shift()
      if (recentSfx.length >= MAX_SFX_PER_100MS && !ESSENTIAL_SFX.has(cue)) return
      recentSfx.push(now)
      sfxLast.set(cue, now)
      const heroCast = HERO_CAST_CUES.some(special => special === cue)
      if (heroCast) pruneHeroCasts(now)
      const cast = heroCastBuffers.get(cue)
      if (cast && master) {
        try {
          const source = ctx.createBufferSource()
          source.buffer = cast
          source.loop = false
          source.connect(master)
          source.start(now)
          heroCastVoices.push({ source, endsAt: now + (cast.duration ?? cast.getChannelData(0).length / ctx.sampleRate) })
          return
        } catch { /* fall back to the bounded original cue */ }
      }
      for (const [pitch, delay, duration, gain, wave] of SFX_CUES[cue]) {
        const source = tone(pitch, now + delay, duration, gain, wave)
        if (heroCast && source) heroCastVoices.push({ source, endsAt: now + delay + duration + 0.03 })
      }
      if (NOISE_CUES.has(cue)) noiseBurst(now)
    },
    tick(mode) {
      if (externalScoreActive) return
      const ctx = running()
      if (!musicOn || !musicVolume || !ctx) return
      if (mode === 'menu') { if (!menuBgm) menu.schedule(ctx.currentTime, tone); return }
      if (mode === 'result') {
        if (resultScene === 'victory' && opts.victoryTrack) {
          cinematic.sync()
          if (!cinematic.resultFallback) return
        }
        if (resultScene) resultScore.schedule(ctx.currentTime, tone, 0.88)
        return
      }
      if (mode !== 'play') return
      cinematic.sync()
      if (intensity === 'boss' && !cinematic.playingBoss) {
        if (fallbackBossId) bossScore.schedule(ctx.currentTime, tone)
        else battle.schedule(ctx.currentTime, tone)
      }
      else if (bgm.paused) battle.schedule(ctx.currentTime, tone)
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
      // Level-up, treasure, pause/settings and result overlays must never truncate a cast.
      // Only leaving the expedition for Home cancels it (explicit mute/OS teardown are separate).
      if (mode === 'menu') { stopHeroCast(); bossAttacks.prepare(null) }
      else if (mode !== 'play') bossAttacks.cancel()
      if (mode !== 'result') {
        resultScene = null
        resultScore.dispose()
        resultScore = createEs2Score()
        cinematic.result(false)
      }
      if (mode !== 'menu') menuBgm?.pause()
      if (mode !== 'play' && mode !== 'result') cinematic.stop(mode === 'paused' || mode === 'level')
      if (mode === 'menu' || mode === 'paused' || mode === 'result') bgm.pause()
      if (mode === 'menu') {
        intensity = 'calm'
        battle.setIntensity('calm')
        bossScore.select(null, 1, ac ? ac.currentTime : 0)
        fallbackBossId = null
        warningMix = false
        cinematic.boss(null)
        cinematic.warning(null)
        bgm.currentTime = 0
        if (previous !== 'menu' && menuBgm) menuBgm.currentTime = 0
        menu.setClock(ac ? ac.currentTime + 0.06 : 0)
        menu.resetStep()
      }
      bgm.volume = mp3Level()
      if (menuBgm) menuBgm.volume = menuLevel()
      if (mode === 'play' || mode === 'menu') playScore()
      if (mode === 'play' || mode === 'result') cinematic.sync()
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
          cinematic.sync()
          return true
        }
      }
      musicOn = !musicOn
      save('starMusic', musicOn)
      if (ac && musicBus) musicBus.gain.setTargetAtTime(musicOn ? MUSIC_GAIN * musicVolume / 100 : 0, ac.currentTime, 0.06)
      if (musicOn) {
        wake()
        if (screen === 'play') { playScore(); cinematic.sync() }
        const t = ac ? ac.currentTime + 0.04 : 0
        menu.setClock(t)
        battle.setClock(t)
      } else {
        bgm.pause()
        menuBgm?.pause()
        cinematic.stop(true)
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
      else { stopHeroCast(); bossAttacks.cancel() }
      return sfxOn
    },
    dispose() {
      interrupted = true
      bgm.pause()
      menuBgm?.pause()
      cinematic.dispose()
      stopHeroCast()
      bossAttacks.prepare(null)
      heroCastBuffers.clear()
      ac?.close().catch(() => {})
      ac = null
      master = null
      musicBus = null
      noiseBuffer = null
      bossScore.select(null, 1, 0)
      resultScore.dispose()
      resultScene = null
      sfxLast.clear()
      recentSfx.length = 0
    },
  }
}
