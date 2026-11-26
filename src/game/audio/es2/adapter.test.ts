import { describe, expect, it, vi } from 'vitest'
import { createAudioSystem } from '../engine'
import { FakeAudioContext } from '../fakeAudio'
import type { BgmElement } from '../types'
import { createEs2AudioAdapter } from './adapter'
import { ES2_CUES, CUE_MAP } from './cues'
import type { ToneFn } from '../music'

class Media implements BgmElement {
  paused = true
  volume = 0
  currentTime = 0
  playCalls = 0
  pauseCalls = 0
  play(): Promise<void> { this.playCalls++; this.paused = false; return Promise.resolve() }
  pause(): void { this.pauseCalls++; this.paused = true }
}
class StorageFake {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}
const make = (storage: StorageFake = new StorageFake()) => {
  let clock = 0
  let created = 0
  const context = new FakeAudioContext()
  const bgm = new Media()
  const audio = createAudioSystem({ bgm, storage, createContext: () => { created++; return context } })
  const tone = vi.fn<ToneFn>()
  const director = createEs2AudioAdapter({ audio, now: () => clock, tone, isRunning: () => context.state === 'running' })
  return { director, audio, context, bgm, storage, tone, setClock: (t: number) => { clock = t; context.currentTime = t }, created: () => created }
}

describe('audio integration adapter', () => {
  it('reuses the supplied audio system and never creates a context before a gesture', () => {
    const a = make()
    a.director.setScene('menu')
    a.director.tick('menu')
    a.director.play('ui-select')
    expect(a.created()).toBe(0)
    expect(a.tone).not.toHaveBeenCalled()
    a.director.wakeFromGesture()
    expect(a.created()).toBe(1)
    a.director.tick('menu')
    expect(a.tone).toHaveBeenCalled()
    a.director.wakeFromGesture()
    expect(a.created()).toBe(1)
  })

  it.each(['exploration', 'combat', 'boss'] as const)('continues the %s score on the same timeline during level selection', scene => {
    const actual = make()
    const reference = make()
    for (const a of [actual, reference]) {
      a.director.wakeFromGesture()
      a.director.setScene(scene)
      a.director.tick('play')
    }
    const before = actual.tone.mock.calls.length
    for (const t of [0.25, 0.5, 0.75, 1, 1.25, 1.5]) {
      actual.setClock(t)
      reference.setClock(t)
      actual.director.tick('level')
      reference.director.tick('play')
    }
    expect(actual.director.scene).toBe(scene)
    expect(actual.tone.mock.calls.length).toBeGreaterThan(before)
    expect(actual.tone.mock.calls).toEqual(reference.tone.mock.calls)
  })

  it('suspends on interruption and waits for the next permitted gesture to resume', () => {
    const a = make()
    a.director.wakeFromGesture()
    a.director.setScene('exploration')
    a.director.tick('play')
    a.director.interrupt()
    const count = a.tone.mock.calls.length
    a.director.tick('play')
    a.director.play('critical-hit')
    expect(a.tone.mock.calls).toHaveLength(count)
    expect(a.context.suspendCalls).toBe(1)
    a.director.resumeFromGesture()
    a.setClock(2)
    a.director.tick('play')
    expect(a.tone.mock.calls.length).toBeGreaterThan(count)
    expect(a.created()).toBe(1)
  })

  it('keeps the existing persisted music/sfx volume and toggle keys', () => {
    const storage = new StorageFake()
    const a = make(storage)
    a.director.setMusicVolume(44)
    a.director.setSfxVolume(19)
    a.director.toggleMusic('menu')
    a.director.toggleSfx()
    expect(storage.values.get('eclipseMusicVolume')).toBe('44')
    expect(storage.values.get('eclipseSfxVolume')).toBe('19')
    expect(storage.values.get('starMusic')).toBe('off')
    expect(storage.values.get('starSfx')).toBe('off')
    const second = make(storage)
    expect(second.director.musicVolume).toBe(44)
    expect(second.director.sfxVolume).toBe(19)
    expect(second.director.musicOn).toBe(false)
    expect(second.director.sfxOn).toBe(false)
  })

  it('rejects muted sound, applies cooldowns, and limits simultaneous cue bursts', () => {
    const a = make()
    a.director.wakeFromGesture()
    a.setClock(1)
    a.director.play('sword-attack')
    const first = a.tone.mock.calls.length
    expect(first).toBeGreaterThan(0)
    a.director.play('sword-attack')
    expect(a.tone.mock.calls).toHaveLength(first)
    for (const id of ES2_CUES) a.director.play(id)
    expect(a.tone.mock.calls.length).toBeLessThan(80)
    a.director.setSfxVolume(0)
    const count = a.tone.mock.calls.length
    a.director.play('boss-intro')
    expect(a.tone.mock.calls).toHaveLength(count)
  })

  it('does not schedule into an OS-suspended context or apply the gain twice', () => {
    const a = make()
    a.director.wakeFromGesture()
    a.director.setMusicVolume(50)
    a.director.tick('menu')
    // The existing music bus already applies the 50% user setting.
    expect(a.tone.mock.calls[0]?.[3]).toBeCloseTo(0.044)
    const count = a.tone.mock.calls.length
    a.context.state = 'suspended'
    a.setClock(1)
    a.director.tick('menu')
    a.director.play('critical-hit')
    expect(a.tone.mock.calls).toHaveLength(count)
    a.context.state = 'running'
    a.director.setSfxVolume(50)
    a.director.play('sword-attack')
    expect(a.tone.mock.lastCall?.[3]).toBeCloseTo(0.019)
  })

  it('covers every requested semantic cue with an existing sound fallback', () => {
    expect(ES2_CUES).toHaveLength(19)
    expect(Object.keys(CUE_MAP).sort()).toEqual([...ES2_CUES].sort())
    expect(ES2_CUES.every(id => typeof CUE_MAP[id].legacy === 'string' && CUE_MAP[id].notes.length > 0)).toBe(true)
  })

  it('works without injected tone access and safely disposes without closing shared context', () => {
    const a = make()
    const adapter = createEs2AudioAdapter({ audio: a.audio, now: () => 2 })
    adapter.wakeFromGesture()
    adapter.play('arrow-impact')
    expect(a.context.oscillators.length).toBeGreaterThan(0)
    adapter.dispose()
    adapter.play('boss-intro')
    expect(a.context.state).toBe('running')
    expect(a.created()).toBe(1)
  })
})
