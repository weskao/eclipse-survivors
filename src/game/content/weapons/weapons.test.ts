import { describe, expect, it, vi } from 'vitest'
import { createContentRegistry } from '../registry'
import { CONTENT_PACKS } from '../packs'
import { WEAPONS_PACK } from '../packs/weapons'
import { seeded } from '../../math'
import { createHero, createState, resetRun } from '../../state'
import { UP } from '../../constants'
import { runtimeOf } from './runtime'
import type { GameHooks, GameState, JobId, Mob } from '../../types'

const hooks: GameHooks = {
  sfx: vi.fn(), message() {}, offerUpgrades() {}, end() {},
}
const mob = (x: number, y = 0, hp = 300, type: Mob['type'] = 'slime'): Mob => ({
  x, y, hp, max: hp, type, r: 16, speed: 0, dmg: 1, phase: 0,
  hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})
function fixture(id: string, job: JobId = 'knight') {
  const s = createState()
  s.mode = 'play'; s.hero = createHero(job)
  s.mobs.push(mob(100))
  const registry = createContentRegistry([WEAPONS_PACK], seeded(12))
  expect(registry.acquire(s, `weapons:${id}`, hooks)).toBe(true)
  return { s, registry }
}
function advance(s: GameState, registry: ReturnType<typeof createContentRegistry>, seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds - 1e-6; t += dt) {
    s.time += dt
    s.worldClock += dt
    registry.tick(s, dt, hooks)
  }
}
function damageFor(id: string, level: number): number {
  const { s, registry } = fixture(id)
  for (let n = 1; n < level; n++) expect(registry.acquire(s, `weapons:${id}`, hooks)).toBe(true)
  advance(s, registry, 5)
  return s.damageDealt
}

describe('weapon arsenal pack registration and compatibility', () => {
  it('registers twelve unique weapons and drawing metadata without altering optional pack manifest', () => {
    const registry = createContentRegistry([WEAPONS_PACK], seeded(7))
    expect(WEAPONS_PACK.id).toBe('weapons')
    expect(registry.abilities).toHaveLength(12)
    expect(new Set(registry.abilities.map(a => a.id)).size).toBe(12)
    for (const ability of registry.abilities) {
      expect(ability.id).toMatch(/^weapons:[a-z-]+$/)
      expect(ability.kind).toBe('weapon')
      expect(ability.maxLevel).toBeGreaterThanOrEqual(4)
      expect(ability.onTick).toBeTypeOf('function')
      expect(ability.icon).toBeTruthy()
    }
    expect(registry.packs[0]?.effects?.length).toBeGreaterThan(0)
    expect(CONTENT_PACKS.map(pack => pack.id)).toContain('weapons')
    expect(UP).toHaveLength(15)
  })

  it.each(['knight', 'ranger', 'wizard'] as JobId[])('is available to %s without changing legacy skills', (job) => {
    const { s, registry } = fixture('shadow-daggers', job)
    expect(registry.eligible(s).map(a => a.id)).toContain('weapons:holy-lance')
    advance(s, registry, 2)
    expect(s.damageDealt).toBeGreaterThan(0)
    expect(s.hero?.skills).toEqual({})
  })

  it('high-level poison clouds extend their AoE moderately without reaching distant enemies', () => {
    const { s, registry } = fixture('poison-cloud')
    for (let i = 1; i < 5; i++) registry.acquire(s, 'weapons:poison-cloud', hooks)
    const edge = mob(239, 0, 500)
    const outside = mob(300, 0, 500)
    s.mobs.push(edge, outside)
    advance(s, registry, 0.25)
    expect(edge.hp).toBeLessThan(edge.max)
    expect(outside.hp).toBe(outside.max)
  })
  it('caps each upgrade and scales damage', () => {
    expect(damageFor('holy-lance', 4)).toBeGreaterThan(damageFor('holy-lance', 1))
    const { s, registry } = fixture('holy-lance')
    for (let i = 0; i < 4; i++) registry.acquire(s, 'weapons:holy-lance', hooks)
    expect(s.content.levels['weapons:holy-lance']).toBe(5)
    expect(registry.acquire(s, 'weapons:holy-lance', hooks)).toBe(false)
  })

  it('keeps all originals untouched when the optional pack is not integrated', () => {
    const r = createContentRegistry([])
    const s = createState()
    s.hero = createHero('ranger')
    expect(r.eligible(s)).toEqual([])
    expect(r.acquire(s, 'weapons:holy-lance', hooks)).toBe(false)
  })
})

