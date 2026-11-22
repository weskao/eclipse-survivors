import { describe, expect, it } from 'vitest'
import { MAX_MOBS } from '../../constants'
import { createState, createHero } from '../../state'
import type { GameState, Mob } from '../../types'
import { createWaveDirector, describeWave, type SpawnRequest } from './index'
import { createWaveEngineAdapter } from './adapter'

function state(time = 0): GameState {
  const s = createState()
  s.mode = 'play'
  s.hero = createHero('knight')
  s.time = time
  s.W = 960
  s.H = 540
  return s
}

function mobOf(request: SpawnRequest): Mob {
  return {
    x: request.x, y: request.y, type: request.type, elite: request.elite,
    hp: 100, max: 100, r: 20, speed: 50, dmg: 10, phase: 0, hit: 0,
    slow: 0, stagger: 0, kx: 0, ky: 0,
  }
}

describe('ES2 deterministic director remediation', () => {
  it('never exceeds the shared 130 actors, including bosses and legacy mobs', () => {
    const director = createWaveDirector({ mode: 'quick', seed: 42 })
    const base = {
      activeMobs: MAX_MOBS, timeSeconds: 92, hero: { x: 0, y: 0 },
      viewport: { width: 960, height: 540 },
    }
    expect(director.advance(base).spawns).toEqual([])
    const boss = director.advance({ ...base, timeSeconds: 93, activeMobs: MAX_MOBS - 1 })
    expect(boss.spawns).toHaveLength(1)
    expect(boss.spawns[0]?.role).toBe('boss')
    expect(director.advance({ ...base, timeSeconds: 94 }).spawns).toEqual([])
  })

  it('does not consume a blocked boss or preempt bosses with normal or mini-boss waves', () => {
    const director = createWaveDirector({ mode: 'quick', seed: 11 })
    const frame = {
      timeSeconds: 92, activeMobs: 5, hero: { x: 0, y: 0 },
      viewport: { width: 960, height: 540 },
      canSpawnAt: () => false,
    }
    expect(director.advance(frame).spawns).toEqual([])
    const next = director.advance({ ...frame, timeSeconds: 93, canSpawnAt: () => true })
    expect(next.spawns.map(s => s.role)).toEqual(['boss'])
    expect(next.events.filter(e => e.kind === 'boss')).toHaveLength(1)
  })

  it('has paced Endless Eclipse and Chaos Arena timelines, with bounded escalation', () => {
    expect(describeWave('endless-eclipse', 42, 36000).danger)
      .toBeGreaterThan(describeWave('endless-eclipse', 42, 60).danger)
    expect(describeWave('endless-eclipse', 42, 36000).spawnBudget).toBeLessThanOrEqual(10)
    expect(describeWave('chaos-arena', 42, 15).stage).toBe('assault')
    expect(describeWave('chaos-arena', 42, 32).stage).toBe('recovery')
  })

  it('only clears each of eight ordered Chaos waves after genuine registered enemy deaths', () => {
    const cleared: number[] = []
    const events: string[] = []
    const adapter = createWaveEngineAdapter({
      mode: 'chaos-arena', seed: 45,
      spawn(s, request) {
        const mob = mobOf(request)
        s.mobs.push(mob)
        return mob
      },
      onWaveCleared: index => cleared.push(index),
      onEvent: event => events.push(event.kind),
    })
    const s = state()
    const readiness = [15, 33, 51, 69, 87, 105, 123, 141]
    for (let i = 0; i < readiness.length; i++) {
      s.time = readiness[i]!
      const decision = adapter.advance(s)
      const waveMobs = decision?.spawns.filter(x => x.waveIndex === i + 1) ?? []
      expect(waveMobs.length).toBeGreaterThan(0)
      expect(adapter.clearedWaves).toBe(i)
      expect(adapter.advance(s)?.spawns).toEqual([])
      expect(adapter.killed(s.mobs[0]!)).toBe(false) // still alive: no synthetic clear
      for (const mob of s.mobs) {
        mob.hp = 0
        expect(adapter.killed(mob)).toBe(true)
        expect(adapter.killed(mob)).toBe(false)
      }
      s.mobs.length = 0
      expect(adapter.clearedWaves).toBe(i + 1)
    }
    expect(cleared).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(events.filter(e => e === 'wave')).toHaveLength(8)
    s.time = 170
    expect(adapter.advance(s)?.spawns.some(x => x.role === 'boss')).toBe(true)
    s.time = 171
    expect(adapter.advance(s)?.spawns.some(x => x.role === 'boss')).toBe(false)
  })

  it('blocks Chaos final boss before eight evidenced clears', () => {
    const director = createWaveDirector({ mode: 'chaos-arena', seed: 5 })
    const first = director.advance({
      timeSeconds: 170, activeMobs: 0, hero: { x: 0, y: 0 },
      viewport: { width: 960, height: 540 }, completedWaves: 0,
    })
    expect(first.spawns.every(s => s.role !== 'boss')).toBe(true)
  })

  it('requires successful actual spawns; on rejection retry an unstarted wave or boss', () => {
    let allowed = false
    const adapter = createWaveEngineAdapter({
      mode: 'chaos-arena', seed: 3,
      spawn(s, request) {
        if (!allowed) return null
        const mob = mobOf(request)
        s.mobs.push(mob)
        return mob
      },
    })
    const s = state(15)
    expect(adapter.advance(s)?.spawns).toEqual([])
    allowed = true
    s.time = 16
    expect(adapter.advance(s)?.spawns.length).toBeGreaterThan(0)
    expect(adapter.clearedWaves).toBe(0)
  })

  it('halts on pause/invalid inputs, resets cleanly, and replays the same seeded spawns', () => {
    const produced: SpawnRequest[][] = []
    const adapter = createWaveEngineAdapter({
      mode: 'endless-eclipse', seed: 123,
      spawn(s, req) {
        const mob = mobOf(req)
        s.mobs.push(mob)
        return mob
      },
    })
    const s = state(14)
    produced.push([...(adapter.advance(s)?.spawns ?? [])])
    s.mode = 'paused'
    s.time = 20
    expect(adapter.advance(s)).toBeNull()
    s.mode = 'play'
    adapter.reset()
    s.mobs.length = 0
    s.time = 14
    produced.push([...(adapter.advance(s)?.spawns ?? [])])
    expect(produced[1]).toEqual(produced[0])
    expect(() => createWaveDirector({ mode: 'quick', seed: NaN })).toThrow()
    expect(() => createWaveDirector({ mode: 'quick', seed: 0 }).advance({
      timeSeconds: 0, activeMobs: -1, hero: { x: 0, y: 0 },
      viewport: { width: 1, height: 1 },
    })).toThrow()
  })

  it('handles five scheduled boss stages only after real boss defeats', () => {
    const adapter = createWaveEngineAdapter({
      mode: 'boss-rush', seed: 7,
      spawn(s, request) {
        const mob = mobOf(request)
        s.mobs.push(mob)
        return mob
      },
    })
    const s = state(25)
    const first = adapter.advance(s)?.spawns.filter(m => m.role === 'boss') ?? []
    expect(first).toHaveLength(1)
    s.time = 70
    expect(adapter.advance(s)?.spawns.some(m => m.role === 'boss')).toBe(false)
    s.mobs[0]!.hp = 0
    expect(adapter.killed(s.mobs[0]!)).toBe(true)
    s.mobs = []
    expect(adapter.advance(s)?.spawns.some(m => m.role === 'boss')).toBe(true)
  })
})


