import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneBonus, spawnInterval, spawnMob, tickSpawning } from './spawn'
import { createFactionBridge } from './content/enemies/integration'
import { summonBossMinions } from './bosses/phases'
import { MAX_MOBS } from './constants'
import { dist, seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameHooks, GameState } from './types'

const spyHooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks

function setup(): GameState {
  const s = createState()
  s.hero = createHero('knight')
  s.mode = 'play'
  s.W = 800
  s.H = 600
  return s
}

afterEach(() => setRandom())

describe('spawnMob', () => {
  it.each([
    [0.1, { type: 'slime', hp: 41, r: 18, speed: 80, dmg: 13 }],
    [0.5, { type: 'bat', hp: 36, r: 18, speed: 111, dmg: 13 }],
    [0.6, { type: 'goblin', hp: 64, r: 20, speed: 72, dmg: 13 }],
    [0.9, { type: 'golem', hp: 164, r: 30, speed: 50, dmg: 13 }],
  ])('random %s at level 1 spawns %o', (v, expected) => {
    setRandom(() => v)
    const s = setup()
    s.time = 22
    spawnMob(s)
    expect(s.mobs[0]).toMatchObject({ ...expected, max: expected.hp, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 })
  })
  it('places mobs on a ring of max(200, min(W,H)*.38)+[15,65] around the hero', () => {
    setRandom(() => 0.5)
    const s = setup()
    s.hero!.x = 100
    spawnMob(s)
    const m = s.mobs[0]!
    expect(dist(m.x - 100, m.y)).toBeCloseTo(228 + 40)
  })
  it('spawns a boss with 2000 + lvl*120 hp', () => {
    setRandom(seeded(3))
    const s = setup()
    s.time = 44
    spawnMob(s, 'boss')
    expect(s.mobs[0]).toMatchObject({ type: 'boss', hp: 2240, max: 2240, r: 48, speed: 51, dmg: 32 })
  })
  it('respects MAX_MOBS', () => {
    setRandom(seeded(4))
    const s = setup()
    for (let i = 0; i < MAX_MOBS + 10; i++) spawnMob(s)
    expect(s.mobs).toHaveLength(130)
  })
})

describe('spawnInterval', () => {
  it('shrinks with time and scene bonus, floored at .18', () => {
    expect([0, 1, 2, 3].map(sceneBonus)).toEqual([0, 0.05, 0, 0.08])
    expect(spawnInterval(0, 0)).toBeCloseTo(0.75)
    expect(spawnInterval(100, 0)).toBeCloseTo(0.45)
    expect(spawnInterval(100, 1)).toBeCloseTo(0.4)
    expect(spawnInterval(100, 3)).toBeCloseTo(0.37)
    expect(spawnInterval(300, 0)).toBe(0.18)
  })
})

describe('tickSpawning', () => {
  it('spawns when the timer runs out and resets it', () => {
    setRandom(seeded(5))
    const s = setup()
    tickSpawning(s, 0.016, spyHooks())
    expect(s.mobs).toHaveLength(1)
    expect(s.spawnT).toBeCloseTo(0.75)
    tickSpawning(s, 0.016, spyHooks())
    expect(s.mobs).toHaveLength(1)
    expect(s.spawnT).toBeCloseTo(0.734)
  })
  it('spawns the boss once after 92s with sfx and warning', () => {
    setRandom(seeded(6))
    const s = setup()
    s.spawnT = 99
    s.time = 92
    const hooks = spyHooks()
    tickSpawning(s, 0.016, hooks)
    expect(s.bossSpawned).toBe(false)
    s.time = 92.01
    tickSpawning(s, 0.016, hooks)
    tickSpawning(s, 0.016, hooks)
    expect(s.mobs.filter((m) => m.type === 'boss')).toHaveLength(1)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
    expect(hooks.sfx).toHaveBeenCalledWith('boss')
    expect(hooks.message).toHaveBeenCalledWith('⚠ 魔王降臨！')
  })
})

describe('boss-cap regression', () => {
  it('still spawns the required boss when the ordinary mob cap is full', () => {
    const s = setup()
    s.spawnT = 999
    s.time = 93
    for (let i = 0; i < MAX_MOBS; i++) spawnMob(s)
    const hooks = spyHooks()
    tickSpawning(s, 0.016, hooks)
    expect(s.bossSpawned).toBe(true)
    expect(s.mobs.filter(m => m.type === 'boss')).toHaveLength(1)
    expect(hooks.message).toHaveBeenCalledWith('⚠ 魔王降臨！')
  })
})

