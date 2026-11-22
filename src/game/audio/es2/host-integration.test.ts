import { describe, expect, it } from 'vitest'
import { createAudioSystem } from '../engine'
import { FakeAudioContext } from '../fakeAudio'
import type { ToneFn } from '../music'
import type { AudioSystem, BgmElement } from '../types'
import { createEs2AudioAdapter } from './adapter'
import { createEngine } from '../../engine'

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
