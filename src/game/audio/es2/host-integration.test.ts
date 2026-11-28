import { describe, expect, it, vi } from 'vitest'
import { createAudioSystem } from '../engine'
import { SFX_CUES } from '../sfx'
import { FakeAudioContext, FakeBuffer } from '../fakeAudio'
import type { ToneFn } from '../music'
import type { AudioSystem, BgmElement } from '../types'
import { createEs2AudioAdapter } from './adapter'
import { createEngine } from '../../engine'
import { HERO_SPECIALIZATIONS_PACK } from '../../content/heroes'
import { DURATION } from '../../constants'
import { getMode } from '../../../meta/modes'
import { RELICS_PACK } from '../../content/packs/relics'

class Media implements BgmElement {
  paused = true
  volume = 0
  currentTime = 0
  played = 0
  pausedCount = 0
  play(): Promise<void> { this.played++; this.paused = false; return Promise.resolve() }
  pause(): void { this.pausedCount++; this.paused = true }
}

interface HostScoreControls {
  createEs2Port?(): { now(): number; isRunning(): boolean; tone: ToneFn }
  setExternalScoreActive?(active: boolean): void
}

function setup() {
  const bgm = new Media(), menu = new Media()
  const context = new FakeAudioContext()
  let created = 0
  const audio = createAudioSystem({
    bgm, menuBgm: menu, storage: null,
    createContext: () => { created++; return context },
  })
  return { audio, bgm, menu, context, created: () => created }
}

