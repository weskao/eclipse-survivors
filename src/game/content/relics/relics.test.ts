import { describe, expect, it } from 'vitest'
import { createContentRegistry } from '../registry'
import { createHero, createState, resetRun } from '../../state'
import { seeded } from '../../math'
import { RELICS_PACK } from '../packs/relics'
import { RELICS, RELIC_BY_ID, RELIC_CUES, TREASURE_UI, type RelicId } from './catalog'
import {
  acquireRelic, banishTreasure, calculateRelicAttack, calculateRelicIncoming,
  claimTreasure, hasRelic, inventorySnapshot, onRelicEvent, openTreasure,
  relicBonuses, relicPickupRadius, rerollTreasure, resetRelics, tickRelicRecovery,
  RELIC_CAPACITY,
} from './runtime'

function setup() {
  const state = createState()
  state.hero = createHero('knight')
  state.mode = 'play'
  return state
}

it('defines 24 normal / 8 cursed functional relics with four rarity tiers and exportable UI cues', () => {
  expect(RELICS).toHaveLength(32)
  expect(RELICS.filter(r => !r.cursed)).toHaveLength(24)
  expect(RELICS.filter(r => r.cursed)).toHaveLength(8)
  expect(new Set(RELICS.map(r => r.id)).size).toBe(32)
  expect(new Set(RELICS.map(r => r.rarity))).toEqual(new Set(['common', 'rare', 'epic', 'legendary']))
  for (const relic of RELICS) {
    expect(RELIC_BY_ID.get(relic.id)).toBe(relic)
    expect(relic.maxStacks).toBeGreaterThan(0)
    expect(relic.weight).toBeGreaterThan(0)
    expect(Object.values(relic.bonuses).some(v => v !== 0)).toBe(true)
    if (relic.cursed) expect(Object.entries(relic.bonuses).some(([key, value]) =>
      key === 'incoming' || key === 'healingPenalty' ? value > 0
        : ['maxHpRate','speed','regeneration','resistance'].includes(key) && value < 0)).toBe(true)
  }
  expect(TREASURE_UI.hotkeys).toEqual(['Digit1','Digit2','Digit3'])
  expect(TREASURE_UI.touchMinSizePx).toBeGreaterThanOrEqual(44)
  expect(new Set(Object.values(RELIC_CUES)).size).toBe(5)
})

it('acquires relic stats without changing legacy XP, skills, or ContentRuntime levels', () => {
  const s = setup(), h = s.hero!
  const damage = h.damage, speed = h.speed, xp = h.xp
  expect(acquireRelic(s,'relics:ashen-heart')).toBe(true)
  expect(h.damage).toBeCloseTo(damage * 1.3)
  expect(h.max).toBeLessThan(createHero('knight').max)
  expect(acquireRelic(s,'relics:pilgrim-compass')).toBe(true)
  expect(h.speed).toBeCloseTo(speed * 1.08)
  expect(h.xp).toBe(xp)
  expect(h.skills).toEqual({})
  expect(s.content.levels).toEqual({})
})

it('rejects invalid/unique duplicates and enforces bounded inventory plus stack limits', () => {
  const s = setup()
  expect(acquireRelic(s,'relics:celestial-lens')).toBe(true)
  expect(acquireRelic(s,'relics:celestial-lens')).toBe(false)
  expect(acquireRelic(s,'relics:unknown' as RelicId)).toBe(false)
  for (let i=0;i<3;i++) expect(acquireRelic(s,'relics:frost-rune')).toBe(true)
  expect(acquireRelic(s,'relics:frost-rune')).toBe(false)
  for (const relic of RELICS) {
    if (inventorySnapshot(s).items.length === RELIC_CAPACITY) break
    acquireRelic(s,relic.id)
  }
  const items = inventorySnapshot(s).items
  expect(items).toHaveLength(RELIC_CAPACITY)
  expect(items.every(item => item.stacks <= RELIC_BY_ID.get(item.id)!.maxStacks)).toBe(true)
  const missing = RELICS.find(r => !items.some(item => item.id === r.id))!
  expect(acquireRelic(s,missing.id)).toBe(false)
})

it('draws seeded weighted rewards without duplicates or repeated chest claims', () => {
  const a = setup(), b = setup()
  const offer = openTreasure(a,7,seeded(42))!
  expect(offer).toEqual(openTreasure(b,7,seeded(42)))
  expect(offer.options).toHaveLength(3)
  expect(new Set(offer.options).size).toBe(3)
  expect(openTreasure(a,7,seeded(1))).toBeNull()
  expect(claimTreasure(a,8,offer.options[0]!)).toBe(false)
  expect(claimTreasure(a,7,'relics:bogus')).toBe(false)
  expect(claimTreasure(a,7,offer.options[0]!)).toBe(true)
  expect(claimTreasure(a,7,offer.options[0]!)).toBe(false)
  expect(openTreasure(a,7,seeded(1))).toBeNull()
  expect(openTreasure(a,6,seeded(1))).toBeNull()
  expect(openTreasure(a,8,seeded(1))).not.toBeNull()
  expect(inventorySnapshot(a).items).toHaveLength(1)
})

