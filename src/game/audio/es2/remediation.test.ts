import { describe, expect, it, vi } from 'vitest'
import { createAudioSystem } from '../engine'
import { FakeAudioContext } from '../fakeAudio'
import type { ToneFn } from '../music'
import type { BgmElement } from '../types'
import { createEs2AudioAdapter } from './adapter'

class Media implements BgmElement {
  paused = true
  volume = 0
  currentTime = 0
  play(): Promise<void> { this.paused = false; return Promise.resolve() }
  pause(): void { this.paused = true }
}

function harness(tone?: ToneFn) {
  let time = 0
  let contexts = 0
  const context = new FakeAudioContext()
  const audio = createAudioSystem({
    bgm: new Media(),
    storage: null,
    createContext: () => { contexts++; return context },
  })
  const legacy = vi.spyOn(audio, 'playSfx')
  const options = { audio, now: () => time, isRunning: () => context.state === 'running' }
  const adapter = tone
    ? createEs2AudioAdapter({ ...options, tone })
    : createEs2AudioAdapter(options)
  return { audio, adapter, context, legacy, setTime: (value: number) => {
    time = value
    context.currentTime = value
  }, contexts: () => contexts }
}

describe('ES2 audio remediation regressions', () => {
  it('uses only the injected tone port when an ES2 cue can play', () => {
    const tone = vi.fn<ToneFn>()
    const h = harness(tone)
    h.adapter.wakeFromGesture()
    h.adapter.play('arrow-release')
    expect(tone).toHaveBeenCalled()
    expect(h.legacy).not.toHaveBeenCalled()
    expect(h.contexts()).toBe(1)
    h.adapter.dispose()
    expect(h.context.state).toBe('running')
  })

  it('uses the original valid SFX when the tone port was not supplied', () => {
    const h = harness()
    h.adapter.wakeFromGesture()
    h.adapter.play('rare-loot')
    expect(h.legacy).toHaveBeenCalledExactlyOnceWith('upgrade')
    expect(h.context.oscillators.length).toBeGreaterThan(0)
  })

  it('falls back permanently after a failing tone port without crashing the run', () => {
    const tone = vi.fn<ToneFn>(() => { throw new Error('Audio graph unavailable') })
    const h = harness(tone)
    h.adapter.wakeFromGesture()
    expect(() => h.adapter.play('critical-hit')).not.toThrow()
    expect(h.legacy).toHaveBeenCalledExactlyOnceWith('chain')
    const called = tone.mock.calls.length
    h.setTime(2)
    h.adapter.play('boss-intro')
    expect(tone).toHaveBeenCalledTimes(called)
    expect(h.legacy).toHaveBeenCalledWith('boss')
    expect(h.contexts()).toBe(1)
  })

  it('falls back to the existing score if scheduling a theme throws', () => {
    const tone = vi.fn<ToneFn>(() => { throw new Error('synth unavailable') })
    const h = harness(tone)
    const fallback = vi.spyOn(h.audio, 'tick')
    h.adapter.wakeFromGesture()
    expect(() => h.adapter.tick('menu')).not.toThrow()
    expect(fallback).toHaveBeenCalledExactlyOnceWith('menu')
    const calls = tone.mock.calls.length
    h.setTime(1)
    h.adapter.tick('menu')
    expect(tone).toHaveBeenCalledTimes(calls)
    expect(fallback).toHaveBeenCalledTimes(2)
  })

  it('clears per-cue cooldowns when a new audio clock starts at zero', () => {
    const tone = vi.fn<ToneFn>()
    const h = harness(tone)
    h.adapter.wakeFromGesture()
    h.setTime(100)
    h.adapter.play('boss-intro')
    const before = tone.mock.calls.length
    expect(before).toBeGreaterThan(0)
    h.setTime(0.1)
    h.adapter.play('boss-intro')
    expect(tone.mock.calls.length).toBeGreaterThan(before)
    h.setTime(Number.NaN)
    const count = tone.mock.calls.length
    h.adapter.play('ui-select')
    expect(tone).toHaveBeenCalledTimes(count)
  })

  it('does not emit or catch up notes while the browser context is suspended', () => {
    const tone = vi.fn<ToneFn>()
    const h = harness(tone)
    h.adapter.wakeFromGesture()
    h.adapter.setScene('combat')
    h.adapter.tick('play')
    const before = tone.mock.calls.length
    h.context.state = 'suspended'
    h.setTime(100)
    h.adapter.tick('play')
    h.adapter.play('damage')
    expect(tone).toHaveBeenCalledTimes(before)
    h.adapter.interrupt()
    h.adapter.resumeFromGesture()
    h.context.state = 'running'
    h.adapter.tick('play')
    expect(tone.mock.calls.length).toBeGreaterThan(before)
    expect(h.contexts()).toBe(1)
  })

  it('never revives disposed state or creates a second context during repeat gestures', () => {
    const tone = vi.fn<ToneFn>()
    const h = harness(tone)
    h.adapter.wakeFromGesture()
    h.adapter.wakeFromGesture()
    h.adapter.setScene('boss')
    h.adapter.tick('play')
    h.adapter.dispose()
    const count = tone.mock.calls.length
    h.adapter.resumeFromGesture()
    h.adapter.tick('play')
    h.adapter.play('boss-death')
    expect(tone).toHaveBeenCalledTimes(count)
    expect(h.contexts()).toBe(1)
    expect(h.context.state).toBe('running')
  })
})
