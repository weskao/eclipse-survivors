import { describe, expect, it } from 'vitest'
import { createHero, createState } from '../../state'
import type { ContentEvent, Mob } from '../../types'
import { RELICS, RELIC_BY_ID, type RelicId } from './catalog'
import { acquireRelic, calculateRelicAttack, calculateRelicIncoming, claimTreasure,
  inventorySnapshot, onRelicEvent, openTreasure, relicBonuses, resetRelics } from './runtime'
import { createRelicCombatHooks } from './combat-hooks'
import { seeded } from '../../math'

function setup() {
  const state = createState()
  state.hero = createHero('knight')
  state.mode = 'play'
  return state
}
const mob = (hp = 0): Mob => ({ type: 'slime', hp, max: 100, x: 0, y: 0,
  r: 10, speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 })

describe('relic combat remediation', () => {
  for (const relic of RELICS) {
    it(`makes ${relic.id} an attainable, bounded gameplay modifier`, () => {
      const s = setup()
      const baseline = { damage: s.hero!.damage, hp: s.hero!.max, speed: s.hero!.speed, delay: s.hero!.delay }
      expect(acquireRelic(s, relic.id)).toBe(true)
      expect(relicBonuses(s)).toMatchObject(relic.bonuses)
      expect(relicBonuses(s)).not.toBe(relic.bonuses)
      expect(inventorySnapshot(s).items).toEqual([{ id: relic.id, stacks: 1 }])
      for (let i = 1; i < relic.maxStacks; i++) expect(acquireRelic(s, relic.id)).toBe(true)
      expect(acquireRelic(s, relic.id)).toBe(false)
      if (relic.bonuses.damage) expect(s.hero!.damage).not.toBe(baseline.damage)
      if (relic.bonuses.maxHp || relic.bonuses.maxHpRate) expect(s.hero!.max).not.toBe(baseline.hp)
      if (relic.bonuses.speed) expect(s.hero!.speed).not.toBe(baseline.speed)
      if (relic.bonuses.haste) expect(s.hero!.delay).not.toBe(baseline.delay)
      if (relic.cursed) expect(Object.entries(relic.bonuses).some(([name, value]) =>
        ['incoming', 'healingPenalty'].includes(name) ? value > 0 : value < 0)).toBe(true)
    })
  }

  it('resolves each outgoing strike at most once and credits actual damage exactly once', () => {
    const state = setup(), events: ContentEvent[] = []
    acquireRelic(state, 'relics:vampire-fang')
    acquireRelic(state, 'relics:merciful-seed')
    acquireRelic(state, 'relics:grave-bell')
    state.hero!.hp = 20
    const hooks = createRelicCombatHooks(state, () => 0, event => {
      events.push(event)
      onRelicEvent(state, event)
    })
    const target = mob(0)
    const strike = hooks.attack(1, 10, { targetHp: 40, targetHpFraction: 0.04, boss: false })
    expect(strike?.execute).toBe(true)
    expect(strike?.damage).toBeGreaterThanOrEqual(40)
    expect(hooks.attack(1, 10, {})).toBeNull()
    expect(hooks.attack(0, 10, {})).toBeNull()
    expect(hooks.confirmHit(1, target, 40, true)).toBe(true)
    expect(events.map(e => e.type)).toEqual(['hit', 'kill'])
    expect(state.hero!.hp).toBeCloseTo(20 + 40 * 0.02 + 1.2)
    expect(hooks.confirmHit(1, target, 40, true)).toBe(false)
    expect(state.hero!.hp).toBeCloseTo(22)
    expect(hooks.attack(2, 1, {})).not.toBeNull()
    expect(hooks.confirmHit(2, mob(10), 0, false)).toBe(true)
    expect(events).toHaveLength(2)
    expect(hooks.confirmHit(2, mob(0), 10, true)).toBe(false)
  })

  it('defers reflection until actual incoming HP damage, including dodge and immunity', () => {
    const s = setup(), events: ContentEvent[] = []
    acquireRelic(s, 'relics:mirror-charm')
    acquireRelic(s, 'relics:phantom-boots')
    const hooks = createRelicCombatHooks(s, () => 0, e => events.push(e))
    const dodge = hooks.incoming(1, 100)
    expect(dodge?.dodged).toBe(true)
    expect(hooks.confirmIncoming(1, 0)).toBe(0)
    expect(hooks.confirmIncoming(1, 100)).toBeNull()
    expect(hooks.incoming(1, 100)).toBeNull()
    const miss = hooks.incoming(2, 100)
    expect(miss?.dodged).toBe(true)
    expect(hooks.confirmIncoming(2, 0)).toBe(0)
    expect(events).toEqual([])
    const real = createRelicCombatHooks(s, () => 1, e => events.push(e))
    expect(real.incoming(1, 100)?.dodged).toBe(false)
    expect(real.confirmIncoming(1, 30)).toBeCloseTo(6)
    expect(real.confirmIncoming(1, 30)).toBeNull()
    expect(events).toEqual([{ type: 'damage', amount: 30 }])
  })

  it('prevents fabricated kills, stale receipts and unbounded pending attacks', () => {
    const s = setup(), emitted: ContentEvent[] = []
    const hooks = createRelicCombatHooks(s, seeded(6), event => emitted.push(event))
    expect(hooks.confirmHit(1, mob(), 100, true)).toBe(false)
    expect(hooks.attack(1, 5, {})).not.toBeNull()
    expect(hooks.confirmHit(1, mob(10), 5, true)).toBe(false)
    expect(hooks.confirmHit(1, mob(10), 5, false)).toBe(true)
    for (let i = 2; i <= 600; i++) expect(hooks.attack(i, 1, {})).not.toBeNull()
    expect(hooks.pendingAttacks()).toBeLessThanOrEqual(130)
    expect(hooks.confirmHit(2, mob(), 2, true)).toBe(false)
    expect(hooks.attack(2, 10, {})).toBeNull()
    hooks.reset()
    expect(hooks.pendingAttacks()).toBe(0)
    expect(hooks.attack(1, 5, {})).not.toBeNull()
    expect(inventorySnapshot(s).items).toEqual([])
    expect(emitted.map(e => e.type)).toEqual(['hit'])
  })

  it('does not spend a chest serial on a failed RNG draw; rejects invalid rewards and retains exactly-once claims', () => {
    const s = setup()
    expect(() => openTreasure(s, 1, () => Number.NaN)).toThrow()
    expect(inventorySnapshot(s).pending).toBeNull()
    const offer = openTreasure(s, 1, seeded(1))!
    expect(offer.options).toHaveLength(3)
    expect(claimTreasure(s, 1, 'relics:unknown' as RelicId)).toBe(false)
    expect(claimTreasure(s, 1, offer.options[0]!)).toBe(true)
    expect(claimTreasure(s, 1, offer.options[0]!)).toBe(false)
    expect(RELIC_BY_ID.has(offer.options[0]!)).toBe(true)
    resetRelics(s)
    expect(inventorySnapshot(s).items).toEqual([])
  })

  it('does not turn invalid finite bounds into pickup overflow or phantom combat damage', () => {
    const s = setup()
    expect(calculateRelicAttack(s, Number.NaN, {}, () => 0).damage).toBe(0)
    expect(calculateRelicIncoming(s, Number.POSITIVE_INFINITY, () => 0).damage).toBe(0)
  })
})
