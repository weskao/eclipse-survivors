import { describe, expect, it, vi } from 'vitest'
import { MAX_MOBS } from '../../constants'
import { createHero, createState, resetRun } from '../../state'
import { RELICS } from '../relics/catalog'
import { acquireRelic, inventorySnapshot } from '../relics/runtime'
import { createLegacyEventWorld } from './adapters'
import { WORLD_EVENT_DEFINITIONS } from './definitions'
import { createLiveWorldEvents } from './runtime'
import type { GameHooks } from '../../types'

const hooks = (): GameHooks => ({
  sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn(), content: vi.fn(),
})

function setup() {
  const state = createState()
  state.hero = createHero('knight')
  state.mode = 'play'
  state.hero.hp = state.hero.max = 500
  state.hero.xp = 1000
  const actions = hooks()
  const live = createLiveWorldEvents(state, actions, { random: () => 0.5 })
  const spawn = (kind: (typeof WORLD_EVENT_DEFINITIONS)[number]['id']) => {
    const marker = live.director.spawn(kind, createLegacyEventWorld(state), { x: 0, y: 0 })
    expect(marker).not.toBeNull()
    return marker!
  }
  return { state, actions, live, spawn }
}

describe('world-event live integration', () => {
  it.each(WORLD_EVENT_DEFINITIONS)('activates $title as a real event without auto-claiming', definition => {
    const { state, live, spawn } = setup()
    const marker = spawn(definition.id)
    const options = live.options(marker.id)
    expect(options).toHaveLength(definition.choices.length)
    expect(options.every(c => c.title && c.risk && c.reward && Array.isArray(c.costs))).toBe(true)
    const selected = options.find(c => c.id !== 'leave' && c.available)!
    expect(selected).toBeDefined()
    expect(live.director.active).toHaveLength(1)
    expect(live.choose(marker.id, selected.id)).toBe('applied')
    expect(live.choose(marker.id, selected.id)).toBe('unavailable')
    expect(live.director.active).toHaveLength(0)
    expect(state.hero).not.toBeNull()
  })

  it('previews reach, pause and HP/XP costs; exactly 64 units is in range', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:cursed-altar')
    state.hero!.x = 65
    expect(live.options(marker.id).find(c => c.id === 'invoke')?.reason).toMatch(/range/i)
    expect(live.choose(marker.id, 'invoke')).toBe('out-of-range')
    state.hero!.x = 64
    state.hero!.hp = 18
    expect(live.options(marker.id).find(c => c.id === 'invoke')?.available).toBe(false)
    expect(live.options(marker.id).find(c => c.id === 'invoke')?.costs).toContain('18 HP')
    state.hero!.hp = 80
    state.mode = 'paused'
    expect(live.options(marker.id).every(c => !c.available)).toBe(true)
    expect(live.choose(marker.id, 'invoke')).toBe('unavailable')
    state.mode = 'play'
    expect(live.choose(marker.id, 'invoke')).toBe('applied')
  })

  it('does not deduct XP when real loot cannot be granted and retries after capacity returns', () => {
    const { state, live, spawn } = setup()
    for (const relic of RELICS.slice(0, 10)) expect(acquireRelic(state, relic.id)).toBe(true)
    const marker = spawn('events:wandering-merchant')
    const xpBefore = state.hero!.xp
    expect(live.choose(marker.id, 'trade')).toBe('retry')
    expect(state.hero!.xp).toBe(xpBefore)
    expect(inventorySnapshot(state).items).toHaveLength(10)
    expect(live.director.active).toHaveLength(1)
    expect(live.choose(marker.id, 'restock')).toBe('applied')
  })

  it('grants actual inventory relics and never pays twice for a claimed marker', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:treasure-vault')
    const before = state.hero!.xp
    expect(live.choose(marker.id, 'unlock')).toBe('applied')
    expect(state.hero!.xp).toBe(before - 8)
    expect(inventorySnapshot(state).items).toHaveLength(1)
    expect(live.choose(marker.id, 'unlock')).toBe('unavailable')
    expect(inventorySnapshot(state).items).toHaveLength(1)
  })

  it('fails the entire transaction if the shared 130-actor cap cannot fit the encounter', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:monster-ambush')
    state.mobs = Array.from({ length: MAX_MOBS - 2 }, () => ({
      x: 900, y: 900, type: 'slime' as const, hp: 10, max: 10, r: 10,
      speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
    }))
    expect(live.choose(marker.id, 'fight')).toBe('retry')
    expect(state.mobs).toHaveLength(MAX_MOBS - 2)
    state.mobs.length = 0
    expect(live.choose(marker.id, 'fight')).toBe('applied')
    expect(state.mobs).toHaveLength(3)
  })

  it('credits only unique tagged, confirmed deaths from the matching event', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:monster-ambush')
    expect(live.choose(marker.id, 'fight')).toBe('applied')
    expect(live.director.objectives[0]?.target).toBe(3)
    const enemies = [...state.mobs]
    const untagged = { ...enemies[0]!, hp: 0 }
    state.mobs.push(untagged)
    live.onContentEvent({ type: 'kill', mob: untagged, damage: 10 })
    expect(live.director.objectives[0]?.count).toBe(0)
    enemies[0]!.hp = 0
    live.onContentEvent({ type: 'kill', mob: enemies[0]!, damage: 10 })
    live.onContentEvent({ type: 'kill', mob: enemies[0]!, damage: 10 })
    expect(live.director.objectives[0]?.count).toBe(1)
    for (const mob of enemies.slice(1)) {
      mob.hp = 0
      live.onContentEvent({ type: 'kill', mob, damage: 10 })
    }
    expect(live.director.objectives[0]?.count).toBe(3)
    const level = state.hero!.level
    live.tick()
    expect(state.hero!.level).toBeGreaterThan(level)
    const after = { level: state.hero!.level, xp: state.hero!.xp }
    live.tick()
    expect({ level: state.hero!.level, xp: state.hero!.xp }).toEqual(after)
    expect(live.director.objectives).toHaveLength(0)
  })

  it('does not accept ordinary kills as elite-hunt objective evidence', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:elite-hunt')
    expect(live.choose(marker.id, 'hunt')).toBe('applied')
    const elite = state.mobs[0]!
    expect(elite.elite).toBe(true)
    live.onContentEvent({ type: 'kill', mob: elite, damage: 10 })
    expect(live.director.objectives[0]?.count).toBe(0)
    elite.hp = 0
    live.onContentEvent({ type: 'kill', mob: elite, damage: 10 })
    expect(live.director.objectives[0]?.count).toBe(1)
  })

  it('applies temporary buffs and releases them on expiration, scene change and reset', () => {
    const { state, live, spawn } = setup()
    const base = state.hero!.damage
    const altar = spawn('events:cursed-altar')
    expect(live.choose(altar.id, 'invoke')).toBe('applied')
    expect(state.hero!.damage).toBeGreaterThan(base)
    state.time = 15
    live.tick()
    expect(state.hero!.damage).toBeCloseTo(base)
    const next = spawn('events:ancient-forge')
    expect(live.choose(next.id, 'overheat')).toBe('applied')
    expect(state.hero!.damage).toBeGreaterThan(base)
    state.currentScene = 1
    live.tick()
    expect(state.hero!.damage).toBeCloseTo(base)
    live.reset()
    resetRun(state)
    expect(live.director.active).toHaveLength(0)
    expect(live.director.objectives).toHaveLength(0)
  })


  it('preserves a later protection buff when an overlapping one expires', () => {
    const { state, live, spawn } = setup()
    const long = spawn('events:divine-shrine')
    expect(live.choose(long.id, 'ward')).toBe('applied')
    state.time = 2
    const short = spawn('events:cursed-altar')
    expect(live.choose(short.id, 'purify')).toBe('applied')
    state.time = 10
    live.tick()
    expect(state.hero!.inv).toBeGreaterThanOrEqual(2)
    state.time = 12
    live.tick()
    expect(state.hero!.inv).toBeLessThanOrEqual(1)
  })

  it('includes actors owned by faction runtimes in the encounter cap', () => {
    const { state } = setup()
    const live = createLiveWorldEvents(state, hooks(), {
      random: () => 0.5, otherActors: () => MAX_MOBS - 2,
    })
    const marker = live.director.spawn('events:monster-ambush', createLegacyEventWorld(state),
      { x: 0, y: 0 })!
    expect(marker).not.toBeNull()
    expect(live.choose(marker.id, 'fight')).toBe('retry')
    expect(state.mobs).toHaveLength(0)
    expect(live.director.objectives).toHaveLength(0)
  })

  it('holds the world director still while paused and expires markers when play resumes', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:divine-shrine')
    state.mode = 'paused'
    state.time = marker.expiresAt + 1
    live.tick()
    expect(live.director.active).toHaveLength(1)
    state.mode = 'play'
    live.tick()
    expect(live.director.active).toHaveLength(0)
  })

  it('keeps encounter rewards absent on failed, expired objectives', () => {
    const { state, live, spawn } = setup()
    const marker = spawn('events:monster-ambush')
    expect(live.choose(marker.id, 'fight')).toBe('applied')
    const oldXp = state.hero!.xp
    state.time = 19
    for (const mob of state.mobs) {
      mob.hp = 0
      live.onContentEvent({ type: 'kill', mob, damage: 10 })
    }
    live.tick()
    expect(state.hero!.xp).toBe(oldXp)
    expect(live.director.objectives).toHaveLength(0)
  })
})