describe('ES2 final host audio wiring', () => {
  it.each([
    ['knight', 'knight-special'],
    ['ranger', 'ranger-special'],
    ['wizard', 'wizard-special'],
    ['shadowblade', 'shadowblade-special'],
    ['spirit-summoner', 'spirit-summoner-special'],
    ['crimson-paladin', 'crimson-paladin-special'],
  ] as const)('plays a single preloaded cinematic sample for %s, without legacy layering', async (hero, cue) => {
    const context = new FakeAudioContext()
    const loaded = new Map<string, FakeBuffer>()
    const audio = createAudioSystem({
      bgm: new Media(), storage: null, createContext: () => context,
      loadHeroSfx: async (url) => {
        const buffer = new FakeBuffer(64000, 32000)
        loaded.set(url, buffer)
        return buffer
      },
    })
    const engine = createEngine({ audio, contentPacks: [HERO_SPECIALIZATIONS_PACK] })
    engine.selectHero(hero)
    expect(engine.ui.heroId).toBe(hero)
    engine.selectRunMode('standard')
    engine.start()
    engine.state.mobs = []
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(loaded.size).toBe(7) // all six heroes plus crimson-paladin-retribution
    const expected = [...loaded.entries()].find(([url]) => url.endsWith(cue + '.wav'))?.[1]
    expect(expected).toBeDefined()
    const before = context.oscillators.length
    const sources = context.sources.length
    expect(engine.activateHeroSpecial()).toBe(true)
    expect(context.sources).toHaveLength(sources + 1)
    const source = context.sources[sources]!
    expect(source.buffer).toBe(expected)
    expect(source.targets).toContain(context.gains[0])
    expect(source.loop).not.toBe(true)
    expect(context.oscillators).toHaveLength(before)
    expect(engine.activateHeroSpecial()).toBe(false)
    expect(context.sources).toHaveLength(sources + 1)
    // Real engine path: XP opens the upgrade picker, then pause/settings and Home.
    context.currentTime = .1
    engine.testApi.level()
    expect(engine.state.mode).toBe('level')
    expect(source.stoppedAt).toBeNull()
    engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
    expect(engine.state.mode).toBe('play')
    engine.togglePause()
    expect(engine.state.mode).toBe('paused')
    expect(source.stoppedAt).toBeNull()
    engine.togglePause()
    engine.openSettings()
    expect(engine.ui.settingsOpen).toBe(true)
    expect(source.stoppedAt).toBeNull()
    engine.closeSettings()
    expect(engine.state.mode).toBe('play')
    expect(context.sources).toHaveLength(sources + 1)
    audio.interrupt()
    expect(source.stoppedAt).not.toBeNull()
    audio.wake()
    engine.goMenu()
    engine.start()
    engine.state.mobs = []
    audio.setSfxVolume(0)
    const muted = context.sources.length
    expect(engine.activateHeroSpecial()).toBe(true)
    expect(context.sources).toHaveLength(muted)
    audio.dispose()
  })

  it.each([
    ['knight', 'knight-special'],
    ['ranger', 'ranger-special'],
    ['wizard', 'wizard-special'],
    ['shadowblade', 'shadowblade-special'],
    ['spirit-summoner', 'spirit-summoner-special'],
    ['crimson-paladin', 'crimson-paladin-special'],
  ] as const)('plays the dedicated %s sound via the shared SFX bus and respects mute', (hero, cue) => {
    const { audio, context, created } = setup()
    const engine = createEngine({ audio, contentPacks: [HERO_SPECIALIZATIONS_PACK] })
    engine.selectHero(hero)
    expect(engine.ui.heroId).toBe(hero)
    engine.selectRunMode('standard')
    engine.start()
    engine.state.mobs = []
    const before = context.oscillators.length
    expect(engine.activateHeroSpecial()).toBe(true)
    const notes = context.oscillators.slice(before)
    expect(notes.map(note => Math.round(69 + 12 * Math.log2(note.frequency.value / 440))))
      .toEqual(SFX_CUES[cue].map(([pitch]) => pitch))
    expect(engine.activateHeroSpecial()).toBe(false)
    expect(context.oscillators.length).toBe(before + notes.length)
    engine.goMenu()
    engine.start()
    engine.state.mobs = []
    audio.setSfxVolume(0)
    const muted = context.oscillators.length
    expect(engine.activateHeroSpecial()).toBe(true)
    expect(context.oscillators.length).toBe(muted)
    expect(created()).toBe(1)
    audio.dispose()
  })

  it('reuses exactly one existing AudioContext and never runs the old score beside the ES2 score', () => {
    const { audio, bgm, menu, context, created } = setup()
    const host = audio as AudioSystem & HostScoreControls
    expect(typeof host.createEs2Port).toBe('function')
    expect(typeof host.setExternalScoreActive).toBe('function')
    const port = host.createEs2Port!()
    host.setExternalScoreActive!(true)
    expect(created()).toBe(0)
    const adaptive = createEs2AudioAdapter({ audio, ...port })
    adaptive.wakeFromGesture()
    expect(created()).toBe(1)
    audio.onScreen('menu')
    adaptive.setScene('menu')
    adaptive.tick('menu')
    expect(context.oscillators.length).toBeGreaterThan(0)
    const before = context.oscillators.length
    audio.tick('menu')
    audio.tick('play')
    expect(context.oscillators).toHaveLength(before)
    expect(menu.played).toBe(0)
    expect(bgm.played).toBe(0)
    context.currentTime = 1
    adaptive.setScene('boss')
    adaptive.tick('play')
    expect(context.oscillators.length).toBeGreaterThan(before)
    adaptive.dispose()
    audio.dispose()
    expect(created()).toBe(1)
  })

  it('real engine starts ES2 music without starting either old media track', () => {
    const { audio, bgm, menu, context, created } = setup()
    const engine = createEngine({ audio, contentPacks: [] })
    expect(created()).toBe(0)
    engine.start()
    expect(created()).toBe(1)
    expect(bgm.played).toBe(0)
    expect(menu.played).toBe(0)
    const previous = context.oscillators.length
    audio.tick('play')
    expect(context.oscillators).toHaveLength(previous)
    engine.goMenu()
    // The title screen keeps the previous pre-rendered overture; ES2 only scores runs.
    expect(bgm.played).toBe(0)
    expect(menu.played).toBe(1)
    const menuOscillators = context.oscillators.length
    context.currentTime = 2
    audio.tick('menu')
    expect(context.oscillators).toHaveLength(menuOscillators)
  })

  it('real engine plays the old overture on the title screen and hands off to ES2 on start', () => {
    const { audio, bgm, menu } = setup()
    const engine = createEngine({ audio, contentPacks: [] })
    audio.wake()
    expect(menu.played).toBe(1)
    expect(bgm.played).toBe(0)
    engine.start()
    expect(menu.paused).toBe(true)
  })

  it('keeps the actual sampled boss theme uninterrupted while choosing a skill', async () => {
    const context = new FakeAudioContext()
    const bgm = new Media()
    const audio = createAudioSystem({
      bgm, storage: null, createContext: () => context,
      bossTracks: { 'abyss-monarch': ['abyss-p1.mp3', 'abyss-p2.mp3', 'abyss-p3.mp3'] },
      loadMusic: async () => new FakeBuffer(480000, 24000),
    })
    const engine = createEngine({ audio, contentPacks: [] })
    engine.start()
    engine.state.bossSpawned = true
    engine.state.mobs = [{ x: 500, y: 0, type: 'boss', hp: 100, max: 100, r: 48,
      speed: 0, dmg: 32, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }]
    engine.state.time = 0.24
    engine.advance(0.033)
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    const bossLoop = context.sources.find(source => source.loop)!
    expect(bossLoop).toBeDefined()
    // Complete the host crossfade before measuring uninterrupted boss ownership.
    for (let i = 0; i < 60; i++) audio.tick('play')
    expect(bgm.volume).toBeCloseTo(0)
    context.currentTime = 5
    engine.testApi.level()
    expect(engine.state.mode).toBe('level')
    expect(bossLoop.stoppedAt).toBeNull()
    expect(bgm.volume).toBeCloseTo(0)
    context.currentTime = 10
    audio.tick('level')
    expect(bossLoop.stoppedAt).toBeNull()
    engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
    expect(engine.state.mode).toBe('play')
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(bossLoop.stoppedAt).toBeNull()
    expect(context.sources.filter(source => source.loop)).toEqual([bossLoop])
    audio.dispose()
  })


  it.each(['upgrade', 'treasure-claim', 'treasure-cancel'] as const)('keeps the sampled Boss and host mix unchanged through %s', async kind => {
    const context = new FakeAudioContext()
    const bgm = new Media()
    const audio = createAudioSystem({
      bgm, storage: null, createContext: () => context,
      bossTracks: { 'abyss-monarch': ['abyss-p1.mp3', 'abyss-p2.mp3', 'abyss-p3.mp3'] },
      loadMusic: async () => new FakeBuffer(480000, 24000),
    })
    const engine = createEngine({ audio, contentPacks: [RELICS_PACK] })
    try {
      engine.start()
      const s = engine.state
      s.bossSpawned = true
      s.spawnT = 9999
      s.mobs = [{ x: s.hero!.x + 500, y: s.hero!.y, type: 'boss', hp: 1000, max: 1000, r: 48,
        speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }]
      s.time = 0.24
      engine.advance(0.033)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      const bossLoop = context.sources.find(source => source.loop)!
      expect(bossLoop).toBeDefined()
      for (let i = 0; i < 60; i++) audio.tick('play')
      expect(bgm.volume).toBeCloseTo(0)
      const playCalls = bgm.played, pauseCalls = bgm.pausedCount
      const time = bgm.currentTime
      context.currentTime = 5
      if (kind === 'upgrade') engine.testApi.level()
      else {
        s.events.push({ id: ++s.eventSerial, kind: 'chest', tier: 'rare', x: s.hero!.x, y: s.hero!.y, expiresAt: s.time + 30 })
        engine.advance(0.016)
        expect(engine.ui.specialChoice?.kind).toBe('treasure')
      }
      expect(s.mode).toBe('level')
      for (const at of [6, 10, 30]) {
        context.currentTime = at
        audio.tick('level')
        expect(bossLoop.stoppedAt).toBeNull()
        expect(bgm.volume).toBeCloseTo(0)
      }
      if (kind === 'upgrade') engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
      else if (kind === 'treasure-claim') engine.chooseTreasure(engine.ui.specialChoice!.items[0]!.id)
      else engine.cancelTreasure()
      expect(s.mode).toBe('play')
      // Exercise the gap before the next 4Hz combat intensity update.
      for (let i = 0; i < 8; i++) audio.tick('play')
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      expect(bgm.volume).toBeCloseTo(0)
      expect(bgm.played).toBe(playCalls)
      expect(bgm.pausedCount).toBe(pauseCalls)
      expect(bgm.currentTime).toBe(time)
      expect(bossLoop.stoppedAt).toBeNull()
      expect(context.sources.filter(source => source.loop)).toEqual([bossLoop])
    } finally { audio.dispose() }
  })

  it('does not reset the combat score when closing repeated level choices', () => {
    const { audio, bgm } = setup()
    const intensity = vi.spyOn(audio, 'setCombatIntensity')
    const engine = createEngine({ audio, contentPacks: [] })
    try {
      engine.start()
      const s = engine.state
      s.spawnT = 9999
      s.mobs = Array.from({ length: 20 }, (_, i) => ({
        x: s.hero!.x + 500 + i * 50, y: s.hero!.y, type: 'slime' as const, hp: 1000, max: 1000, r: 18,
        speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
      }))
      s.time = .24
      engine.advance(.033)
      expect(intensity).toHaveBeenLastCalledWith('combat')
      intensity.mockClear()
      for (let i = 0; i < 2; i++) {
        engine.testApi.level()
        expect(s.mode).toBe('level')
        engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
        expect(s.mode).toBe('play')
      }
      expect(intensity).not.toHaveBeenCalled()
      expect(bgm.played).toBe(0)
    } finally { audio.dispose() }
  })

  it.each(['victory', 'defeat'] as const)('starts the real %s result BGM on settlement, independently of SFX and rendering', outcome => {
    const { audio, bgm, context, menu, created } = setup()
    const engine = createEngine({ audio, contentPacks: [] })
    const selectTheme = vi.spyOn(audio, 'setResultTheme')
    const tick = vi.spyOn(audio, 'tick')
    try {
      engine.selectRunMode('standard')
      engine.start()
      audio.setSfxVolume(0)
      const state = engine.state
      state.spawnT = 9999
      state.mobs = []
      state.hero!.attack = 10
      if (outcome === 'victory') {
        state.time = getMode('standard').duration! - 0.01
        state.bossSpawned = true
        state.bossDefeated = true
      } else {
        const hero = state.hero!
        hero.hp = 1
        state.mobs = [{ x: hero.x, y: hero.y, type: 'slime', hp: 30, max: 30, r: 18,
          speed: 0, dmg: 50, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
          ai: { state: 'attack', timer: 0.1, attack: 'pounce', aimX: hero.x, aimY: hero.y, dirX: 0, dirY: 0, cycle: 0 } }]
      }
      context.currentTime = 5
      const before = context.oscillators.length
      engine.advance(0.016)
      expect(engine.ui.mode).toBe('result')
      expect(selectTheme).toHaveBeenCalledWith(outcome)
      expect(tick).toHaveBeenCalledWith('result')
      expect(bgm.paused).toBe(true)
      expect(menu.paused).toBe(true)
      const notes = context.oscillators.slice(before)
      expect(notes.length).toBeGreaterThan(0)
      expect(notes.every(note => context.gains.some(gain => note.targets.includes(gain) && gain.targets.includes(context.gains[1]!)))).toBe(true)
      const pitches = notes.map(note => Math.round(69 + 12 * Math.log2(note.frequency.value / 440)))
      expect(pitches).toContain(outcome === 'victory' ? 72 : 55)

      // A subsequent frame must continue the same score, not restart it.
      const firstNotes = context.oscillators.length
      context.currentTime += 0.5
      audio.tick('result')
      expect(context.oscillators.length).toBeGreaterThan(firstNotes)
      engine.goMenu()
      expect(menu.paused).toBe(false)
      const after = context.oscillators.length
      audio.tick('result')
      expect(context.oscillators).toHaveLength(after)
      expect(created()).toBe(1)
    } finally { audio.dispose() }
  })

  it.each(['suspended', 'interrupted'] as const)('recovers original Boss Rush defeat music and SFX after %s audio', async interruption => {
    const { audio, context, created, bgm } = setup()
    const engine = createEngine({ audio })
    const stop = engine.listen(window)
    try {
      engine.selectRunMode('boss-rush')
      engine.start()
      const state = engine.state
      state.spawnT = 9999
      const hero = state.hero!
      hero.hp = 1
      hero.inv = 0
      hero.attack = 10
      state.mobs = [{ x: hero.x, y: hero.y, type: 'slime', hp: 30, max: 30, r: 18,
        speed: 0, dmg: 50, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
        ai: { state: 'attack', timer: 0.1, attack: 'pounce', aimX: hero.x, aimY: hero.y, dirX: 0, dirY: 0, cycle: 0 } }]
      context.currentTime = 5
      if (interruption === 'interrupted') audio.interrupt()
      else context.state = 'suspended'
      let finish!: () => void
      const resume = vi.fn(() => new Promise<void>(resolve => {
        finish = () => { context.state = 'running'; resolve() }
      }))
      context.resume = resume
      const before = context.oscillators.length
      engine.advance(0.016)
      expect(engine.ui.mode).toBe('result')
      expect(engine.ui.runResult?.mode).toBe('boss-rush')
      expect(engine.ui.runResult?.victory).toBe(false)
      expect(bgm.paused).toBe(true)
      expect(context.oscillators).toHaveLength(before)
      if (interruption === 'interrupted') {
        expect(resume).not.toHaveBeenCalled()
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
      }
      expect(resume).toHaveBeenCalledTimes(1)
      finish()
      await Promise.resolve()
      await Promise.resolve()
      const notes = context.oscillators.slice(before)
      const pitchesOn = (bus: object) => notes.filter(note =>
        context.gains.some(gain => note.targets.includes(gain) && gain.targets.includes(bus)))
        .map(note => Math.round(69 + 12 * Math.log2(note.frequency.value / 440)))
      expect(pitchesOn(context.gains[0]!)).toEqual(SFX_CUES.defeat.map(([pitch]) => pitch))
      expect(pitchesOn(context.gains[1]!)).toContain(55)
      // A later trusted input or frame cannot replay the result fanfare.
      audio.wake()
      audio.tick('result')
      expect(context.oscillators).toHaveLength(before + notes.length)
      expect(created()).toBe(1)
    } finally { stop(); audio.dispose() }
  })

  it('hands cinematic boss and results scoring to the host and restores ES2 combat', () => {
    const { audio, bgm } = setup()
    const engine = createEngine({ audio, contentPacks: [] })
    engine.start()
    expect(bgm.paused).toBe(true)
    engine.state.bossSpawned = true
    engine.state.mobs = [{ x: 500, y: 0, type: 'boss', hp: 100, max: 100, r: 48,
      speed: 0, dmg: 32, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }]
    engine.state.time = 0.24
    engine.advance(0.033)
    expect(bgm.paused).toBe(false)

    engine.state.mobs = []
    engine.state.bossDefeated = true
    engine.state.time = 0.49
    engine.advance(0.033)
    expect(bgm.paused).toBe(true)

    engine.state.time = DURATION - 0.01
    engine.advance(0.033)
    expect(engine.ui.mode).toBe('result')
    expect(bgm.paused).toBe(true)
  })

  it('legacy audio remains independently usable and is not globally silenced', () => {
    const { audio, bgm, menu } = setup()
    audio.wake()
    expect(menu.played).toBe(1)
    audio.onScreen('play')
    expect(bgm.played).toBe(1)
    audio.dispose()
  })

  it('only uses the host music bus and does not create a second audio context on resume', () => {
    const { audio, bgm, menu, context, created } = setup()
    const host = audio as AudioSystem & HostScoreControls
    const port = host.createEs2Port?.()
    expect(port).toBeDefined()
    host.setExternalScoreActive?.(true)
    const adaptive = createEs2AudioAdapter({ audio, ...port! })
    adaptive.wakeFromGesture()
    expect(context.gains).toHaveLength(2)
    adaptive.setScene('combat')
    adaptive.tick('play')
    expect(context.oscillators.length).toBeGreaterThan(0)
    adaptive.interrupt()
    adaptive.resumeFromGesture()
    context.currentTime = 5
    adaptive.tick('play')
    expect(created()).toBe(1)
    expect(bgm.played + menu.played).toBe(0)
  })
})
