import { describe, expect, it } from 'vitest'
import { createContentRegistry } from '../registry'
import { MAX_MOBS } from '../../constants'
import { WAVES_PACK } from '../packs/waves'
import { createWaveDirector, describeWave } from './index'

const area = { hero: { x: 100, y: -80 }, viewport: { width: 960, height: 540 } }
const frame = (timeSeconds: number, activeMobs = 0) => ({ ...area, timeSeconds, activeMobs })

describe('wave content registration', () => {
  it('is an independently registered metadata-only pack', () => {
    const registry = createContentRegistry([WAVES_PACK])
    expect(registry.packs[0]?.id).toBe('waves')
    expect(registry.packs[0]?.worldEvents?.map(e => e.id)).toContain('waves:boss-prep')
    expect(registry.abilities).toEqual([])
    expect(registry.packs[0]?.onEvent).toBeUndefined()
  })
})

describe('deterministic wave timeline', () => {
  it('uses exact half-open cycle boundaries and boss windows', () => {
    const at = (t: number) => describeWave('quick', 2, t).stage
    expect([at(0), at(13.999), at(14), at(34), at(40), at(48)])
      .toEqual(['build-up', 'build-up', 'assault', 'reward', 'recovery', 'build-up'])
    expect(at(79.999)).not.toBe('boss-prep')
    expect(at(80)).toBe('boss-prep')
    expect(at(91.999)).toBe('boss-prep')
    expect(at(92)).toBe('boss')
    expect(describeWave('standard', 2, 288).stage).toBe('boss-prep')
    expect(describeWave('challenge', 2, 118).stage).toBe('boss-prep')
    expect(describeWave('endless', 2, 168).stage).toBe('boss-prep')
  })

  it('varies deterministic assault patterns with seed and cycle, not global RNG', () => {
    const first = [0, 1, 2, 3, 4, 5].map(i => describeWave('quick', 1, 14 + i * 48).pattern)
    const again = [0, 1, 2, 3, 4, 5].map(i => describeWave('quick', 1, 14 + i * 48).pattern)
    const other = [0, 1, 2, 3, 4, 5].map(i => describeWave('quick', 2, 14 + i * 48).pattern)
    expect(first).toEqual(again)
    expect(new Set(first).size).toBe(3)
    expect(other).not.toEqual(first)
  })

  it('escalates challenge and endless pressure without increasing the entity cap', () => {
    const quick = describeWave('quick', 1, 14)
    const challenge = describeWave('challenge', 1, 14)
    expect(challenge.danger).toBeGreaterThan(quick.danger)
    expect(challenge.spawnBudget).toBeGreaterThan(quick.spawnBudget)
    const earlier = describeWave('endless', 1, 600)
    const later = describeWave('endless', 1, 7200)
    expect(later.danger).toBeGreaterThan(earlier.danger)
    expect(later.spawnBudget).toBeLessThanOrEqual(10)
  })
})

