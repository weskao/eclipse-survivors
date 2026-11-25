import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { step } from './step'
import { addXp } from './progression'
import { attack } from './combat'
import { emitHitImpact } from './fx'
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
