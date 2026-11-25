import { describe, expect, it } from 'vitest'
import { step } from '../../step'
import { createHero, createState } from '../../state'
import type { GameHooks, GameState, Mob, Shot } from '../../types'
import { ENEMY_DEFINITIONS, ELITE_AFFIXES } from './definitions'
import { createFactionBridge } from './integration'

const hooks: GameHooks = {
  sfx() {}, message() {}, offerUpgrades() {}, end() {},
}
function game(): GameState {
  const state = createState()
  state.mode = 'play'
  state.hero = createHero('knight')
  state.W = 960; state.H = 640
  return state
}
function frames(bridge: ReturnType<typeof createFactionBridge>, state: GameState, count: number): void {
  for (let i = 0; i < count; i++) bridge.tick(state, 0.05, hooks)
}

describe('faction runtime integration boundary', () => {
  it('supports all ten archetypes without impersonating legacy mobs', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0.2, lineOfSight: () => true })
    for (const [index, kind] of Object.keys(ENEMY_DEFINITIONS).entries())
      expect(bridge.spawn(s, kind as keyof typeof ENEMY_DEFINITIONS, 250, index * 3)).not.toBeNull()
    expect(bridge.runtime.enemies).toHaveLength(10)
    expect(s.mobs).toHaveLength(0)
    frames(bridge, s, 35)
    expect(bridge.runtime.enemies.every(enemy => Number.isFinite(enemy.x) && Number.isFinite(enemy.y))).toBe(true)
    expect(bridge.runtime.projectiles.length).toBeLessThanOrEqual(100)
    expect(bridge.runtime.zones.length).toBeLessThanOrEqual(64)
  })

  it('uses only injected RNG to select archetypes and elite affixes', () => {
    const s = game()
    const rolls = [0, 0, 0.99, 0.99]
    const bridge = createFactionBridge({ random: () => rolls.shift() ?? 0 })
    expect(bridge.spawnRandom(s, 100, 0, true)?.kind).toBe(Object.keys(ENEMY_DEFINITIONS)[0])
    expect(bridge.runtime.enemies[0]?.affix).toBe(ELITE_AFFIXES[0])
    expect(bridge.spawnRandom(s, 200, 0, true)?.kind).toBe(Object.keys(ENEMY_DEFINITIONS).at(-1))
    expect(bridge.runtime.enemies[1]?.affix).toBe(ELITE_AFFIXES.at(-1))
    expect(ELITE_AFFIXES).toHaveLength(6)
    expect(bridge.chooseKind()).toBe(Object.keys(ENEMY_DEFINITIONS)[0])
  })

  it('shares the 130-actor cap with living legacy monsters at the boundary', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0 })
    s.mobs = Array.from({ length: 125 }, () => ({ hp: 1 } as Mob))
    expect(bridge.availableSpawnSlots(s)).toBe(5)
    for (let i = 0; i < 20; i++) bridge.spawn(s, 'berserker', 180, i)
    expect(bridge.runtime.enemies).toHaveLength(5)
    expect(bridge.availableSpawnSlots(s)).toBe(0)
    expect(bridge.spawn(s, 'phantom', 200, 0)).toBeNull()
    s.mobs[0]!.hp = 0
    expect(bridge.spawn(s, 'phantom', 200, 0)).not.toBeNull()
  })

  it('blocks wall-hidden ranged attacks until line of sight opens', () => {
    const s = game()
    let visible = false
    const bridge = createFactionBridge({ random: () => 0, lineOfSight: () => visible })
    const e = bridge.spawn(s, 'dark-archer', 215, 0)!
    e.speed = 0
    frames(bridge, s, 80)
    expect(bridge.runtime.projectiles).toHaveLength(0)
    visible = true
    frames(bridge, s, 23)
    expect(bridge.runtime.projectiles.length).toBeGreaterThan(0)
  })

  it('resolves swept shots against the nearest legacy or faction actor exactly once', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0 })
    const e = bridge.spawn(s, 'shield-guardian', 120, 0)!
    const blocker = { x: 55, y: 0, r: 16, hp: 20 } as Mob
    s.mobs.push(blocker)
    const shot: Shot = { x: 170, y: 0, prevX: -20, prevY: 0, vx: 0, vy: 0, d: 12, r: 5, life: 1, kind: 'arrow' }
    expect(bridge.shotContact(s, shot)?.kind).toBe('legacy')
    blocker.hp = 0
    expect(bridge.shotContact(s, shot)).toMatchObject({ kind: 'faction', target: e })
    const hp = e.hp
    expect(bridge.resolveShot(s, shot, hooks, { x: -20, y: 0 })?.kind).toBe('faction')
    expect(e.hp).toBeLessThan(hp)
    expect(shot.life).toBe(0)
    expect(bridge.resolveShot(s, shot, hooks, { x: -20, y: 0 })).toBeNull()
  })

  it('uses launch origin for frontal shield mitigation and selects targets across both pools', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0 })
    const front = bridge.spawn(s, 'shield-guardian', 150, 0)!
    const back = bridge.spawn(s, 'shield-guardian', 250, 0)!
    front.facingX = back.facingX = 1
    front.facingY = back.facingY = 0
    const reduced = bridge.hitFaction(s, front, 40, 350, 0, hooks)
    const full = bridge.hitFaction(s, back, 40, 50, 0, hooks)
    expect(reduced).toBeLessThan(full)
    expect(bridge.nearestTarget(s, 150, 0, 50)).toMatchObject({ kind: 'faction', target: front })
    expect(bridge.factionsInRadius(150, 0, 0)).toContain(front)
  })

  it('does not damage phased targets or apply status through damage immunity', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0, lineOfSight: () => true })
    const phantom = bridge.spawn(s, 'phantom', 100, 0)!
    bridge.tick(s, 0.05, hooks)
    expect(phantom.state).toBe('phase')
    expect(bridge.hitFaction(s, phantom, 50, 0, 0, hooks)).toBe(0)
    s.hero!.inv = 5
    bridge.runtime.projectiles.push({ x: 0, y: 0, vx: 0, vy: 0, radius: 7, damage: 10,
      life: 1, sourceId: 99, kind: 'frost-wraith', status: 'freeze' })
    bridge.tick(s, 0.05, hooks)
    expect(bridge.statuses.freeze).toBeUndefined()
    expect(bridge.movementMultiplier).toBe(1)
  })

  it('expires status effects and never permanently changes hero movement stats', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0, lineOfSight: () => true })
    const originalSpeed = s.hero!.speed
    bridge.runtime.projectiles.push({ x: 0, y: 0, vx: 0, vy: 0, radius: 7, damage: 10,
      life: 1, sourceId: 99, kind: 'frost-wraith', status: 'freeze' })
    bridge.tick(s, 0.05, hooks)
    expect(bridge.movementMultiplier).toBeLessThan(1)
    expect(s.hero!.speed).toBe(originalSpeed)
    frames(bridge, s, 30)
    expect(bridge.statuses.freeze).toBeUndefined()
    expect(bridge.movementMultiplier).toBe(1)
  })

  it('awards exactly-once kill credit and collectible XP, including elite rewards', () => {
    const s = game(), rewards: number[] = []
    const bridge = createFactionBridge({ random: () => 0, onReward: r => rewards.push(r.xp) })
    const e = bridge.spawn(s, 'fire-imp', 30, 0, { affix: 'armored' })!
    expect(bridge.hitFaction(s, e, 9999, -30, 0, hooks)).toBeGreaterThan(0)
    expect(bridge.hitFaction(s, e, 20, -30, 0, hooks)).toBe(0)
    expect(s.kill).toBe(1)
    expect(s.stars).toHaveLength(1)
    expect(rewards).toEqual([s.stars[0]?.value])
    expect(bridge.defeated['fire-imp']).toBe(1)
    bridge.tick(s, 0.05, hooks)
    expect(bridge.runtime.enemies).toHaveLength(0)
  })

  it('freezes AI and hazards on pause and discards per-run data on reset', () => {
    const s = game(), bridge = createFactionBridge({ random: () => 0 })
    bridge.spawn(s, 'necromancer', 180, 0)
    bridge.runtime.projectiles.push({ x: 50, y: 0, vx: -100, vy: 0, radius: 7, damage: 8,
      life: 1, sourceId: 1, kind: 'dark-archer', status: undefined })
    s.mode = 'paused'
    const before = JSON.stringify(bridge.runtime)
    frames(bridge, s, 100)
    expect(JSON.stringify(bridge.runtime)).toBe(before)
    s.mode = 'play'
    bridge.tick(s, 0.05, hooks)
    expect(JSON.stringify(bridge.runtime)).not.toBe(before)
    bridge.reset()
    expect(bridge.runtime).toMatchObject({ nextId: 1, enemies: [], projectiles: [], zones: [] })
    expect(bridge.defeated).toEqual({})
    expect(bridge.statuses).toEqual({})
  })

  it('keeps dense seeded encounters deterministic with bounded actors, projectiles and zones', () => {
    function scenario() {
      const s = game(), bridge = createFactionBridge({ random: () => 0.1, lineOfSight: () => true })
      for (let i = 0; i < 180; i++) bridge.spawnRandom(s, 160 + i % 8, i % 12, i % 3 === 0)
      frames(bridge, s, 120)
      return JSON.stringify({ runtime: bridge.runtime, killed: s.kill, damageTaken: s.damageTaken })
    }
    expect(scenario()).toBe(scenario())
    const s = game(), bridge = createFactionBridge({ random: () => 0.1 })
    for (let i = 0; i < 200; i++) bridge.spawn(s, 'fire-imp', 120, i % 15)
    expect(bridge.runtime.enemies).toHaveLength(130)
    frames(bridge, s, 90)
    expect(bridge.runtime.projectiles.length).toBeLessThanOrEqual(100)
    expect(bridge.runtime.zones.length).toBeLessThanOrEqual(64)
  })
})