describe('ES3 live encounter pacing', () => {
  it('intensifies ordinary assault spawns and eases the reward phase without changing the underlying spawn curve', () => {
    const s = setup()
    setRandom(seeded(12))
    s.time = 20
    tickSpawning(s, 0.016, spyHooks())
    expect(s.spawnT).toBeLessThan(spawnInterval(s.time, s.currentScene))
    s.time = 35; s.spawnT = 0
    tickSpawning(s, 0.016, spyHooks())
    expect(s.spawnT).toBeGreaterThan(spawnInterval(s.time, s.currentScene))
    s.time = 42; s.spawnT = 0
    const count = s.mobs.length
    tickSpawning(s, 0.016, spyHooks())
    expect(s.mobs).toHaveLength(count)
  })
})

describe('ES3 ordinary encounter composition reaches live spawning', () => {
  it('actually spawns lightweight swarm foes and later elite heavy foes instead of using random legacy composition', () => {
    const s = setup()
    s.runMode = 'endless'
    s.bossSpawned = true
    setRandom(() => 0.99)
    s.time = 20
    tickSpawning(s, 0.016, spyHooks())
    expect(s.mobs.length).toBeGreaterThan(0)
    expect(s.mobs.every(mob => mob.type === 'slime' || mob.type === 'bat')).toBe(true)
    s.mobs = []; s.spawnT = 0; s.time = 110
    tickSpawning(s, 0.016, spyHooks())
    expect(s.mobs.some(mob => mob.elite && mob.type === 'golem')).toBe(true)
  })
})

describe('ES3 single live ordinary spawn owner', () => {
  it('only schedules faction reinforcements from a spawn pulse, never during recovery or beyond the shared cap', () => {
    const s = setup(), bridge = createFactionBridge({ random: seeded(9) })
    setRandom(seeded(8))
    s.time = 8.1; s.spawnT = 1
    tickSpawning(s, .016, spyHooks(), undefined, 0, bridge)
    expect(bridge.runtime.enemies).toHaveLength(0)
    s.spawnT = 0
    tickSpawning(s, .016, spyHooks(), undefined, 0, bridge)
    expect(bridge.runtime.enemies).toHaveLength(1)
    s.time = 42; s.spawnT = 0
    tickSpawning(s, .016, spyHooks(), undefined, 1, bridge)
    expect(bridge.runtime.enemies).toHaveLength(1)
    s.time = 49; s.spawnT = 0
    while (s.mobs.length < MAX_MOBS - 1) spawnMob(s, undefined, 1)
    tickSpawning(s, .016, spyHooks(), undefined, 1, bridge)
    expect(s.mobs.length + bridge.runtime.enemies.length).toBe(MAX_MOBS)
  })
})

it('reserves the shared actor budget for boss summons including faction actors', () => {
  const s = setup(); spawnMob(s, 'boss')
  const boss = s.mobs[0]!
  summonBossMinions(s, boss, MAX_MOBS - 1)
  expect(s.mobs).toHaveLength(1)
})

it('drives all seven assault compositions and recovery through the production spawn pulse', () => {
  for (let cycle = 0; cycle < 7; cycle++) {
    const s = setup(); s.runMode = 'endless'; s.bossSpawned = true; s.time = cycle * 48 + 20
    setRandom(seeded(42 + cycle))
    for (let i = 0; i < 8; i++) { s.spawnT = 0; tickSpawning(s, .016, spyHooks()); s.time += .2 }
    const expected = [['slime','bat'],['goblin'],['golem','goblin'],['slime','warlock'],['golem'],['goblin'],['goblin','warlock']][cycle]!
    expect(s.mobs.length).toBeGreaterThan(0)
    expect(s.mobs.every(m => expected.includes(m.type))).toBe(true)
    if (cycle === 5) expect(s.mobs.every(m => m.rewardXpMultiplier === 1.5)).toBe(true)
  }
  const s = setup(); s.runMode = 'endless'; s.time = 42; s.spawnT = 0; tickSpawning(s,.016,spyHooks()); expect(s.mobs).toHaveLength(0)
})