it('reroll/banish budgets and exclusions prevent exploit and invalid rewards', () => {
  const s = setup()
  const before = openTreasure(s,1,seeded(1))!
  const banned = before.options[0]!
  expect(banishTreasure(s,1,banned)).toBe(true)
  expect(banishTreasure(s,1,banned)).toBe(false)
  const after = rerollTreasure(s,1,seeded(2))!
  expect(after.options).not.toContain(banned)
  expect(after.options.some(id => before.options.includes(id))).toBe(false)
  expect(inventorySnapshot(s).rerolls).toBe(1)
  expect(rerollTreasure(s,1,seeded(3))).not.toBeNull()
  expect(rerollTreasure(s,1,seeded(4))).toBeNull()
  expect(claimTreasure(s,1,banned)).toBe(false)
  expect(acquireRelic(s,banned)).toBe(false)
})

it('applies elemental, summon synergy, moving, crit, execution and projectiles in attack adapter', () => {
  const s = setup()
  for (const id of ['storm-crown','wolf-totem','shadow-chain','ritual-dagger',
    'celestial-lens','echo-gem','grave-bell','battle-standard'] as const)
    acquireRelic(s,`relics:${id}`)
  const hit = calculateRelicAttack(s,100,{element:'lightning',source:'summon',moving:true,
    targetHpFraction:0.05},()=>0)
  expect(hit.damage).toBeGreaterThan(200)
  expect(hit.critical).toBe(true)
  expect(hit.execute).toBe(true)
  expect(hit.pierce).toBe(2)
  expect(hit.extraProjectile).toBe(true)
  expect(calculateRelicAttack(s,-3,{},()=>0).damage).toBe(0)
  expect(calculateRelicAttack(s,100,{boss:true,targetHpFraction:0.01},()=>1).execute).toBe(false)
})

it('reduces/dodges/reflects damage with conditional protection and curse penalty', () => {
  const s = setup()
  for (const id of ['guardian-sigil','bulwark-ring','mirror-charm','phantom-boots'] as const)
    acquireRelic(s,`relics:${id}`)
  expect(calculateRelicIncoming(s,100,()=>0)).toEqual({damage:0,dodged:true,reflected:0})
  const high = calculateRelicIncoming(s,100,()=>1)
  s.hero!.hp = s.hero!.max * 0.2
  const low = calculateRelicIncoming(s,100,()=>1)
  expect(low.damage).toBeLessThan(high.damage)
  expect(low.reflected).toBeCloseTo(low.damage * 0.2)
  acquireRelic(s,'relics:doom-mask')
  expect(calculateRelicIncoming(s,100,()=>1).damage).toBeGreaterThan(low.damage)
})

it('heals on real hit and kill damage, capped and penalized by curses', () => {
  const s = setup()
  acquireRelic(s,'relics:vampire-fang')
  acquireRelic(s,'relics:merciful-seed')
  s.hero!.hp=20
  const mob = {type:'slime',hp:0} as never
  onRelicEvent(s,{type:'hit',mob,damage:100})
  expect(s.hero!.hp).toBeCloseTo(22)
  onRelicEvent(s,{type:'kill',mob,damage:100})
  expect(s.hero!.hp).toBeCloseTo(23.2)
  acquireRelic(s,'relics:blood-coin')
  onRelicEvent(s,{type:'hit',mob,damage:100})
  expect(s.hero!.hp).toBeCloseTo(24.2)
  s.hero!.hp=1
  onRelicEvent(s,{type:'hit',mob,damage:100000})
  expect(s.hero!.hp).toBeLessThanOrEqual(1+s.hero!.max*0.08)
})

it('bounds regen dt, respects pause and curse, and expands pickup range', () => {
  const s=setup()
  acquireRelic(s,'relics:dawn-feather')
  s.hero!.hp=25
  tickRelicRecovery(s,10)
  expect(s.hero!.hp).toBeCloseTo(25.2)
  s.mode='paused'
  tickRelicRecovery(s,0.1)
  expect(s.hero!.hp).toBeCloseTo(25.2)
  s.mode='play'
  acquireRelic(s,'relics:hollow-idol')
  for(let i=0;i<300;i++) tickRelicRecovery(s,0.1)
  expect(s.hero!.hp).toBeGreaterThanOrEqual(1)
  expect(relicPickupRadius(s,20)).toBe(20)
  acquireRelic(s,'relics:magnetic-amulet')
  expect(relicPickupRadius(s,20)).toBeCloseTo(26)
})

it('registers ContentPack without unsupported fields, cleans per-run inventory on reset', () => {
  const s=setup()
  const registry=createContentRegistry([RELICS_PACK],seeded(11))
  expect(registry.abilities).toEqual([])
  expect(registry.packs.map(p=>p.id)).toEqual(['relics'])
  expect(registry.eligible(s)).toEqual([])
  const hooks={sfx(){},message(){},offerUpgrades(){},end(){}}
  expect(registry.acquire(s,'relics:vampire-fang',hooks)).toBe(false)
  acquireRelic(s,'relics:vampire-fang')
  expect(relicBonuses(s).lifeSteal).toBeGreaterThan(0)
  resetRun(s)
  registry.emit(s,{type:'reset'},hooks)
  expect(inventorySnapshot(s).items).toEqual([])
  expect(s.content.levels).toEqual({})
  expect(s.hero!.xp).toBe(0)
  expect(openTreasure(s,1,seeded(11))).not.toBeNull()
  resetRelics(s)
  expect(inventorySnapshot(s).pending).toBeNull()
  expect(hasRelic(s,'relics:vampire-fang')).toBe(false)
})