it('keeps previously dropped XP when a faction death crosses the gem budget', () => {
  const s = game(), bridge = createFactionBridge({ random: () => 0 })
  s.stars = Array.from({ length: 220 }, (_, i) => ({ x: 500 + i, y: 0, value: 3, t: 0 }))
  const enemy = bridge.spawn(s, 'berserker', 250, 0)!
  bridge.hitFaction(s, enemy, 10000, 0, 0, hooks)
  expect(s.kill).toBe(1)
  expect(s.stars.length).toBeLessThanOrEqual(220)
  expect(s.stars.reduce((sum, star) => sum + star.value, 0)).toBe(660 + ENEMY_DEFINITIONS.berserker.xp)
})

it('resolves final-lifetime swept contact with a faction enemy before removing a projectile', () => {
  const s = game(), bridge = createFactionBridge({ random: () => 0.2, lineOfSight: () => true })
  s.hero!.attack = 999
  s.spawnT = 999
  s.nextEventAt = Infinity
  const e = bridge.spawn(s, 'berserker', 60, 0)!
  e.speed = 0
  const hp = e.hp
  s.shots.push({ x: 0, y: 0, vx: 540, vy: 0, life: 0.1, d: 10, r: 5, kind: 'arrow' })
  step(s, 0.15, { x: 0, y: 0 }, hooks, undefined, undefined, bridge)
  expect(e.hp).toBeLessThan(hp)
  expect(s.shots).toHaveLength(0)
})
