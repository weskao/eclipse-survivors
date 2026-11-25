import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { step } from './step'
import { addXp } from './progression'
import { attack, hit } from './combat'
import { flushKillMilestone, recordKill } from './kill-streak'
import { createFactionBridge } from './content/enemies/integration'
import { emitHitImpact, pushDamageNumber, pushParticle, zigzag } from './fx'
import { seeded, setRandom } from './math'
import { createHero, createState } from './state'
import { tickSpawning } from './spawn'
import type { GameHooks, Mob } from './types'

const hooks = (): GameHooks => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() })
function session() {
  const state = createState()
  state.mode = 'play'
  state.choice = 'ranger'
  state.hero = createHero('ranger')
  state.W = 800
  state.H = 600
  return state
}
function mob(x: number): Mob {
  return { x, y: 0, type: 'slime', hp: 1000, max: 1000, r: 18, speed: 0, dmg: 5, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }
}
beforeEach(() => setRandom(seeded(91)))
afterEach(() => setRandom())

describe('ES3 combat feedback', () => {
  it('keeps an important critical impact readable during a saturated normal-hit burst', () => {
    const s = session()
    emitHitImpact(s, 100, 100, 18, 0, true)
    for (let i = 0; i < 80; i++) emitHitImpact(s, 150 + i, 100, 18, 0, false)
    expect(s.impactWaves.length).toBeLessThanOrEqual(37)
    expect(s.impactWaves.filter(w => w.contact === 'critical')).toHaveLength(1)
  })
})

describe('ES3 power fantasy', () => {
  it('starts chain lightning at one target and grows into a seven-target volley at rank five', () => {
    const damaged = (rank: number) => {
      const s = session()
      s.hero!.skills.chain = rank
      s.hero!.chainCd = 0
      s.mobs = Array.from({ length: 7 }, (_, i) => mob(45 + i * 8))
      attack(s, hooks())
      return s.mobs.filter(e => e.hp < e.max).length
    }
    expect(damaged(1)).toBe(1)
    expect(damaged(5)).toBe(7)
  })
})

describe('ES3 live encounter pacing', () => {
  it('pauses ordinary spawn pulses in the first recovery window without suppressing a scheduled boss', () => {
    const s = session()
    s.time = 42
    s.spawnT = 0
    tickSpawning(s, 0.016, hooks())
    expect(s.mobs).toHaveLength(0)
    s.time = 93
    s.spawnT = 0
    tickSpawning(s, 0.016, hooks())
    expect(s.mobs.filter(e => e.type === 'boss')).toHaveLength(1)
  })
})

describe('ES3 deterministic combat telemetry', () => {
  it('collects real XP and first-upgrade time, samples pressure and DPS on the simulation clock, and repeats with the same seed', () => {
    function scenario() {
      setRandom(seeded(17))
      const s=session(); s.hero!.attack=999; s.hero!.inv=999; s.spawnT=999; s.nextEventAt=Infinity
      s.mobs=[mob(100)]
      const h=hooks()
      s.time=2
      addXp(s,15,h)
      s.damageDealt=50
      for(let i=0;i<100;i++) step(s,.1,{x:0,y:0},h)
      expect(s.combatTelemetry.xpEarned).toBe(15)
      expect(s.combatTelemetry.firstUpgradeAt).toBe(2)
      expect(s.combatTelemetry.samples).toHaveLength(1)
      expect(s.combatTelemetry.samples[0]).toMatchObject({kills:0, xp:15, enemies:1})
      expect(s.combatTelemetry.samples[0]!.dps).toBeGreaterThan(0)
      return s.combatTelemetry
    }
    expect(scenario()).toEqual(scenario())
  })
})

it('preserves damage feedback priorities for incoming harm, critical hits, and ordinary contact', () => {
  const s=session()
  for(let i=0;i<79;i++) s.numberFx.push({x:0,y:0,life:.6,value:1,boss:false,received:true})
  s.numberFx.push({x:0,y:0,life:.8,value:50,boss:false,critical:true})
  pushDamageNumber(s,{x:0,y:0,life:.6,value:1,boss:false})
  expect(s.numberFx.filter(n=>n.received)).toHaveLength(79)
})

it('routes distinct normal, heavy and critical contact sounds and elite defeat to the bounded combat audio path', () => {
  const s=session()
  const contactSfx=vi.fn()
  const h={...hooks(),contactSfx}
  hit(s,mob(40),5,h)
  hit(s,{...mob(45),type:'golem'},5,h)
  hit(s,mob(50),5,{...h,consumeCriticalHit:()=>true})
  hit(s,{...mob(55),hp:1,elite:true},10,h)
  expect(contactSfx.mock.calls.map(([cue])=>cue)).toEqual(['hitNormal','hitHeavy','hitCritical','hitHeavy','eliteKill'])
})
it('uses the same distinct contact audio on authored faction targets', () => {
  const s=session(), bridge=createFactionBridge({random:()=>0})
  const contactSfx=vi.fn()
  const target=bridge.spawn(s,'berserker',70,0)!
  bridge.hitFaction(s,target,5,0,0,{...hooks(),contactSfx,consumeCriticalHit:()=>true})
  expect(contactSfx).toHaveBeenCalledWith('hitCritical')
})
it('emits a distinct milestone variant for every streak tier', () => {
  for (const count of [10,25,50,100,200,500]) {
    const s=session(), sfx=vi.fn(), h={...hooks(),sfx}
    for(let i=0;i<count;i++) recordKill(s)
    flushKillMilestone(s,h)
    expect(sfx).toHaveBeenCalledWith('killStreak',count)
  }
})
it('bounds lightning cosmetics during saturated casts and reuses effect arrays across simulation ticks', () => {
  const s=session()
  for(let i=0;i<100;i++) zigzag(s,0,0,100,i)
  expect(s.lightningFx.length).toBeLessThanOrEqual(48)
  const lightning=s.lightningFx, particles=s.fx, numbers=s.numberFx, waves=s.impactWaves
  s.hero!.attack=999; s.spawnT=999; s.nextEventAt=Infinity
  step(s,.5,{x:0,y:0},hooks())
  expect(s.lightningFx).toBe(lightning)
  expect(s.fx).toBe(particles)
  expect(s.numberFx).toBe(numbers)
  expect(s.impactWaves).toBe(waves)
  expect(lightning).toHaveLength(0)
})

it('classifies actual evolved and elemental hits without changing damage or duplicating the contact', () => {
  const s=session(), a=mob(70), b=mob(80)
  hit(s,a,20,hooks(),s.hero,'elemental')
  hit(s,b,20,hooks(),s.hero,'evolved')
  expect([a.hp,b.hp]).toEqual([980,980])
  expect(s.numberFx.map(n=>n.kind)).toEqual(['elemental','evolved'])
  expect(s.impactWaves.map(w=>w.kind)).toEqual(['elemental','evolved'])
  expect(s.impactWaves).toHaveLength(2)
})
it('bounds direct decorative particles and differentiates heavy enemy death duration', () => {
  const s=session()
  for(let i=0;i<500;i++) pushParticle(s,{x:0,y:0,life:1,max:1,color:'#fff',r:2})
  expect(s.fx.length).toBe(240)
  const a=mob(40), b={...mob(50),type:'golem' as const}, c={...mob(60),elite:true}
  for(const e of [a,b,c]) hit(s,e,1000,hooks())
  expect(b.deathVisual!).toBeGreaterThan(a.deathVisual!)
  expect(c.deathVisual!).toBeGreaterThan(b.deathVisual!)
})