describe('director scheduling and budgets', () => {
  it('announces stage changes only once and creates no same-slot duplicate spawns', () => {
    const director = createWaveDirector({ mode: 'quick', seed: 17 })
    const start = director.advance(frame(0))
    expect(start.events.map(e => e.kind)).toContain('stage')
    expect(start.spawns.length).toBeGreaterThan(0)
    expect(director.advance(frame(0)).spawns).toEqual([])
    expect(director.advance(frame(0)).events).toEqual([])
    expect(director.advance(frame(14)).stage).toBe('assault')
    expect(director.advance(frame(34)).events.map(e => e.kind)).toContain('reward')
    expect(director.advance(frame(40)).stage).toBe('recovery')
    expect(director.advance(frame(40)).spawns).toEqual([])
  })

  it('respects shared normal and boss slots without exceeding 130 actors', () => {
    const director = createWaveDirector({ mode: 'quick', seed: 13 })
    expect(director.advance(frame(14, MAX_MOBS - 1)).spawns.length).toBeLessThanOrEqual(1)
    expect(director.advance(frame(17, MAX_MOBS)).spawns).toEqual([])
    const boss = director.advance(frame(92, MAX_MOBS))
    expect(boss.spawns.filter(s => s.role === 'boss')).toHaveLength(0)
    expect(director.advance(frame(93, MAX_MOBS - 1)).spawns.filter(s => s.role === 'boss')).toHaveLength(1)
    expect(director.advance(frame(94, MAX_MOBS)).events.filter(e => e.kind === 'boss')).toEqual([])
  })

  it('preserves legacy boss times even across large skipped timesteps', () => {
    for (const mode of ['quick', 'standard', 'endless', 'challenge'] as const) {
      const director = createWaveDirector({ mode, seed: 13 })
      const at = { quick: 92, standard: 300, endless: 180, challenge: 130 }[mode]
      director.advance(frame(0))
      const boss = director.advance(frame(at + 0.25))
      expect(boss.events.some(e => e.kind === 'boss')).toBe(true)
      expect(boss.spawns.filter(s => s.role === 'boss')).toHaveLength(1)
      expect(director.advance(frame(at + 1)).spawns.filter(s => s.role === 'boss')).toEqual([])
    }
  })

  it('schedules mini-bosses outside boss preparation and avoids missed-interval floods', () => {
    const director = createWaveDirector({ mode: 'quick', seed: 8 })
    director.advance(frame(59))
    const wave = director.advance(frame(60))
    expect(wave.events.some(e => e.kind === 'mini-boss')).toBe(true)
    expect(wave.spawns.some(e => e.role === 'mini-boss' && e.type === 'golem' && e.elite)).toBe(true)
    expect(director.advance(frame(61)).events.filter(e => e.kind === 'mini-boss')).toEqual([])
    const skipped = director.advance(frame(3600))
    expect(skipped.spawns.length).toBeLessThanOrEqual(10)
    expect(skipped.events.length).toBeLessThanOrEqual(3)
    expect(skipped.events.some(e => e.kind === 'mini-boss')).toBe(false)
  })

  it('keeps all spawn coordinates outside view and respects collision veto without unsafe fallback', () => {
    const director = createWaveDirector({ mode: 'challenge', seed: 21 })
    const wave = director.advance(frame(14))
    expect(wave.spawns.length).toBeGreaterThan(0)
    for (const spawn of wave.spawns) {
      const dx = spawn.x - area.hero.x
      const dy = spawn.y - area.hero.y
      expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(270 * 270)
      expect(Math.abs(dx) > area.viewport.width / 2 + 32 || Math.abs(dy) > area.viewport.height / 2 + 32).toBe(true)
      expect(spawn.telegraphSeconds).toBeGreaterThanOrEqual(1)
    }
    const blocked = createWaveDirector({ mode: 'challenge', seed: 21 })
    expect(blocked.advance({ ...frame(14), canSpawnAt: () => false }).spawns).toEqual([])
  })

  it('uses bounded ranged, elite and swarm compositions rather than HP-only scaling', () => {
    const patterns = new Set<string>()
    for (let cycle = 0; cycle < 9; cycle++) {
      const director = createWaveDirector({ mode: 'endless', seed: 3 })
      const time = cycle * 48 + 14
      // Isolate ordinary wave composition: the required timed boss has its own scheduling tests.
      const wave = director.advance({ ...frame(time), bossSpawned: time >= 180 })
      patterns.add(wave.pattern)
      // Mini-bosses are separate encounters; assess ordinary wave composition independently.
      const ordinary = wave.spawns.filter(spawn => spawn.role === 'normal')
      expect(ordinary.length).toBeGreaterThan(0)
      if (wave.pattern === 'ranged') expect(ordinary.some(s => s.type === 'warlock')).toBe(true)
      if (wave.pattern === 'elite') expect(ordinary.some(s => s.elite)).toBe(true)
      if (wave.pattern === 'swarm') expect(ordinary.every(s => ['slime', 'bat', 'goblin'].includes(s.type))).toBe(true)
    }
    expect(patterns).toEqual(new Set(['swarm', 'elite', 'ranged']))
  })

  it('is repeatable across restarts with the same seed and isolated per run', () => {
    const director = createWaveDirector({ mode: 'endless', seed: 42 })
    const first = [0, 14, 34, 60, 80, 180, 900, 7200].map(t => director.advance(frame(t)))
    director.reset()
    const second = [0, 14, 34, 60, 80, 180, 900, 7200].map(t => director.advance(frame(t)))
    expect(second).toEqual(first)
    expect(createWaveDirector({ mode: 'endless', seed: 42 }).advance(frame(14))).toEqual(
      createWaveDirector({ mode: 'endless', seed: 42 }).advance(frame(14)),
    )
  })

  it('rejects nonfinite, negative and regressing time instead of corrupting the schedule', () => {
    const director = createWaveDirector({ mode: 'quick', seed: 3 })
    expect(() => director.advance(frame(Number.NaN))).toThrow()
    expect(() => director.advance(frame(-1))).toThrow()
    director.advance(frame(10))
    expect(() => director.advance(frame(9))).toThrow()
  })

  it('handles long Endless sessions without accumulating schedules or exceeding budgets', () => {
    const director = createWaveDirector({ mode: 'endless', seed: 6 })
    for (let hour = 0; hour <= 24; hour++) {
      const wave = director.advance(frame(hour * 3600, MAX_MOBS - 4))
      expect(wave.spawns.length).toBeLessThanOrEqual(4)
      expect(wave.spawnBudget).toBeLessThanOrEqual(10)
      expect(wave.events.length).toBeLessThanOrEqual(3)
      expect(wave.danger).toBeGreaterThanOrEqual(1)
    }
  })
})

