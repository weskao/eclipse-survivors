import { describe, expect, it, vi } from 'vitest'
import { createContentRegistry, MAX_CONTENT_EFFECTS } from './registry'
import { createHero, createState, resetRun } from '../state'
import { seeded } from '../math'
import type { ContentPack } from './contracts'
import type { GameHooks } from '../types'

const hooks: GameHooks = { end() {}, sfx() {}, message() {}, offerUpgrades() {} }
const sample: ContentPack = {
  id: 'arcane',
  abilities: [{ id: 'arcane:bolt', kind: 'weapon', icon: '✦', title: 'Arcane Bolt',
    desc: 'A bolt', rarity: 'rare', maxLevel: 3, cooldownSeconds: 1.5 }],
  effects: [{ id: 'arcane:flash', title: 'Flash', draw() {} }],
}

it('registers namespace-safe unique IDs and rejects collisions', () => {
  expect(() => createContentRegistry([sample, sample])).toThrow(/duplicate content pack/)
  expect(() => createContentRegistry([{ ...sample, abilities: [...sample.abilities!, sample.abilities![0]!] }])).toThrow(/duplicate content ID/)
  expect(() => createContentRegistry([{ id: 'arcane', abilities: [{ ...sample.abilities![0]!, id: 'other:bolt' }] }])).toThrow(/Invalid or duplicate content ID/)
  expect(() => createContentRegistry([{ id: 'Arcane' }])).toThrow(/Invalid or duplicate content pack/)
})

it('snapshots definitions and remains immutable after the caller changes its input', () => {
  const source = [sample]
  const registry = createContentRegistry(source)
  source.pop()
  expect(registry.packs).toHaveLength(1)
  expect(Object.isFrozen(registry.packs)).toBe(true)
  expect(Object.isFrozen(registry.abilities[0])).toBe(true)
  expect(registry.abilities.map(a => a.id)).toEqual(['arcane:bolt'])
})

it('supports an empty pack index and a full empty lifecycle', () => {
  const registry = createContentRegistry([])
  const state = createState()
  state.hero = createHero('knight')
  registry.emit(state, { type: 'start' }, hooks)
  registry.tick(state, 0.016, hooks)
  expect(registry.eligible(state)).toEqual([])
  expect(registry.acquire(state, 'missing:ability', hooks)).toBe(false)
  expect(state.content.effects).toEqual([])
})

it('owns cooldowns by ability, resets them for each run and expires all effects', () => {
  const onTick = vi.fn()
  const registry = createContentRegistry([{ ...sample, abilities: [{ ...sample.abilities![0]!, onTick }] }])
  const state = createState()
  state.hero = createHero('knight')
  expect(registry.acquire(state, 'arcane:bolt', hooks)).toBe(true)
  registry.tick(state, 0.1, hooks)
  registry.tick(state, 0.1, hooks)
  expect(onTick).toHaveBeenCalledTimes(1)
  expect(state.content.cooldowns['arcane:bolt']).toBeGreaterThan(1)
  expect(registry.addEffect(state, { id: 'arcane:flash', x: 1, y: 2, life: 0.2, max: 0.2 })).toBe(true)
  registry.tick(state, 0.3, hooks)
  expect(state.content.effects).toEqual([])
  resetRun(state)
  expect(state.content.cooldowns).toEqual({})
  expect(state.content.levels).toEqual({})
})

it('bounds effect count and lifetime without external mutation of registered definitions', () => {
  const registry = createContentRegistry([sample])
  const state = createState()
  expect(registry.addEffect(state, { id: 'arcane:flash', x: 0, y: 0, life: 5, max: 5 })).toBe(false)
  expect(registry.addEffect(state, { id: 'other:flash', x: 0, y: 0, life: 1, max: 1 })).toBe(false)
  for (let i = 0; i < MAX_CONTENT_EFFECTS; i++)
    expect(registry.addEffect(state, { id: 'arcane:flash', x: i, y: 0, life: 1, max: 1 })).toBe(true)
  expect(registry.addEffect(state, { id: 'arcane:flash', x: 100, y: 0, life: 1, max: 1 })).toBe(false)
})

it('dispatches events in deterministic pack order and supplies seeded random', () => {
  const calls: string[] = []
  const a: ContentPack = { id: 'a', onEvent(ctx, event) { calls.push('a:' + event.type + ':' + ctx.random()) } }
  const b: ContentPack = { id: 'b', onEvent(ctx, event) { calls.push('b:' + event.type + ':' + ctx.random()) } }
  const fire = () => {
    const result: string[] = []
    const registry = createContentRegistry([b, a], seeded(42))
    const s = createState()
    s.hero = createHero('knight')
    registry.emit(s, { type: 'start' }, hooks)
    result.push(...calls.splice(0))
    return result
  }
  expect(fire()).toEqual(fire())
  expect(fire().map(x => x.slice(0, 2))).toEqual(['a:', 'b:'])
})

describe('eligibility and level progression', () => {
  it('checks prerequisites and capped levels without touching existing hero skill ownership', () => {
    const registry = createContentRegistry([{ ...sample, abilities: [{
      ...sample.abilities![0]!, maxLevel: 2, requires: [{ id: 'frost', level: 3 }],
    }] }])
    const s = createState()
    s.hero = createHero('knight')
    expect(registry.eligible(s)).toHaveLength(0)
    s.hero.skills.frost = 3
    expect(registry.eligible(s)).toHaveLength(1)
    expect(registry.acquire(s, 'arcane:bolt', hooks)).toBe(true)
    expect(registry.acquire(s, 'arcane:bolt', hooks)).toBe(true)
    expect(registry.acquire(s, 'arcane:bolt', hooks)).toBe(false)
    expect(s.hero.skills.frost).toBe(3)
  })
})
