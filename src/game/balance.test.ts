import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from './config'
import { JOB, MAX_LEVEL, MAX_MOBS, BOSS_TIME, DURATION } from './constants'
import { HERO_DEFINITIONS } from './content/heroes'
import { WEAPON_SPECS } from './content/weapons/abilities'
import { BOSS_ATTACKS, BOSS_DEFINITIONS } from './content/bosses/definitions'
import { ENEMY_DEFINITIONS } from './content/enemies/definitions'
import { RELICS } from './content/relics/catalog'
import { OBJECTIVE_MODES } from './content/modes/definitions'
import { MODES } from '../meta/modes'
import { rollEventKind } from './events'
import { createHero, createState } from './state'
import { addXp } from './progression'
import { spawnInterval, spawnMob } from './spawn'

const hooks = { sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }

describe('single-source numerical game balance', () => {
  it('keeps all six hero starting stats in one typed configuration', () => {
    for (const id of ['knight', 'ranger', 'wizard'] as const) {
      const expected = BALANCE.heroes.classic[id]
      expect(createHero(id)).toMatchObject({
        hp: expected.hp, max: expected.hp, damage: expected.damage,
        speed: expected.speed, delay: expected.delay, range: expected.range,
      })
      expect(JOB[id]).toMatchObject(expected)
    }
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const)
      expect(HERO_DEFINITIONS[id].stats).toEqual(BALANCE.heroes.special[id])
  })

  it('centralizes XP thresholds, rarity weights and the full upgrade level caps', () => {
    expect(createHero('knight').need).toBe(BALANCE.progression.initialXp)
    const state = createState()
    state.hero = createHero('knight')
    state.mode = 'play'
    addXp(state, state.hero.need, hooks)
    expect(state.hero.need).toBe(Math.round(BALANCE.progression.initialXp
      * BALANCE.progression.growthMultiplier + BALANCE.progression.growthFlat))
    expect(MAX_LEVEL).toEqual(BALANCE.skills.maxLevels)
    expect(Object.values(BALANCE.progression.rarityWeights).every(weight => weight > 0)).toBe(true)
  })

  it('keeps chest and shrine rolls normalized and based on their configured weights', () => {
    const weights = BALANCE.events.weights
    expect(Object.values(weights).reduce((sum, n) => sum + n, 0)).toBeCloseTo(1, 9)
    expect(rollEventKind(() => 0)).toBe('chest')
    expect(rollEventKind(() => weights.chest + 0.001)).toBe('shrine')
    expect(rollEventKind(() => 0.99999)).toBe('challenge')
  })

  it('keeps boss telegraphs, expanded factions and relic effects synchronized with JSON', () => {
    expect(BOSS_ATTACKS).toEqual(BALANCE.bosses.attacks)
    for (const id of Object.keys(BOSS_DEFINITIONS) as Array<keyof typeof BOSS_DEFINITIONS>)
      expect(BOSS_DEFINITIONS[id].health).toBe(BALANCE.bosses.health[id])
    for (const id of Object.keys(ENEMY_DEFINITIONS) as Array<keyof typeof ENEMY_DEFINITIONS>)
      expect(ENEMY_DEFINITIONS[id]).toMatchObject(BALANCE.enemies.factions[id])
    expect(RELICS).toHaveLength(Object.keys(BALANCE.relics.items).length)
    for (const relic of RELICS) {
      const slug = relic.id.replace(/^relics:/, '') as keyof typeof BALANCE.relics.items
      expect(relic.maxStacks).toBe(BALANCE.relics.items[slug].maxStacks)
      expect(relic.bonuses).toEqual(BALANCE.relics.items[slug].bonuses)
      expect(relic.weight).toBeCloseTo(
        BALANCE.relics.rarityWeights[relic.rarity] * (relic.cursed ? BALANCE.relics.curseWeightMultiplier : 1))
    }
  })

  it('keeps all mode difficulty multipliers, encounter timing and rewards in JSON', () => {
    for (const id of ['quick', 'standard', 'endless', 'challenge'] as const)
      expect(MODES[id]).toMatchObject(BALANCE.modes.classic[id])
    for (const id of Object.keys(OBJECTIVE_MODES) as Array<keyof typeof OBJECTIVE_MODES>)
      expect(OBJECTIVE_MODES[id]).toMatchObject(BALANCE.modes.objectives[id])
  })

  it('rejects impossible or malformed numeric balance inputs', () => {
    const nonnegative = (value: unknown): void => {
      if (typeof value === 'number') {
        expect(Number.isFinite(value)).toBe(true)
      } else if (value && typeof value === 'object') {
        for (const entry of Object.values(value)) nonnegative(entry)
      }
    }
    nonnegative(BALANCE)
    expect(Object.values(BALANCE.events.weights).reduce((sum, n) => sum + n, 0)).toBeCloseTo(1)
    for (const weight of Object.values(BALANCE.events.weights))
      expect(weight).toBeGreaterThanOrEqual(0)
    expect(BALANCE.progression.growthMultiplier).toBeGreaterThan(1)
    for (const hero of [...Object.values(BALANCE.heroes.classic), ...Object.values(BALANCE.heroes.special)]) {
      expect(hero.hp).toBeGreaterThan(0)
      expect(hero.damage).toBeGreaterThan(0)
      expect(hero.delay).toBeGreaterThan(0)
    }
  })

  it('shares world, enemy and weapon balancing without changing collision contracts', () => {
    expect(MAX_MOBS).toBe(BALANCE.world.maxMobs)
    expect(BOSS_TIME).toBe(BALANCE.world.bossTime)
    expect(DURATION).toBe(BALANCE.world.duration)
    expect(spawnInterval(0, 0)).toBe(BALANCE.enemies.intervalBase)
    expect(WEAPON_SPECS).toHaveLength(Object.keys(BALANCE.weapons.intervals).length)
    for (const spec of WEAPON_SPECS)
      expect(spec.interval).toBe(BALANCE.weapons.intervals[spec.key])
    const state = createState()
    state.hero = createHero('knight')
    state.W = 800
    state.H = 600
    spawnMob(state, 'boss')
    expect(state.mobs[0]!.max).toBe(BALANCE.enemies.baseHp.boss)
  })
})