it('gates Relic Hunt guardian until all four real relics are collected', () => {
  const director = createWaveDirector({ mode: 'relic-hunt', seed: 19 })
  const base = {
    timeSeconds: 220, activeMobs: 0, hero: { x: 0, y: 0 },
    viewport: { width: 960, height: 540 },
  }
  expect(director.advance({ ...base, completedRelics: 3 }).spawns.some(m => m.role === 'boss')).toBe(false)
  expect(director.advance({ ...base, timeSeconds: 221, completedRelics: 4 })
    .spawns.filter(m => m.role === 'boss')).toHaveLength(1)
})

it('can retry a legitimately rejected boss without announcing a ghost encounter', () => {
  let allowed = false
  const events: string[] = []
  const adapter = createWaveEngineAdapter({
    mode: 'quick', seed: 77,
    spawn(s, req) {
      if (!allowed) return null
      const mob = mobOf(req)
      s.mobs.push(mob)
      return mob
    },
    onEvent: event => events.push(event.kind),
  })
  const s = state(92)
  expect(adapter.advance(s)?.spawns).toEqual([])
  expect(events).not.toContain('boss')
  allowed = true
  s.time = 93
  expect(adapter.advance(s)?.spawns.filter(m => m.role === 'boss')).toHaveLength(1)
  expect(events.filter(e => e === 'boss')).toHaveLength(1)
})

it('rejects invalid progress, non-actor callbacks and malformed kill evidence', () => {
  const d = createWaveDirector({ mode: 'chaos-arena', seed: 1 })
  expect(() => d.advance({
    timeSeconds: 15, activeMobs: 0, completedWaves: 9, hero: { x: 0, y: 0 },
    viewport: { width: 960, height: 540 },
  })).toThrow(RangeError)
  const adapter = createWaveEngineAdapter({
    mode: 'chaos-arena', seed: 1,
    spawn(_state, req) { return mobOf(req) }, // actor was never actually inserted
  })
  expect(() => adapter.advance(state(15))).toThrow()
})


it('prioritizes a due boss even after a huge timestamp skip without conflicting wave announcements', () => {
  const director = createWaveDirector({ mode: 'quick', seed: 9 })
  director.advance({ timeSeconds: 0, activeMobs: 0, hero: { x: 0, y: 0 },
    viewport: { width: 960, height: 540 } })
  const result = director.advance({ timeSeconds: 300, activeMobs: 0, hero: { x: 0, y: 0 },
    viewport: { width: 960, height: 540 } })
  expect(result.spawns.map(s => s.role)).toEqual(['boss'])
  expect(result.events.map(e => e.kind)).toEqual(['boss'])
})
