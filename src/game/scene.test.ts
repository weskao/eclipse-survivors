import { BALANCE } from './config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sceneIndexAt, setScene } from './scene'
import { seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameHooks } from './types'

const spyHooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks

beforeEach(() => setRandom(seeded(2)))
afterEach(() => setRandom())

describe('sceneIndexAt', () => {
  it('advances every 36s and clamps to the last scene', () => {
    expect([0, 35.9, 36, 72, 108, 149, 500].map(sceneIndexAt)).toEqual([0, 0, 1, 2, 3, 3, 3])
  })
})

describe('setScene', () => {
  it('announces a scene change with sfx, message, impact and 24 sparks', () => {
    const s = createState()
    s.hero = createHero('knight')
    const hooks = spyHooks()
    setScene(s, 1, true, hooks)
    expect(s.currentScene).toBe(1)
    expect(s.nextEventAt).toBe(BALANCE.events.sceneSpawnDelay)
    expect(s.events).toHaveLength(0)
    expect(hooks.sfx).toHaveBeenCalledWith('scene')
    expect(hooks.message).toHaveBeenCalledWith('✦ 場景轉換：蒼雷聖域 · 暴風雷雨')
    expect(s.impactWaves[0]).toMatchObject({ size: 95, color: '#93c5ff' })
    expect(s.cameraKick).toBe(0)
    expect(s.fx).toHaveLength(24)
    expect(s.fx.every((f) => f.color === '#84caff' && f.type === 'spark')).toBe(true)
  })
  it('ignores an announced change to the current scene, clamps, and is silent without announce', () => {
    const s = createState()
    s.hero = createHero('knight')
    const hooks = spyHooks()
    setScene(s, 0, true, hooks)
    expect(hooks.sfx).not.toHaveBeenCalled()
    setScene(s, 9, false, hooks)
    expect(s.currentScene).toBe(3)
    expect(hooks.sfx).not.toHaveBeenCalled()
    expect(s.fx).toHaveLength(0)
  })
})
