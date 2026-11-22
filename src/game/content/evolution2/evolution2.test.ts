import { describe, expect, it, vi } from 'vitest'
import { createContentRegistry, MAX_CONTENT_EFFECTS } from '../registry'
import { createHero, createState, resetRun } from '../../state'
import { applyUpgrade } from '../../progression'
import { EVOLUTIONS, eligibleEvolutions } from '../../evolutions'
import type { ContentId, GameHooks, GameState, Mob, UpgradeId } from '../../types'
import { EVOLUTION2_PACK } from '../packs/evolution2'
import { EVOLUTION2_RECIPES } from './recipes'
import { EVOLUTION2_CUES } from './cues'

const hooks: GameHooks = { sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }
const registry = createContentRegistry([EVOLUTION2_PACK], () => 0.5)
function game(): GameState {
  const state = createState()
  state.hero = createHero('knight')
  state.mode = 'play'
  return state
}
function enemy(x = 70, y = 0, hp = 1000): Mob {
  return { x, y, hp, max: hp, r: 18, type: 'slime', speed: 0, dmg: 0,
    phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }
}
function unlock(state: GameState, index: number): ContentId {
  const ability = EVOLUTION2_PACK.abilities![index]!
  for (const requirement of ability.requires!) {
    if (requirement.id.includes(':')) state.content.levels[requirement.id as `${string}:${string}`] = requirement.level
    else state.hero!.skills[requirement.id as UpgradeId] = requirement.level
  }
  return ability.id
}

describe('Evolution2 independent ContentPack', () => {
  it('registers exactly twelve distinct legendary one-level evolutions and visual/audio contracts', () => {
    expect(EVOLUTION2_PACK.id).toBe('evolution2')
    expect(EVOLUTION2_PACK.abilities).toHaveLength(12)
    expect(EVOLUTION2_PACK.effects).toHaveLength(12)
    const ids = EVOLUTION2_PACK.abilities!.map(a => a.id)
    expect(new Set(ids).size).toBe(12)
    expect(Object.keys(EVOLUTION2_CUES)).toHaveLength(12)
    for (const ability of EVOLUTION2_PACK.abilities!) {
      expect(ability).toMatchObject({ kind: 'evolution', rarity: 'legendary', maxLevel: 1 })
      expect(ability.isEvolution).toBe(true)
      expect(ability.cooldownSeconds).toBeGreaterThanOrEqual(1)
      expect(ability.requires).toHaveLength(2)
      expect(ability.requires![0]!.id).toMatch(/^weapons:/)
      expect(ability.requirements).toContain('Lv.')
      expect(ability.onTick).toBeTypeOf('function')
      expect(EVOLUTION2_CUES[ability.id]).toBeDefined()
    }
    expect(EVOLUTION2_RECIPES.map(recipe => recipe.title)).toEqual([
      'Nightfall Torrent', 'Dawn Judgment', 'Crimson Reaper', 'Singularity Minefield',
      'Toxic Permafrost', 'Infinite Rebound', 'Wild Hunt', 'Solar Tempest',
      'Celestial Collapse', 'Spectral Volley', 'Bonefire Barrage', 'Verdant Snare',
    ])
  })

  it('does not assume optional weapon packs are installed or auto-grant upgrades', () => {
    const state = game()
    state.hero!.skills.haste = 5
    expect(registry.eligible(state)).toEqual([])
    expect(registry.acquire(state, 'evolution2:nightfall-torrent', hooks)).toBe(false)
    expect(state.content.levels).toEqual({})
  })

  it('checks exact levels and does not consume the required weapon or passive', () => {
    for (let i = 0; i < 12; i++) {
      const state = game()
      const id = unlock(state, i)
      const ability = EVOLUTION2_PACK.abilities![i]!
      const weapon = ability.requires![0]!
      const passive = ability.requires![1]!
      state.content.levels[weapon.id as `${string}:${string}`] = weapon.level - 1
      expect(registry.eligible(state).some(a => a.id === id)).toBe(false)
      state.content.levels[weapon.id as `${string}:${string}`] = weapon.level
      state.hero!.skills[passive.id as UpgradeId] = passive.level - 1
      expect(registry.acquire(state, id, hooks)).toBe(false)
      state.hero!.skills[passive.id as UpgradeId] = passive.level
      expect(registry.acquire(state, id, hooks)).toBe(true)
      expect(state.content.levels[weapon.id as `${string}:${string}`]).toBe(weapon.level)
      expect(state.hero!.skills[passive.id as UpgradeId]).toBe(passive.level)
      expect(state.content.levels[id as `${string}:${string}`]).toBe(1)
      expect(registry.acquire(state, id, hooks)).toBe(false)
    }
  })

  it('rejects invalid choices and retains the original five evolutions', () => {
    const state = game()
    expect(EVOLUTIONS).toHaveLength(5)
    expect(registry.acquire(state, 'evolution2:missing', hooks)).toBe(false)
    expect(applyUpgrade(state, 'evolution2:nightfall-torrent', hooks, registry)).toBe(false)
    state.hero!.skills.frost = 3
    state.hero!.skills.chain = 3
    expect(eligibleEvolutions(state.hero!).map(a => a.id)).toContain('frozen-thunderstorm')
    expect(state.hero!.evolutions['frozen-thunderstorm']).toBeUndefined()
  })

  it('unlocks independent combinations in defined order, and resets all of them each run', () => {
    const state = game()
    const first = unlock(state, 0)
    const last = unlock(state, 11)
    expect(registry.eligible(state).filter(a => a.id === first || a.id === last).map(a => a.id)).toEqual([first, last])
    expect(registry.acquire(state, first, hooks)).toBe(true)
    expect(registry.acquire(state, last, hooks)).toBe(true)
    expect(registry.eligible(state).some(a => a.id === first || a.id === last)).toBe(false)
    resetRun(state)
    expect(state.content).toEqual({ levels: {}, cooldowns: {}, effects: [] })
    expect(registry.eligible(state)).toEqual([])
  })

  it('all twelve abilities perform bounded real attacks or healing, with visual and audio cues', () => {
    for (let i = 0; i < 12; i++) {
      const state = game()
      const id = unlock(state, i)
      const targets = [enemy(60), enemy(105, 18), enemy(145, -20)]
      state.mobs.push(...targets)
      state.hero!.hp = state.hero!.max - 40
      expect(registry.acquire(state, id, hooks)).toBe(true)
      vi.mocked(hooks.sfx).mockClear()
      const before = targets.reduce((sum, target) => sum + target.hp, 0)
      registry.tick(state, 0.1, hooks)
      const after = targets.reduce((sum, target) => sum + target.hp, 0)
      expect(after < before || state.hero!.hp > state.hero!.max - 40 || state.shots.length > 0).toBe(true)
      expect(vi.mocked(hooks.sfx)).toHaveBeenCalled()
      expect(state.content.effects.length).toBeGreaterThan(0)
      expect(state.content.effects.length).toBeLessThanOrEqual(MAX_CONTENT_EFFECTS)
      expect(state.damageDealt).toBeGreaterThanOrEqual(0)
    }
  })

  it('respects independent cooldowns and does not tick an evolution every frame', () => {
    const state = game()
    const id = unlock(state, 0)
    const target = enemy()
    state.mobs = [target]
    registry.acquire(state, id, hooks)
    registry.tick(state, 0.016, hooks)
    const hp = target.hp
    registry.tick(state, 0.016, hooks)
    expect(target.hp).toBe(hp)
    expect(state.content.cooldowns[id as `${string}:${string}`]).toBeGreaterThan(0)
    registry.tick(state, 9, hooks)
    expect(target.hp).toBeLessThan(hp)
  })

  it('limits spawned projectiles, effects and work during heavy enemy crowds', () => {
    const state = game()
    state.mobs = Array.from({ length: 130 }, (_, i) => enemy(80 + (i % 16) * 13, (i % 9) * 17, 5000))
    for (let i = 0; i < 12; i++) registry.acquire(state, unlock(state, i) as `${string}:${string}`, hooks)
    for (let frame = 0; frame < 8; frame++) registry.tick(state, 2.5, hooks)
    expect(state.shots.length).toBeLessThanOrEqual(80)
    expect(state.content.effects.length).toBeLessThanOrEqual(MAX_CONTENT_EFFECTS)
    expect(state.mobs).toHaveLength(130)
  })
})