describe('real attack mechanics', () => {
  it.each([
    'shadow-daggers', 'holy-lance', 'blood-scythe', 'arcane-mines',
    'bone-spears', 'poison-cloud', 'ricochet-blades', 'spirit-wolves',
    'solar-beam', 'gravity-orbs', 'spectral-bow', 'thorn-chain',
  ])('%s deals live combat damage after acquisition', id => {
    const { s, registry } = fixture(id)
    s.mobs.push(mob(125), mob(150))
    advance(s, registry, 7)
    expect(s.damageDealt).toBeGreaterThan(0)
    expect(s.mobs.some(e => e.hp < e.max)).toBe(true)
  })

  it('daggers re-target separate enemies, not only the first victim', () => {
    const { s, registry } = fixture('shadow-daggers')
    s.mobs.push(mob(110, 35), mob(130, -35))
    advance(s, registry, 4)
    expect(s.mobs.filter(e => e.hp < e.max).length).toBeGreaterThan(1)
  })

  it('lance, bone spears and spectral arrows pierce aligned enemies without tunneling', () => {
    for (const id of ['holy-lance', 'bone-spears', 'spectral-bow']) {
      const { s, registry } = fixture(id)
      s.mobs.splice(0, 1, mob(90), mob(165), mob(240))
      advance(s, registry, 5, 0.033)
      expect(s.mobs.filter(e => e.hp < e.max).length, id).toBeGreaterThanOrEqual(2)
    }
  })

  it('blood scythe is short ranged and heals only after actual hits, capped by missing health', () => {
    const { s, registry } = fixture('blood-scythe')
    s.hero!.hp = s.hero!.max - 12
    advance(s, registry, 1)
    expect(s.hero!.hp).toBeGreaterThan(s.hero!.max - 12)
    expect(s.hero!.hp).toBeLessThanOrEqual(s.hero!.max)
    s.mobs = [mob(900)]
    const hp = s.hero!.hp
    advance(s, registry, 3)
    expect(s.hero!.hp).toBe(hp)
  })

  it('mines arm and explode on a delay; poison clouds apply repeated DOT', () => {
    const mines = fixture('arcane-mines')
    advance(mines.s, mines.registry, 0.15)
    expect(mines.s.damageDealt).toBe(0)
    advance(mines.s, mines.registry, 2.5)
    expect(mines.s.damageDealt).toBeGreaterThan(0)
    const cloud = fixture('poison-cloud')
    advance(cloud.s, cloud.registry, 1.5)
    const first = cloud.s.damageDealt
    advance(cloud.s, cloud.registry, 2.5)
    expect(cloud.s.damageDealt).toBeGreaterThan(first)
  })

  it('ricochets spread between enemies and wolves chase living targets', () => {
    const blades = fixture('ricochet-blades')
    blades.s.mobs.push(mob(130, 25), mob(170, 15))
    advance(blades.s, blades.registry, 4)
    expect(blades.s.mobs.filter(e => e.hp < e.max).length).toBeGreaterThan(1)
    const wolves = fixture('spirit-wolves')
    advance(wolves.s, wolves.registry, 1.5)
    expect(runtimeOf(wolves.s).wolves.length).toBeGreaterThan(0)
    expect(wolves.s.damageDealt).toBeGreaterThan(0)
  })

  it('solar beam charges before firing, and gravity orbs pull enemies', () => {
    const beam = fixture('solar-beam')
    advance(beam.s, beam.registry, 0.25)
    expect(beam.s.damageDealt).toBe(0)
    advance(beam.s, beam.registry, 1.2)
    expect(beam.s.damageDealt).toBeGreaterThan(0)
    const gravity = fixture('gravity-orbs')
    gravity.s.mobs[0]!.x = 160
    advance(gravity.s, gravity.registry, 1.5)
    expect(gravity.s.mobs[0]!.x).toBeLessThan(160)
  })

  it('solar beam strike matches its announced telegraph even if the target moves during charge', () => {
    const { s, registry } = fixture('solar-beam')
    advance(s, registry, 0.15)
    const angle = runtimeOf(s).beamAngle
    expect(Math.abs(angle)).toBeLessThan(0.001)
    // The original target dodges. A different enemy stays in the announced direction.
    s.mobs[0]!.y = 250
    const linedUp = mob(400, 0)
    s.mobs.push(linedUp)
    advance(s, registry, 0.7)
    const beam = runtimeOf(s).beam
    expect(beam).not.toBeNull()
    expect(beam!.ux).toBeGreaterThan(0.99)
    expect(Math.abs(beam!.uy)).toBeLessThan(0.01)
    expect(linedUp.hp).toBeLessThan(linedUp.max)
  })

  it('thorn chain links enemies and periodically spreads damage', () => {
    const { s, registry } = fixture('thorn-chain')
    s.mobs.push(mob(115, 25), mob(150, 5))
    advance(s, registry, 3)
    expect(s.mobs.filter(e => e.hp < e.max).length).toBeGreaterThanOrEqual(2)
  })
})

