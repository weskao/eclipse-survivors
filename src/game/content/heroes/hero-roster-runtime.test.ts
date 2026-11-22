import { describe, expect, it, vi } from 'vitest'
import { createHero, createState, resetRun } from '../../state'
import type { GameHooks, Mob } from '../../types'
import {
  createHeroRosterAdapter, createHeroSpecializationAdapter, HERO_DEFINITIONS,
} from './index'

const hooks: GameHooks = {
  sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn(), content: vi.fn(),
}
const enemy = (hp = 100): Mob => ({
  x: 35, y: 0, hp, max: hp, type: 'slime', r: 15, speed: 0, dmg: 4,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})
function start(id: 'shadowblade' | 'spirit-summoner' | 'crimson-paladin', rng = () => 0.99) {
  const state = createState()
  state.mode = 'play'
  const adapter = createHeroSpecializationAdapter(state, id, hooks, rng)
  adapter.reset()
  return { state, adapter }
}

describe('ES2 hero-roster runtime integration (RED/Green)', () => {
  it('retains unique playable IDs, statistics, starting equipment and three legacy heroes', () => {
    const legacy = (['knight', 'ranger', 'wizard'] as const).map(createHero)
    const equipments = new Set<string>()
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const) {
      const { state } = start(id)
      const def = HERO_DEFINITIONS[id]
      expect(def.startingEquipment).toBeTruthy()
      equipments.add(def.startingEquipment)
      expect(state.hero?.max).toBe(def.stats.hp)
      expect(state.hero?.damage).toBe(def.stats.damage)
      expect(state.hero?.delay).toBe(def.stats.delay)
      expect(state.hero?.range).toBe(def.stats.range)
      expect(state.content.levels[def.startingAbility]).toBe(1)
      expect(createHeroRosterAdapter(state, id, hooks)?.id).toBe(id)
    }
    expect(equipments.size).toBe(3)
    for (const legacyId of ['knight', 'ranger', 'wizard'] as const) {
      expect(createHeroRosterAdapter(createState(), legacyId, hooks)).toBeNull()
    }
    expect((['knight', 'ranger', 'wizard'] as const).map(createHero)).toEqual(legacy)
  })

  it('routes shadow critical damage through legacy hit/XP attribution exactly once', () => {
    vi.mocked(hooks.content!).mockClear()
    const { state, adapter } = start('shadowblade', () => 0.01)
    const target = enemy(34)
    state.mobs.push(target)
    expect(adapter.dealDamage(target, 20)).toBe(34)
    expect(target.hp).toBe(0)
    expect(state.kill).toBe(1)
    expect(state.damageDealt).toBe(34)
    expect(state.stars).toHaveLength(1)
    expect(vi.mocked(hooks.content!).mock.calls.map(call => call[1].type)).toEqual(['hit', 'kill'])
    expect(adapter.dealDamage(target, 20)).toBe(0)
    expect(state.kill).toBe(1)
    expect(state.stars).toHaveLength(1)
  })

  it('suppresses shadow targeting only while stealth is active and freezes during pause', () => {
    const { state, adapter } = start('shadowblade')
    expect(adapter.canBeTargeted()).toBe(true)
    expect(adapter.activate()).toBe(true)
    expect(adapter.canBeTargeted()).toBe(false)
    state.mode = 'paused'
    adapter.tick(20)
    expect(adapter.canBeTargeted()).toBe(false)
    state.mode = 'play'
    adapter.tick(1)
    expect(adapter.canBeTargeted()).toBe(true)
  })

  it('applies paladin mitigation before actual legacy damage, honors full barrier and counter throttling', () => {
    const { state, adapter } = start('crimson-paladin')
    const target = enemy(200)
    state.mobs.push(target)
    const health = state.hero!.hp
    expect(adapter.receiveDamage(30)).toBeCloseTo(25.8)
    expect(state.hero!.hp).toBeCloseTo(health - 25.8)
    expect(state.damageTaken).toBeCloseTo(25.8)
    expect(target.hp).toBeLessThan(200)
    state.hero!.inv = 0
    const hpBefore = state.hero!.hp
    adapter.activate()
    const barrierBefore = adapter.snapshot().barrier
    expect(adapter.receiveDamage(25)).toBe(0)
    expect(adapter.snapshot().barrier).toBeLessThan(barrierBefore)
    expect(state.hero!.hp).toBeLessThan(hpBefore) // active ability's explicit health cost
    expect(state.hero!.inv).toBe(0) // no phantom legacy i-frames for fully shielded hits
    const remainder = adapter.snapshot().barrier
    state.hero!.inv = 0.5
    expect(adapter.receiveDamage(50)).toBe(0)
    expect(adapter.snapshot().barrier).toBe(remainder)
    state.hero!.inv = 0
    expect(adapter.receiveDamage(Number.NaN)).toBe(0)
    expect(adapter.receiveDamage(-4)).toBe(0)
  })

  it('limits companions across high levels and refreshes runtime after restart', () => {
    const { state, adapter } = start('spirit-summoner')
    state.hero!.level = 10000
    expect(adapter.snapshot().companions).toEqual(['wisp', 'guardian', 'reaver'])
    adapter.activate()
    expect(adapter.snapshot().cooldown).toBeGreaterThan(0)
    resetRun(state)
    adapter.reset()
    expect(adapter.snapshot().companions).toEqual(['wisp'])
    expect(adapter.snapshot().cooldown).toBe(0)
    expect(state.content.levels).toEqual({ [HERO_DEFINITIONS['spirit-summoner'].startingAbility]: 1 })
  })

  it('ignores damage and special actions outside live play', () => {
    const { state, adapter } = start('crimson-paladin')
    state.mode = 'level'
    expect(adapter.activate()).toBe(false)
    expect(adapter.receiveDamage(18)).toBe(0)
    expect(adapter.dealDamage(enemy(), 12)).toBe(0)
    state.mode = 'play'
    state.hero!.dash = 1
    expect(adapter.receiveDamage(18)).toBe(0)
  })
})
