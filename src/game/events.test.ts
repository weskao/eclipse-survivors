import { afterEach, describe, expect, it, vi } from 'vitest'
import { seeded, setRandom } from './math'
import { BALANCE } from './config'
import { createHero, createState } from './state'
import { rollChestTier, rollEventKind, trySpawnEvent, tickWorld } from './events'
import { nearbyHazards, nearbyObstacles } from './world'
import type { GameHooks, GameState } from './types'

const hooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks
const make = (): GameState => {
  const s = createState()
  s.hero = createHero('knight')
  s.mode = 'play'
  s.W = 390
  s.H = 844
  s.nextEventAt = Infinity
  return s
}
afterEach(() => setRandom())

describe('controlled random events', () => {
  it('uses stable weighted event buckets', () => {
    expect([.26, .47, .55, .70, .85, .98].map(n => rollEventKind(() => n))).toEqual([
      'chest', 'shrine', 'invasion', 'blessing', 'bargain', 'challenge',
    ])
  })
  it('places events away from the hero, hazards, scenery and other rewards, even on narrow phones', () => {
    const s = make()
    setRandom(seeded(91))
    for (let i = 0; i < BALANCE.events.maxActive; i++) trySpawnEvent(s, 'chest')
    expect(s.events.length).toBeGreaterThan(0)
    const placement = BALANCE.events.legacyPlacement
    const maxRadius = placement.minRadius + Math.min(placement.maxExtraRadius,
      Math.max(placement.minExtraRadius, s.W * placement.viewportWidthFactor))
    for (const e of s.events) {
      expect(Math.hypot(e.x, e.y)).toBeGreaterThanOrEqual(placement.minRadius - 1e-6)
      expect(Math.hypot(e.x, e.y)).toBeLessThanOrEqual(maxRadius + 1e-6)
      expect(nearbyObstacles(0, e.x, e.y, 80).every(o => Math.hypot(e.x-o.x, e.y-o.y) > o.r + placement.terrainClearance)).toBe(true)
      expect(nearbyHazards(0, e.x, e.y, 100).every(h => Math.hypot(e.x-h.x, e.y-h.y) > h.r + placement.terrainClearance)).toBe(true)
      expect(s.events.filter(other => other !== e).every(other => Math.hypot(e.x-other.x, e.y-other.y) >= placement.minSeparation)).toBe(true)
    }
  })
  it('is reproducible with the same seed', () => {
    const sequence = () => {
      const s = make()
      setRandom(seeded(19))
      for (let i = 0; i < 3; i++) trySpawnEvent(s, 'shrine')
      return s.events.map(({ x, y, kind }) => ({ x, y, kind }))
    }
    expect(sequence()).toEqual(sequence())
  })
  it('leaves chests and healing shrines reachable for the configured lifetime', () => {
    const s = make()
    const spawned = trySpawnEvent(s, 'shrine', seeded(91))
    expect(spawned).toBe(true)
    expect(s.events[0]?.expiresAt).toBe(BALANCE.events.lifetime)
  })
  it('permits a 90% event-roll opportunity while keeping placement rules', () => {
    const s = make()
    s.nextEventAt = 0
    const position = seeded(91)
    let draws = 0
    setRandom(() => {
      draws++
      return draws === 1 ? 0 : draws === 2 ? 0.90 : draws === 3 ? 0.1 : position()
    })
    tickWorld(s, .016, hooks())
    expect(s.events).toHaveLength(1)
  })
  it('allows a third scattered reward but respects the configured active cap', () => {
    const s = make()
    s.events = Array.from({ length: BALANCE.events.maxActive - 1 }, (_, i) => ({
      id: i + 1, kind: 'chest' as const, x: 2000 + i * 200, y: 2000, expiresAt: 100,
    }))
    s.eventSerial = s.events.length
    expect(BALANCE.events.maxActive).toBeGreaterThanOrEqual(3)
    expect(trySpawnEvent(s, 'shrine', seeded(91))).toBe(true)
    expect(s.events).toHaveLength(BALANCE.events.maxActive)
    expect(trySpawnEvent(s, 'chest', seeded(91))).toBe(false)
  })
  it('awards a chest exactly once and expires unused events', () => {
    const s = make()
    s.events.push({ id: 1, kind: 'chest', x: 0, y: 0, expiresAt: 30 })
    tickWorld(s, .1, hooks())
    const xp = s.hero!.xp
    expect(xp).toBeGreaterThan(0)
    tickWorld(s, .1, hooks())
    expect(s.hero!.xp).toBe(xp)
    s.events.push({ id: 2, kind: 'shrine', x: 200, y: 0, expiresAt: 1 })
    s.time = 2
    tickWorld(s, .1, hooks())
    expect(s.events).toHaveLength(0)
  })
  it('only permits bargains above the safety-health threshold', () => {
    const s = make()
    s.hero!.hp = 8
    s.events.push({ id: 1, kind: 'bargain', x: 0, y: 0, expiresAt: 40 })
    tickWorld(s, .1, hooks())
    expect(s.hero!.hp).toBe(8)
    expect(s.hero!.xp).toBe(0)
  })
  it('applies blessings temporarily, without altering permanent upgrade levels', () => {
    const s = make()
    s.hero!.hp = 60
    s.events.push({ id: 1, kind: 'blessing', x: 0, y: 0, expiresAt: 30 })
    tickWorld(s, .1, hooks())
    expect(s.blessingUntil).toBeGreaterThan(s.time)
    const hp = s.hero!.hp
    s.time += 2
    tickWorld(s, .5, hooks())
    expect(s.hero!.hp).toBeGreaterThan(hp)
    expect(s.hero!.skills).toEqual({})
  })
  it('limits environmental damage with an entry grace period and hit cooldown', () => {
    const s = make()
    s.currentScene = 3
    const hazard = nearbyHazards(3, 0, 0, 1100)[0]!
    s.hero!.x = hazard.x
    s.hero!.y = hazard.y
    s.time = 10
    s.sceneEnteredAt = 10
    const h = hooks()
    tickWorld(s, .1, h)
    expect(s.hero!.hp).toBe(s.hero!.max)
    s.time = 12
    tickWorld(s, .1, h)
    const damaged = s.hero!.hp
    expect(damaged).toBeLessThan(s.hero!.max)
    s.time = 12.2
    s.hero!.inv = 0
    tickWorld(s, .1, h)
    expect(s.hero!.hp).toBe(damaged)
    s.time = 14
    s.hero!.inv = 0
    tickWorld(s, .1, h)
    expect(s.hero!.hp).toBeLessThan(damaged)
  })
})