describe('Evolution2 combat remediation regressions', () => {
  it('never attacks or emits effects while paused, and can fire when gameplay resumes', () => {
    const state = game()
    const id = unlock(state, 0)
    expect(registry.acquire(state, id, hooks)).toBe(true)
    const target = enemy(60, 0, 1000)
    state.mobs = [target]
    state.mode = 'paused'
    const before = state.damageDealt
    registry.tick(state, 0.016, hooks)
    expect(target.hp).toBe(1000)
    expect(state.damageDealt).toBe(before)
    expect(state.content.effects).toHaveLength(0)
    state.mode = 'play'
    registry.tick(state, 0.016, hooks)
    expect(target.hp).toBeLessThan(1000)
  })

  it('fills only available volley slots and never exceeds eighty shots', () => {
    const state = game()
    const id = unlock(state, 9)
    expect(registry.acquire(state, id, hooks)).toBe(true)
    state.mobs = [enemy(120)]
    state.shots = Array.from({ length: 79 }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 1, d: 1, kind: 'arrow' as const, r: 6,
    }))
    registry.tick(state, 0.016, hooks)
    expect(state.shots).toHaveLength(80)
    expect(state.shots[79]!.vx).toBeGreaterThan(0)
    registry.tick(state, 10, hooks)
    expect(state.shots).toHaveLength(80)
  })

  it('prioritizes nearest AoE targets rather than crowd insertion order', () => {
    const state = game()
    const id = unlock(state, 3)
    expect(registry.acquire(state, id, hooks)).toBe(true)
    const farther = Array.from({ length: 12 }, (_, i) => enemy(143 + i, 0, 1000))
    const center = enemy(60, 0, 1000)
    state.mobs = [...farther, center]
    registry.tick(state, 0.016, hooks)
    expect(center.hp).toBeLessThan(1000)
    expect(state.mobs.filter(mob => mob.hp < 1000).length).toBeLessThanOrEqual(12)
  })

  it('attributes real damage and single kills to the combat hook without replay', () => {
    const state = game()
    const id = unlock(state, 0)
    const observed: string[] = []
    const observedHooks: GameHooks = {
      ...hooks,
      content: (_game, event) => observed.push(event.type),
    }
    expect(registry.acquire(state, id, observedHooks)).toBe(true)
    state.mobs = [enemy(60, 0, 1)]
    registry.tick(state, 0.016, observedHooks)
    expect(observed).toEqual(['hit', 'kill'])
    expect(state.kill).toBe(1)
    expect(state.damageDealt).toBe(1)
    registry.tick(state, 0.016, observedHooks)
    expect(observed).toEqual(['hit', 'kill'])
    expect(registry.acquire(state, id, observedHooks)).toBe(false)
  })

  it('provides actual defensive invulnerability for Dawn Judgment while active', () => {
    const state = game()
    const id = unlock(state, 1)
    state.mobs = [enemy(70, 0)]
    expect(registry.acquire(state, id, hooks)).toBe(true)
    registry.tick(state, 0.016, hooks)
    expect(state.hero!.inv).toBeGreaterThan(0)
  })
})
