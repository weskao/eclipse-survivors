import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addXp, applyUpgrade, pickUpgrades } from './progression'
import { UP } from './constants'
import { seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameHooks, GameState, Hero } from './types'

const spyHooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks

function setup(): { s: GameState; hero: Hero } {
  const s = createState()
  const hero = createHero('knight')
  s.hero = hero
  s.mode = 'play'
  return { s, hero }
}

beforeEach(() => setRandom(seeded(7)))
afterEach(() => setRandom())

describe('addXp', () => {
  it('follows the 16 → 27 → 41 → 59 curve and queues levels', () => {
    const { s, hero } = setup()
    const hooks = spyHooks()
    addXp(s, 15, hooks)
    expect(hero.level).toBe(1)
    expect(hooks.offerUpgrades).not.toHaveBeenCalled()
    addXp(s, 1, hooks)
    expect(hero).toMatchObject({ level: 2, xp: 0, need: 27, levelAnim: 1.1 })
    expect(s.levelQueue).toBe(1)
    expect(hooks.message).toHaveBeenCalledWith('✨ 等級提升！ Lv.2')
    expect(hooks.offerUpgrades).toHaveBeenCalledTimes(1)
    addXp(s, 27 + 41 + 5, hooks)
    expect(hero).toMatchObject({ level: 4, xp: 5, need: 59 })
    expect(s.levelQueue).toBe(3)
    expect(s.impactWaves.at(-1)).toMatchObject({ size: 88, color: '#ffe1a8' })
  })
  it('slightly reduces XP requirements without changing the starting threshold', () => {
    const { s, hero } = setup()
    const hooks = spyHooks()
    addXp(s, 16, hooks)
    expect(hero.need).toBe(27)
    addXp(s, 27, hooks)
    expect(hero.need).toBe(41)
    addXp(s, 41, hooks)
    expect(hero.need).toBe(59)
    expect(hero.level).toBe(4)
    expect(s.levelQueue).toBe(3)
  })
  it('only offers upgrades while playing', () => {
    const { s } = setup()
    s.mode = 'level'
    const hooks = spyHooks()
    addXp(s, 16, hooks)
    expect(s.levelQueue).toBe(1)
    expect(hooks.offerUpgrades).not.toHaveBeenCalled()
  })
})

describe('pickUpgrades', () => {
  it('returns 3 distinct UP entries', () => {
    const items = pickUpgrades()
    expect(items).toHaveLength(3)
    expect(new Set(items.map((u) => u.id)).size).toBe(3)
    for (const u of items) expect(UP).toContain(u)
  })
})

describe('applyUpgrade', () => {
  it('applies stat math, counts the skill, consumes the queue and bumps levelAnim', () => {
    const { s, hero } = setup()
    const hooks = spyHooks()
    s.levelQueue = 5
    applyUpgrade(s, 'damage', hooks)
    expect(hero.damage).toBeCloseTo(40)
    applyUpgrade(s, 'speed', hooks)
    expect(hero.speed).toBeCloseTo(212.8)
    applyUpgrade(s, 'haste', hooks)
    expect(hero.delay).toBeCloseTo(0.4845)
    hero.hp = 100
    applyUpgrade(s, 'maxhp', hooks)
    expect(hero.max).toBe(210)
    expect(hero.hp).toBe(155)
    applyUpgrade(s, 'maxhp', hooks)
    expect(hero.max).toBe(245)
    expect(hero.hp).toBe(210)
    expect(hero.skills.maxhp).toBe(2)
    expect(s.levelQueue).toBe(0)
    expect(hero.levelAnim).toBe(0.8)
    expect(hooks.sfx).not.toHaveBeenCalled()
    expect(hooks.offerUpgrades).not.toHaveBeenCalled()
  })
  it('shield heals 25 up to max; skill messages fire', () => {
    const { s, hero } = setup()
    const hooks = spyHooks()
    hero.hp = 100
    applyUpgrade(s, 'shield', hooks)
    expect(hero.hp).toBe(125)
    hero.hp = 170
    applyUpgrade(s, 'shield', hooks)
    expect(hero.hp).toBe(175)
    expect(hero.skills.shield).toBe(2)
    applyUpgrade(s, 'meteor', hooks)
    applyUpgrade(s, 'chain', hooks)
    expect(hooks.message.mock.calls).toEqual([['殞星之力覺醒！'], ['連鎖雷擊激活！']])
  })
})
