import { describe, expect, it } from 'vitest'
import { createContentRegistry } from '../registry'
import { ENEMY_FACTIONS_PACK } from '../packs/enemies'
import { ENEMY_DEFINITIONS } from './definitions'
import {
  createFactionRuntime, spawnFactionEnemy, tickFactionEnemies,
  damageFactionEnemy, cleanupFactionEnemies,
  type FactionArena, type FactionRuntime,
} from './runtime'

function arena(runtime: FactionRuntime, hero = { x: 0, y: 0 }): FactionArena {
  return { runtime, hero, width: 960, height: 640, onHeroDamage: () => true }
}
function advance(a: FactionArena, frames = 50): void {
  for (let i = 0; i < frames; i++) tickFactionEnemies(a, 0.05)
}

describe('enemy factions metadata and isolated registration', () => {
  it('registers ten globally unique namespaced enemies without touching the shared pack manifest', () => {
    const registry = createContentRegistry([ENEMY_FACTIONS_PACK])
    expect(registry.packs).toHaveLength(1)
    expect(ENEMY_FACTIONS_PACK.enemies).toHaveLength(10)
    expect(new Set(ENEMY_FACTIONS_PACK.enemies!.map(e => e.id)).size).toBe(10)
    expect(ENEMY_FACTIONS_PACK.enemies!.every(e => e.id.startsWith('factions:'))).toBe(true)
  })
  it('supplies art, audio and telegraph cues for every faction enemy', () => {
    for (const def of Object.values(ENEMY_DEFINITIONS)) {
      expect(def.spriteKey.length).toBeGreaterThan(0)
      expect(def.attackCue.length).toBeGreaterThan(0)
      expect(def.deathCue.length).toBeGreaterThan(0)
      expect(def.telegraphColor).toMatch(/^#/)
    }
  })
})

describe('deterministic actor state machines', () => {
  it('shadow assassin flanks before a telegraphed ambush', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'shadow-assassin', 160, 0)!
    const a = arena(r)
    advance(a, 4)
    expect(Math.abs(e.y)).toBeGreaterThan(0)
    expect(['windup', 'attack', 'recover']).toContain(e.state)
  })
  it('necromancer respects living, lifetime and global summon caps', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'necromancer', 130, 0)!
    advance(arena(r), 1000)
    expect(e.summonsMade).toBeLessThanOrEqual(8)
    expect(r.enemies.filter(m => m.summonedBy === e.id && m.hp > 0).length).toBeLessThanOrEqual(4)
    expect(r.enemies.length).toBeLessThanOrEqual(130)
  })
  it('dark archer needs line of sight to fire, then launches a ranged projectile', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'dark-archer', 230, 0)!
    e.speed = 0
    const a = { ...arena(r), lineOfSight: () => false }
    advance(a, 90)
    expect(r.projectiles).toHaveLength(0)
    a.lineOfSight = () => true
    advance(a, 25)
    expect(r.projectiles.length).toBeGreaterThan(0)
  })
  it('plague carrier creates finite poison zones with bounded damage ticks', () => {
    const r = createFactionRuntime()
    spawnFactionEnemy(r, 'plague-carrier', 90, 0)
    const statuses: string[] = []
    const a = { ...arena(r), onHeroDamage: (_: number, effect: { status?: string }) => {
      statuses.push(effect.status ?? ''); return true
    } }
    advance(a, 40)
    expect(statuses).toContain('poison')
    expect(r.zones.length).toBeLessThanOrEqual(64)
    advance(a, 80)
    expect(r.zones.length).toBeLessThanOrEqual(64)
  })
  it('shield guardian reduces only frontal damage, never all damage', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'shield-guardian', 90, 0)!
    tickFactionEnemies(arena(r), 0.05)
    const front = damageFactionEnemy(r, e, 100, 0, 0)
    const back = damageFactionEnemy(r, e, 100, 180, 0)
    expect(front).toBeGreaterThan(0)
    expect(front).toBeLessThan(back)
  })
  it('phantom phasing is temporary and cannot make the enemy permanently invulnerable', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'phantom', 115, 0)!
    tickFactionEnemies(arena(r), 0.05)
    expect(e.state).toBe('phase')
    expect(damageFactionEnemy(r, e, 40, 0, 0)).toBe(0)
    advance(arena(r), 20)
    expect(e.state).not.toBe('phase')
    expect(damageFactionEnemy(r, e, 40, 0, 0)).toBeGreaterThan(0)
  })
  it('fire imp explosion arms visibly before inflicting damage', () => {
    const r = createFactionRuntime()
    spawnFactionEnemy(r, 'fire-imp', 120, 0)
    let damage = 0
    const a = { ...arena(r), onHeroDamage: () => { damage++; return true } }
    advance(a, 12)
    expect(damage).toBe(0)
    advance(a, 50)
    expect(damage).toBeGreaterThan(0)
  })
  it('frost wraith projectiles report freeze rather than poison', () => {
    const r = createFactionRuntime()
    spawnFactionEnemy(r, 'frost-wraith', 180, 0)
    const statuses: string[] = []
    const a = { ...arena(r), onHeroDamage: (_: number, effect: { status?: string }) => {
      statuses.push(effect.status ?? ''); return true
    } }
    advance(a, 70)
    expect(statuses).toContain('freeze')
  })
  it('injured berserkers gain movement speed', () => {
    const r1 = createFactionRuntime(), r2 = createFactionRuntime()
    const calm = spawnFactionEnemy(r1, 'berserker', 310, 0)!
    const rage = spawnFactionEnemy(r2, 'berserker', 310, 0)!
    calm.hp = calm.max
    rage.hp = rage.max * 0.3
    tickFactionEnemies(arena(r1), 0.05)
    tickFactionEnemies(arena(r2), 0.05)
    expect(rage.x).toBeLessThan(calm.x)
  })
  it('crystal sentinel commits to a telegraphed line instead of tracking hero after aim lock', () => {
    const r = createFactionRuntime()
    spawnFactionEnemy(r, 'crystal-sentinel', 250, 0)
    let damage = 0
    const hero = { x: 0, y: 0 }
    const a = { ...arena(r, hero), onHeroDamage: () => { damage++; return true } }
    advance(a, 2)
    hero.y = 220
    advance(a, 40)
    expect(damage).toBe(0)
  })
  it('ranged units cannot attack when outside a visible encounter or through blocked sight', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'crystal-sentinel', 700, 0)!
    e.speed = 0
    const a = { ...arena(r), width: 360, height: 640 }
    advance(a, 100)
    expect(r.projectiles).toHaveLength(0)
    expect(e.state).toBe('approach')
  })
})