describe('density, simultaneity, lifecycle and determinism', () => {
  it('supports multiple simultaneous weapons without duplicate death rewards', () => {
    const { s, registry } = fixture('holy-lance')
    for (const id of ['shadow-daggers', 'poison-cloud', 'solar-beam', 'ricochet-blades'])
      expect(registry.acquire(s, `weapons:${id}`, hooks)).toBe(true)
    s.mobs[0]!.hp = 8
    s.mobs.push(mob(140, 10, 10000))
    advance(s, registry, 6)
    expect(s.kill).toBe(1)
    expect(s.stars).toHaveLength(1)
    expect(s.damageDealt).toBeGreaterThan(8)
  })

  it('bounds projectiles, hazards and visual instances with 130 enemies including a boss', () => {
    const { s, registry } = fixture('shadow-daggers')
    for (const ability of registry.abilities) registry.acquire(s, ability.id, hooks)
    s.mobs = Array.from({ length: 130 }, (_, i) =>
      mob(50 + (i % 15) * 15, (i % 13) * 12 - 75, 800, i === 0 ? 'boss' : 'slime'))
    advance(s, registry, 16)
    const runtime = runtimeOf(s)
    expect(runtime.projectiles.length).toBeLessThanOrEqual(64)
    expect(runtime.zones.length).toBeLessThanOrEqual(12)
    expect(runtime.wolves.length).toBeLessThanOrEqual(3)
    expect(s.content.effects.length).toBeLessThanOrEqual(96)
    expect(s.damageDealt).toBeGreaterThan(0)
  })

  it('clears all previous-run objects and timers on reset without leaking to a new run', () => {
    const { s, registry } = fixture('spirit-wolves')
    registry.acquire(s, 'weapons:arcane-mines', hooks)
    advance(s, registry, 1)
    const before = runtimeOf(s)
    expect(before.wolves.length).toBeGreaterThan(0)
    resetRun(s)
    registry.emit(s, { type: 'reset' }, hooks)
    expect(s.content.levels).toEqual({})
    expect(s.content.effects).toEqual([])
    expect(runtimeOf(s)).not.toBe(before)
    expect(runtimeOf(s).wolves).toHaveLength(0)
    advance(s, registry, 1)
    expect(runtimeOf(s).projectiles).toHaveLength(0)
  })

  it('has reproducible outcomes using an injected seed', () => {
    const play = () => {
      const { s } = fixture('arcane-mines')
      const registry = createContentRegistry([WEAPONS_PACK], seeded(77))
      registry.acquire(s, 'weapons:poison-cloud', hooks)
      registry.acquire(s, 'weapons:ricochet-blades', hooks)
      s.mobs.push(mob(120, 40), mob(150, -30))
      advance(s, registry, 4)
      return { damage: s.damageDealt, mobs: s.mobs.map(e => [e.hp, e.x, e.y]), kills: s.kill }
    }
    expect(play()).toEqual(play())
  })
})