describe('visible danger bounds', () => {
  it('uses the rendered ellipse rather than an invisible circular damage radius', () => {
    const s = make()
    s.currentScene = 3
    const h = nearbyHazards(3, 0, 0, 900)[0]!
    s.hero!.x = h.x
    s.hero!.y = h.y + h.r * .94
    s.sceneEnteredAt = 0
    s.time = 12
    tickWorld(s, .016, hooks())
    expect(s.hero!.hp).toBe(s.hero!.max)
    s.hero!.y = h.y
    s.time = 14
    tickWorld(s, .016, hooks())
    expect(s.hero!.hp).toBeLessThan(s.hero!.max)
  })
  it('does not advance event scheduling while the game is paused', () => {
    const s = make()
    s.nextEventAt = 0
    s.mode = 'paused'
    tickWorld(s, 1, hooks())
    expect(s.events).toHaveLength(0)
    expect(s.nextEventAt).toBe(0)
  })
})

it('uses deterministic chest rarity buckets and passes the advertised tier to the actual pickup transaction', () => {
  expect([.1,.75,.9,.98,.999].map(x=>rollChestTier(()=>x))).toEqual(['common','rare','epic','legendary','cursed'])
  const s=make()
  const openTreasure=vi.fn(()=>true)
  s.events.push({id:1,kind:'chest',tier:'legendary',x:0,y:0,expiresAt:30})
  tickWorld(s,.016,{...hooks(),openTreasure})
  expect(openTreasure).toHaveBeenCalledWith(s,1,'legendary')
  expect(s.events).toHaveLength(0)
})