it('does not announce or consume a blocked boss; retries when safe and never exceeds its reserved slot', () => {
  const director = createWaveDirector({ mode: 'quick', seed: 9 })
  director.advance(frame(79))
  const blocked = director.advance({ ...frame(92, MAX_MOBS), canSpawnAt: () => false })
  expect(blocked.events.some(e => e.kind === 'boss')).toBe(false)
  expect(blocked.spawns).toEqual([])
  const accepted = director.advance(frame(92.5, MAX_MOBS - 1))
  expect(accepted.spawns.filter(s => s.role === 'boss')).toHaveLength(1)
  expect(accepted.events.filter(e => e.kind === 'boss')).toHaveLength(1)
  expect(director.advance(frame(93, MAX_MOBS)).events.filter(e => e.kind === 'boss')).toEqual([])
  const overfull = createWaveDirector({ mode: 'quick', seed: 9 })
  expect(overfull.advance(frame(92, MAX_MOBS + 1)).spawns).toEqual([])
})

it('does not schedule a second boss when the legacy state says one already spawned', () => {
  const director = createWaveDirector({ mode: 'standard', seed: 14 })
  expect(director.advance({ ...frame(300), bossSpawned: true }).spawns).toEqual([])
  expect(director.advance(frame(301)).spawns.filter(s => s.role === 'boss')).toEqual([])
})

it('keeps ultra-wide viewport spawns within the legacy 1700-unit mob culling boundary', () => {
  const director = createWaveDirector({ mode: 'challenge', seed: 21 })
  const huge = director.advance({
    timeSeconds: 14, activeMobs: 0, hero: { x: 0, y: 0 },
    viewport: { width: 4000, height: 2400 },
  })
  expect(huge.spawns.length).toBeGreaterThan(0)
  for (const mob of huge.spawns) {
    expect(mob.x * mob.x + mob.y * mob.y).toBeLessThan(1700 * 1700)
    expect(mob.telegraphSeconds).toBeGreaterThan(1)
  }
})
