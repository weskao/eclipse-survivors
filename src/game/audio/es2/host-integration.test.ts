import { describe, expect, it } from 'vitest'
import { createAudioSystem } from '../engine'
import { SFX_CUES } from '../sfx'
import { FakeAudioContext, FakeBuffer } from '../fakeAudio'
import type { ToneFn } from '../music'
import type { AudioSystem, BgmElement } from '../types'
import { createEs2AudioAdapter } from './adapter'
import { createEngine } from '../../engine'
import { DURATION } from '../../constants'

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
    const engine = createEngine({ audio, contentPacks: [] })
    engine.selectHero(hero)
    engine.selectRunMode('standard')
    engine.start()
    engine.state.mobs = []
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(loaded.size).toBe(3)
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
    ['shadowblade', 'shadowblade-special'],
    ['spirit-summoner', 'spirit-summoner-special'],
    ['crimson-paladin', 'crimson-paladin-special'],
  ] as const)('plays the dedicated %s sound via the shared SFX bus and respects mute', (hero, cue) => {
    const { audio, context, created } = setup()
    const engine = createEngine({ audio, contentPacks: [] })
    engine.selectHero(hero)
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
