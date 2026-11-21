import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attack, damageHero, dash, hit } from './combat'
import { seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameHooks, GameState, Hero, JobId, Mob } from './types'

const spyHooks = () => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }) satisfies GameHooks
const mob = (x: number, y: number, over: Partial<Mob> = {}): Mob => ({
  x, y, type: 'slime', hp: 100, max: 100, r: 18, speed: 0, dmg: 11,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ...over,
})

function setup(job: JobId = 'knight'): { s: GameState; hero: Hero } {
  const s = createState()
  s.choice = job
  const hero = createHero(job)
  s.hero = hero
  s.mode = 'play'
  return { s, hero }
}

beforeEach(() => setRandom(seeded(8)))
afterEach(() => setRandom())

describe('attack', () => {
  it('knight cone hits a mob in front, not one behind', () => {
    const { s, hero } = setup()
    const front = mob(50, 0)
    const back = mob(-60, 0)
    s.mobs.push(back, front)
    const hooks = spyHooks()
    attack(s, hooks)
    expect(front.hp).toBe(68)
    expect(back.hp).toBe(100)
    expect(s.swipes).toHaveLength(1)
    expect(hero.strike).toBe(0.29)
    expect(hooks.sfx).toHaveBeenCalledWith('knight')
  })
  it('faces the target and does nothing when out of range', () => {
    const { s, hero } = setup()
    s.mobs.push(mob(-200, 0))
    const hooks = spyHooks()
    attack(s, hooks)
    expect(hero.face).toBe(1)
    expect(hooks.sfx).not.toHaveBeenCalled()
    s.mobs.push(mob(-100, 0))
    attack(s, hooks)
    expect(hero.face).toBe(-1)
  })
  it.each([
    ['ranger', 540, 'arrow', 5, 1.2, 22],
    ['wizard', 340, 'magic', 9, 1.7, 39],
  ] as const)('%s fires a projectile at %s px/s', (job, speed, kind, r, life, d) => {
    const { s } = setup(job)
    s.mobs.push(mob(100, 0))
    const hooks = spyHooks()
    attack(s, hooks)
    expect(s.shots).toHaveLength(1)
    const shot = s.shots[0]!
    expect(shot).toMatchObject({ x: 0, y: -13, kind, r, life, d })
    expect(shot.vx).toBeCloseTo(speed)
    expect(shot.vy).toBeCloseTo(0)
    expect(hooks.sfx).toHaveBeenCalledWith(job)
  })
  it('caps multi at 4 projectiles', () => {
    const { s, hero } = setup('ranger')
    hero.skills.multi = 9
    s.mobs.push(mob(100, 0))
    attack(s, spyHooks())
    expect(s.shots).toHaveLength(4)
  })
  it('chain lightning jumps between the nearest mobs and sets its cooldown', () => {
    const { s, hero } = setup('ranger')
    hero.skills.chain = 1
    const mobs = [mob(100, 0), mob(150, 0), mob(200, 0), mob(250, 0)]
    s.mobs.push(...mobs)
    const hooks = spyHooks()
    attack(s, hooks)
    expect(hero.chainCd).toBeCloseTo(2.57)
    expect(s.lightningFx).toHaveLength(3)
    expect(mobs[2]!.hp).toBeCloseTo(100 - 22 * 0.78)
    expect(mobs[3]!.hp).toBe(100)
    expect(hooks.sfx).toHaveBeenCalledWith('chain')
  })
})

describe('hit', () => {
  it('kills a goblin into a 5-xp star with sfx kill', () => {
    const { s } = setup()
    const e = mob(30, 40, { type: 'goblin', hp: 10 })
    s.mobs.push(e)
    const hooks = spyHooks()
    hit(s, e, 20, hooks)
    expect(s.kill).toBe(1)
    expect(s.stars[0]).toMatchObject({ x: 30, y: 40, value: 5 })
    expect(s.numberFx[0]).toMatchObject({ value: 20, boss: false })
    expect(e).toMatchObject({ hit: 0.16, kx: 0.6, ky: 0.8 })
    expect(e.stagger).toBeCloseTo(0.07)
    expect(hooks.sfx).toHaveBeenCalledWith('kill')
  })
  it('boss kill drops 45 xp with bossDefeat and a message', () => {
    const { s } = setup()
    const e = mob(30, 40, { type: 'boss', hp: 10 })
    const hooks = spyHooks()
    hit(s, e, 20, hooks)
    expect(s.stars[0]!.value).toBe(45)
    expect(hooks.sfx).toHaveBeenCalledWith('bossDefeat')
    expect(hooks.message).toHaveBeenCalledWith('🏆 擊敗森林魔王！')
  })
  it('records deaths and rewards only once even if hit twice', () => {
    const { s } = setup()
    const e = mob(30, 40, { type: 'boss', hp: 10 })
    const hooks = spyHooks()
    hit(s, e, 20, hooks)
    hit(s, e, 20, hooks)
    expect(s.kill).toBe(1)
    expect(s.defeatedTypes.boss).toBe(1)
    expect(s.bossDefeated).toBe(true)
    expect(s.damageDealt).toBe(10)
    expect(s.stars).toHaveLength(1)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
  })
  it('a non-lethal hit plays no sfx', () => {
    const { s } = setup()
    const hooks = spyHooks()
    hit(s, mob(1, 0), 20, hooks)
    expect(s.kill).toBe(0)
    expect(hooks.sfx).not.toHaveBeenCalled()
  })
})

describe('damageHero', () => {
  it('shield reduces damage (max 52%), then i-frames block', () => {
    const { s, hero } = setup()
    hero.skills.shield = 5
    const hooks = spyHooks()
    damageHero(s, 10, hooks)
    expect(hero.hp).toBeCloseTo(175 - 4.8)
    expect(hero.inv).toBe(0.8)
    expect(hooks.sfx).toHaveBeenCalledWith('hurt')
    damageHero(s, 10, hooks)
    expect(hero.hp).toBeCloseTo(175 - 4.8)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
  })
  it('death clamps hp to 0 and ends the run', () => {
    const { s, hero } = setup()
    hero.hp = 5
    const hooks = spyHooks()
    damageHero(s, 100, hooks)
    expect(hero.hp).toBe(0)
    expect(hooks.sfx).toHaveBeenCalledWith('hurt')
    expect(hooks.end).toHaveBeenCalledWith(false)
  })
})

describe('dash', () => {
  it('only dashes while playing and off cooldown', () => {
    const { s, hero } = setup()
    const hooks = spyHooks()
    s.mode = 'level'
    dash(s, hooks)
    expect(hero.dash).toBe(0)
    s.mode = 'play'
    dash(s, hooks)
    expect(hero).toMatchObject({ dash: 0.22, dashCd: 3, inv: 0.35 })
    expect(s.motionEchoes[0]).toMatchObject({ kind: 'knight', frame: 0 })
    dash(s, hooks)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
    expect(hooks.sfx).toHaveBeenCalledWith('dash')
  })
})