describe('elite affixes, rewards and high-density safety', () => {
  it('armored absorbs a portion; swift moves faster; all six affixes can spawn', () => {
    const r = createFactionRuntime()
    const base = spawnFactionEnemy(r, 'berserker', 400, 0)!
    const armored = spawnFactionEnemy(r, 'berserker', 400, 0, { affix: 'armored' })!
    const swift = spawnFactionEnemy(r, 'berserker', 400, 0, { affix: 'swift' })!
    expect(damageFactionEnemy(r, armored, 40, 0, 0)).toBeLessThan(damageFactionEnemy(r, base, 40, 0, 0))
    tickFactionEnemies(arena(r), 0.05)
    expect(swift.x).toBeLessThan(base.x)
    for (const affix of ['explosive', 'vampiric', 'frozen', 'arcane'] as const)
      expect(spawnFactionEnemy(r, 'dark-archer', 200, 0, { affix })?.affix).toBe(affix)
  })
  it('vampiric heals only on a confirmed damaging attack and never over max HP', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'berserker', 45, 0, { affix: 'vampiric' })!
    e.hp = e.max - 10
    const a = { ...arena(r), onHeroDamage: () => false }
    advance(a, 30)
    expect(e.hp).toBe(e.max - 10)
    a.onHeroDamage = () => true
    advance(a, 70)
    expect(e.hp).toBeGreaterThan(e.max - 10)
    expect(e.hp).toBeLessThanOrEqual(e.max)
  })
  it('explosive death leaves an armed hazard, frozen death applies chill, arcane emits extra projectiles', () => {
    const r = createFactionRuntime()
    const ex = spawnFactionEnemy(r, 'fire-imp', 50, 0, { affix: 'explosive' })!
    damageFactionEnemy(r, ex, ex.max + 1, 0, 0)
    expect(r.zones.some(z => z.status === 'burn' && z.delay > 0)).toBe(true)
    const ice = spawnFactionEnemy(r, 'frost-wraith', 60, 0, { affix: 'frozen' })!
    damageFactionEnemy(r, ice, ice.max + 1, 0, 0)
    expect(r.zones.some(z => z.status === 'freeze')).toBe(true)
    const arc = spawnFactionEnemy(r, 'dark-archer', 160, 0, { affix: 'arcane' })!
    arc.speed = 0
    advance(arena(r), 20)
    expect(r.projectiles.filter(p => p.sourceId === arc.id).length).toBeGreaterThanOrEqual(2)
  })
  it('a dying enemy delivers reward exactly once and cleanup removes dead actors', () => {
    const r = createFactionRuntime()
    const e = spawnFactionEnemy(r, 'shadow-assassin', 40, 0)!
    const rewards: number[] = []
    const onReward = (reward: { xp: number }) => rewards.push(reward.xp)
    expect(damageFactionEnemy(r, e, e.max + 5, 0, 0, onReward)).toBeGreaterThan(0)
    expect(damageFactionEnemy(r, e, 15, 0, 0, onReward)).toBe(0)
    expect(rewards).toHaveLength(1)
    expect(rewards[0]).toBeGreaterThan(0)
    cleanupFactionEnemies(r)
    expect(r.enemies).toHaveLength(0)
  })
  it('caps dense scenes, projectiles and zones without per-frame global pathfinding', () => {
    const r = createFactionRuntime()
    for (let i = 0; i < 180; i++) spawnFactionEnemy(r, 'fire-imp', 90 + i % 7, i % 9)
    expect(r.enemies).toHaveLength(130)
    advance(arena(r), 220)
    expect(r.enemies.length).toBeLessThanOrEqual(130)
    expect(r.projectiles.length).toBeLessThanOrEqual(100)
    expect(r.zones.length).toBeLessThanOrEqual(64)
  })
  it('seedless identical input sequences produce identical state and damage events', () => {
    const scenario = () => {
      const r = createFactionRuntime()
      for (const kind of Object.keys(ENEMY_DEFINITIONS) as (keyof typeof ENEMY_DEFINITIONS)[])
        spawnFactionEnemy(r, kind, 180, 0)
      const events: string[] = []
      const a = { ...arena(r), onHeroDamage: (damage: number, fx: { status?: string }) => {
        events.push(damage + ':' + (fx.status ?? '')); return true
      } }
      advance(a, 140)
      return { runtime: r, events }
    }
    expect(scenario()).toEqual(scenario())
  })
})
