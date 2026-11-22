import { describe, expect, it, vi } from 'vitest'
import { createWorldEventDirector } from './director'
import { WORLD_EVENT_DEFINITIONS } from './definitions'
import { WORLD_EVENTS_PACK } from '../packs/events'
import { createContentRegistry } from '../registry'
import { createHero, createState, resetRun } from '../../state'
import { seeded } from '../../math'
import { createLegacyEventWorld, createLegacyEventCommit } from './adapters'
import type { EventWorld, WorldEventTransaction } from './types'

const point = { x: 240, y: 0 }
const world = (): EventWorld => ({
  time: 0, biome: 0, playing: true,
  hero: { x: 0, y: 0, hp: 175, maxHp: 175, xp: 40 },
  canPlace: () => true, canApproach: () => true, isOccupied: () => false,
})
const setup = () => {
  const applied: WorldEventTransaction[] = []
  const commit = vi.fn((tx: WorldEventTransaction) => { applied.push(tx); return true })
  return { director: createWorldEventDirector({ random: seeded(42), commit }), applied, commit }
}
const near = (w: EventWorld) => { w.hero.x = point.x; w.hero.y = point.y }

describe('world event contract', () => {
  it('registers twelve unique named content entries without owning the integration manifest', () => {
    expect(WORLD_EVENT_DEFINITIONS).toHaveLength(12)
    expect(new Set(WORLD_EVENT_DEFINITIONS.map(e => e.id)).size).toBe(12)
    expect(new Set(WORLD_EVENT_DEFINITIONS.map(e => e.title)).size).toBe(12)
    const registry = createContentRegistry([WORLD_EVENTS_PACK])
    expect(registry.packs[0]?.worldEvents).toHaveLength(12)
    for (const def of WORLD_EVENT_DEFINITIONS) {
      expect(def.choices.length).toBeGreaterThanOrEqual(2)
      expect(def.choices.some(c => c.effects.length || c.objective)).toBe(true)
      expect(def.choices.every(c => !!c.title && !!c.risk && !!c.reward)).toBe(true)
      expect(def.visualCueId).toMatch(/^events:/)
    }
  })

  it.each(WORLD_EVENT_DEFINITIONS)('$title resolves a meaningful choice at most once', (definition) => {
    const { director, applied, commit } = setup()
    const w = world()
    const evt = director.spawn(definition.id, w, point)
    expect(evt).not.toBeNull()
    near(w)
    const choice = definition.choices.find(c => c.effects.length || c.objective)!
    expect(director.choose(evt!.id, choice.id, w)).toBe('applied')
    expect(director.choose(evt!.id, choice.id, w)).toBe('unavailable')
    expect(commit).toHaveBeenCalledTimes(1)
    expect(applied[0]?.id).toBe(evt!.id + ':' + choice.id)
  })

  it('uses exact inclusive distance, never silently auto-activates, and supports touch choice IDs', () => {
    const { director, applied } = setup()
    const w = world()
    const evt = director.spawn('events:divine-shrine', w, point)!
    expect(director.choose(evt.id, 'heal', w)).toBe('out-of-range')
    w.hero.x = point.x + 64
    expect(director.choose(evt.id, 'heal', w)).toBe('applied')
    expect(applied).toHaveLength(1)
    expect(applied[0]?.effects).toEqual([{ type: 'heal', amount: 36 }])
  })

  it('keeps a recoverable choice after an atomic sink rejects it, without duplicate rewards', () => {
    const applied: WorldEventTransaction[] = []
    let accept = false
    const director = createWorldEventDirector({ random: seeded(1), commit(tx) {
      if (!accept) return false
      applied.push(tx)
      return true
    } })
    const w = world()
    const evt = director.spawn('events:treasure-vault', w, point)!
    near(w)
    expect(director.choose(evt.id, 'unlock', w)).toBe('retry')
    expect(director.active).toHaveLength(1)
    accept = true
    expect(director.choose(evt.id, 'unlock', w)).toBe('applied')
    expect(director.choose(evt.id, 'unlock', w)).toBe('unavailable')
    expect(applied).toHaveLength(1)
    expect(new Set(applied[0]!.effects.filter(e => e.type === 'symbolic-loot').map(e => e.id)).size)
      .toBe(applied[0]!.effects.filter(e => e.type === 'symbolic-loot').length)
  })

  it('rejects unaffordable or invalid choices but always offers a safe exit', () => {
    const { director } = setup()
    const w = world()
    w.hero.hp = 5
    w.hero.x = point.x
    const evt = director.spawn('events:blood-pact', w, point)!
    expect(director.choose(evt.id, 'sacrifice', w)).toBe('unavailable')
    expect(director.choose(evt.id, 'leave', w)).toBe('applied')
    expect(director.choose(evt.id, '__missing__', w)).toBe('unavailable')
  })

  it('enforces placement reachability, hazards, occupied terrain, cap and separation', () => {
    const { director } = setup()
    const w = world()
    w.canPlace = () => false
    expect(director.spawn('events:wandering-merchant', w, point)).toBeNull()
    w.canPlace = () => true
    w.canApproach = () => false
    expect(director.spawn('events:wandering-merchant', w, point)).toBeNull()
    w.canApproach = () => true
    w.isOccupied = () => true
    expect(director.spawn('events:wandering-merchant', w, point)).toBeNull()
    w.isOccupied = () => false
    expect(director.spawn('events:wandering-merchant', w, point)).not.toBeNull()
    expect(director.spawn('events:cursed-altar', w, { x: 250, y: 0 })).toBeNull()
    expect(director.spawn('events:cursed-altar', w, { x: -240, y: 0 })).not.toBeNull()
    expect(director.spawn('events:divine-shrine', w, { x: 0, y: 250 })).toBeNull()
  })

  it('schedules deterministically with a bounded number of attempts and no pausing drift', () => {
    const produce = () => {
      const { director } = setup()
      const w = world()
      w.time = 7
      director.tick(w)
      const first = director.active.map(e => ({ kind: e.kind, x: e.x, y: e.y }))
      w.playing = false
      w.time = 30
      director.tick(w)
      expect(director.active).toHaveLength(first.length)
      return first
    }
    expect(produce()).toEqual(produce())
    const { director } = setup()
    const w = world()
    w.canPlace = () => false
    w.time = 7
    director.tick(w)
    expect(director.active).toHaveLength(0)
  })

  it('expires unclaimed events, clears across biome changes, and resets serial and objectives safely', () => {
    const { director } = setup()
    const w = world()
    const evt = director.spawn('events:survival-challenge', w, point)!
    w.time = evt.expiresAt
    director.tick(w)
    expect(director.active).toHaveLength(0)
    const next = director.spawn('events:survival-challenge', w, point)!
    near(w)
    expect(director.choose(next.id, 'endure', w)).toBe('applied')
    expect(director.objectives).toHaveLength(1)
    w.biome = 'abyss'
    director.tick(w)
    expect(director.objectives).toHaveLength(0)
    director.reset()
    expect(director.active).toHaveLength(0)
    expect(director.objectives).toHaveLength(0)
    expect(director.spawn('events:survival-challenge', w, { x: 480, y: 0 })?.id).not.toBe(next.id)
  })

  it('awards objective completion once after actual survival and fails when leaving the ring', () => {
    const { director, applied } = setup()
    const w = world()
    const evt = director.spawn('events:survival-challenge', w, point)!
    near(w)
    expect(director.choose(evt.id, 'endure', w)).toBe('applied')
    expect(applied).toHaveLength(1)
    w.time = 9
    director.tick(w)
    director.tick(w)
    expect(applied).toHaveLength(2)
    expect(applied[1]!.effects).toContainEqual({ type: 'xp', amount: 36 })
    const next = director.spawn('events:survival-challenge', w, { x: 480, y: 0 })!
    w.hero.x = 480
    expect(director.choose(next.id, 'endure', w)).toBe('applied')
    w.hero.x = -500
    director.tick(w)
    expect(director.objectives).toHaveLength(0)
  })

  it('requires reported kills to complete elite or ambush objectives, and bounds active contracts', () => {
    const { director, applied } = setup()
    const w = world()
    const evt = director.spawn('events:elite-hunt', w, point)!
    near(w)
    expect(director.choose(evt.id, 'hunt', w)).toBe('applied')
    const grunt = {}
    director.reportKill(false, evt.id, w.time, grunt)
    expect(applied).toHaveLength(1)
    const elite = {}
    director.reportKill(true, evt.id, w.time, elite)
    director.reportKill(true, evt.id, w.time, elite) // duplicate kill callback
    director.tick(w)
    expect(applied).toHaveLength(2)
    director.tick(w)
    expect(applied).toHaveLength(2)
  })

  it('does not credit late or duplicate kills toward deferred rewards', () => {
    const { director, applied } = setup()
    const w = world()
    const evt = director.spawn('events:monster-ambush', w, point)!
    near(w)
    expect(director.choose(evt.id, 'fight', w)).toBe('applied')
    const mob = {}
    director.reportKill(false, evt.id, 1, mob)
    director.reportKill(false, evt.id, 1, mob)
    w.time = 19
    director.reportKill(false, evt.id, w.time, {})
    director.tick(w)
    expect(applied).toHaveLength(1)
    expect(director.objectives).toHaveLength(0)
  })

  it('rejects non-finite clocks and coordinates rather than leaving permanent markers', () => {
    const { director } = setup()
    const w = world()
    w.time = Number.NaN
    expect(director.spawn('events:divine-shrine', w, point)).toBeNull()
    w.time = 0
    w.hero.x = Number.POSITIVE_INFINITY
    expect(director.spawn('events:divine-shrine', w, point)).toBeNull()
  })

  it('adapts terrain/hazards from existing world and uses an idempotent commit bridge', () => {
    const s = createState()
    s.hero = createHero('knight')
    s.mode = 'play'
    s.W = 390; s.H = 844
    const w = createLegacyEventWorld(s)
    expect(w.hero.hp).toBe(s.hero.hp)
    expect(w.biome).toBe(0)
    expect(w.canPlace({ x: 0, y: 0 }, 32)).toBe(true)
    const h = { sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }
    const commit = createLegacyEventCommit(s, h)
    const tx: WorldEventTransaction = { id: 'once', eventId: '1:1', kind: 'events:healing-fountain',
      choiceId: 'drink', visualCueId: 'events:fountain-light', audioCue: 'pickup',
      effects: [{ type: 'heal', amount: 10 }] }
    s.hero.hp = 20
    expect(commit(tx)).toBe(true)
    expect(commit(tx)).toBe(true)
    expect(s.hero.hp).toBe(30)
    resetRun(s)
    expect(s.hero.hp).toBe(s.hero.max)
  })
})
