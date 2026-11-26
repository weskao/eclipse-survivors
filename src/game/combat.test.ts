import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attack, damageHero, dash, hit, nearestAlive, victoryConditionMet } from './combat'
import { getLocale, setLocale, t } from '../i18n'
import { DURATION, JOB } from './constants'
import { getFiringOrigin } from './weapon-geometry'
import { seeded, setRandom } from './math'
import { createHero, createState, resetRun } from './state'
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
    ['wizard', 340, 'magic', 9, 1.7, 46],
  ] as const)('%s fires a projectile at %s px/s', (job, speed, kind, r, life, d) => {
    const { s } = setup(job)
    s.mobs.push(mob(100, 0))
    const hooks = spyHooks()
    attack(s, hooks)
    expect(s.shots).toHaveLength(1)
    const shot = s.shots[0]!
    expect(shot).toMatchObject({ ...getFiringOrigin(job, 1), kind, r, life, d })
    expect(Math.hypot(shot.vx, shot.vy)).toBeCloseTo(speed)
    expect(shot.vy).toBeGreaterThan(0)
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
    expect(hero.chainCd).toBeCloseTo(2.55)
    expect(s.lightningFx).toHaveLength(1)
    expect(mobs[0]!.hp).toBeCloseTo(100 - 22 * 0.84)
    expect(mobs.slice(1).every(m => m.hp === 100)).toBe(true)
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
    expect(e.stagger).toBeCloseTo(0.12)
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
  it.each([
    ['abyss-monarch', 'Abyss Monarch', '深淵君王', '#a58aff'],
    ['frost-sovereign', 'Frost Sovereign', '霜寒君主', '#9cddff'],
    ['infernal-titan', 'Infernal Titan', '煉獄泰坦', '#ff9958'],
    ['eclipse-seraph', 'Eclipse Seraph', '星蝕熾天使', '#ffe8a8'],
  ] as const)('uses the defeated %s identity for its reward notice and final impact', (id, name, zh, color) => {
    const { s } = setup()
    const e = mob(30, 40, { type: 'boss', bossArtId: id, hp: 10 })
    const hooks = spyHooks()
    hit(s, e, 20, hooks)
    hit(s, e, 20, hooks)
    expect(s.stars.map(star => star.value)).toEqual([45])
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
    expect(s.impactWaves.at(-1)).toMatchObject({ size: 210, color })
    const notice = hooks.message.mock.calls[0]?.[0]
    const previous = getLocale()
    try {
      setLocale('en')
      expect(t(notice)).toBe(`🏆 ${name} Defeated!`)
      setLocale('zh-TW')
      expect(t(notice)).toBe(`🏆 擊敗${zh}！`)
    } finally {
      setLocale(previous)
    }
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
    expect(hero.hp).toBeCloseTo(200 - 4.8)
    expect(hero.inv).toBe(1)
    expect(hooks.sfx).toHaveBeenCalledWith('hurt')
    damageHero(s, 10, hooks)
    expect(hero.hp).toBeCloseTo(200 - 4.8)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
  })
  it('each shield rank mitigates 13% up to the existing 52% cap', () => {
    const { s, hero } = setup()
    hero.skills.shield = 1
    const initialHp = hero.hp
    damageHero(s, 100, spyHooks())
    expect(initialHp - hero.hp).toBeCloseTo(87)
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

describe('combat fairness regressions', () => {
  it('awards one kill and one XP drop even after repeated lethal hits', () => {
    const { s } = setup()
    const e = mob(30, 0, { hp: 10, type: 'goblin' })
    const hooks = spyHooks()
    hit(s, e, 20, hooks)
    const firstFx = s.numberFx.length
    hit(s, e, 100, hooks)
    expect(e.hp).toBe(0)
    expect(s.kill).toBe(1)
    expect(s.stars).toHaveLength(1)
    expect(s.stars[0]!.value).toBe(5)
    expect(s.numberFx).toHaveLength(firstFx)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
  })
  it('handles simultaneous damage sources without multiplying death rewards', () => {
    const { s } = setup()
    const e = mob(45, 0, { hp: 20 })
    const hooks = spyHooks()
    hit(s, e, 30, hooks) // melee
    hit(s, e, 15, hooks) // passive / projectile in the same tick
    expect(s.kill).toBe(1)
    expect(s.stars).toHaveLength(1)
  })
  it('does not convert negative or non-finite damage into healing or rewards', () => {
    const { s } = setup()
    const e = mob(30, 0, { hp: 10 })
    const hooks = spyHooks()
    hit(s, e, -100, hooks)
    hit(s, e, Number.NaN, hooks)
    expect(e.hp).toBe(10)
    expect(s.kill).toBe(0)
    expect(hooks.sfx).not.toHaveBeenCalled()
  })
  it('records boss defeat exactly once, separate from spawning', () => {
    const { s } = setup()
    const e = mob(30, 0, { type: 'boss', hp: 1 })
    const hooks = spyHooks()
    s.bossSpawned = true
    hit(s, e, 20, hooks)
    hit(s, e, 20, hooks)
    expect(s.bossDefeated).toBe(true)
    expect(s.kill).toBe(1)
    expect(s.stars).toHaveLength(1)
    expect(hooks.message).toHaveBeenCalledTimes(1)
  })
  it('keeps duration-only, boss-only and combined victory rules independent', () => {
    const { s } = setup()
    s.time = DURATION
    s.bossSpawned = true
    s.mobs.push(mob(200, 0, { type: 'boss' }))
    expect(victoryConditionMet(s)).toBe(false)
    expect(victoryConditionMet(s, 'survival')).toBe(true)
    expect(victoryConditionMet(s, 'boss')).toBe(false)
    s.bossDefeated = true
    expect(victoryConditionMet(s)).toBe(false)
    s.mobs[0]!.hp = 0
    expect(victoryConditionMet(s)).toBe(true)
    expect(victoryConditionMet(s, 'boss')).toBe(true)
    s.time = DURATION - 1
    expect(victoryConditionMet(s)).toBe(false)
    expect(victoryConditionMet(s, 'boss')).toBe(true)
  })
  it('aims ranged projectiles from their muzzle rather than the hero center', () => {
    const { s } = setup('ranger')
    s.mobs.push(mob(100, 60))
    attack(s, spyHooks())
    const shot = s.shots[0]!
    // Time to cross the enemy's x-coordinate is measured from the hand,
    // not from the hero's ground-contact x-coordinate.
    const travel = (100 - shot.x) / shot.vx
    expect(shot.y + shot.vy * travel).toBeCloseTo(60)
  })
  it('keeps all three roles distinct and wizard burst competitive with ranger', () => {
    const knight = JOB.knight, ranger = JOB.ranger, wizard = JOB.wizard
    expect(knight.hp).toBeGreaterThan(ranger.hp)
    expect(knight.range).toBeLessThan(wizard.range)
    expect(ranger.speed).toBeGreaterThan(wizard.speed)
    expect(ranger.delay).toBeLessThan(wizard.delay)
    expect(wizard.damage).toBeGreaterThan(ranger.damage)
    expect(wizard.damage / wizard.delay).toBeGreaterThan(ranger.damage / ranger.delay)
    expect(wizard.damage / wizard.delay).toBeLessThan(1.4 * ranger.damage / ranger.delay)
  })
  it('gives contact immunity and disperses a stacked crowd without multiple hits', () => {
    const { s, hero } = setup()
    s.mobs.push(mob(0, 0), mob(0, 0), mob(0, 0))
    const hooks = spyHooks()
    damageHero(s, 11, hooks)
    damageHero(s, 11, hooks)
    expect(hero.hp).toBe(189)
    expect(hero.inv).toBe(1)
    expect(hooks.sfx).toHaveBeenCalledTimes(1)
    for (const enemy of s.mobs) expect(Math.hypot(enemy.x, enemy.y)).toBeGreaterThan(32)
  })
  it('clears boss completion and invincibility on a new run', () => {
    const { s, hero } = setup()
    s.bossDefeated = true
    s.bossSpawned = true
    s.kill = 8
    hero.inv = 1
    resetRun(s)
    expect(s.bossDefeated).toBe(false)
    expect(s.bossSpawned).toBe(false)
    expect(s.kill).toBe(0)
    expect(s.hero!.inv).toBe(0)
  })
})

describe('hitbox-based melee targeting', () => {
  it('hits a boss whose near edge is in sword reach although its center is outside', () => {
    const { s } = setup()
    const boss = mob(150, 0, { type: 'boss', r: 48 })
    s.mobs.push(boss)
    attack(s, spyHooks())
    expect(boss.hp).toBe(68)
  })
  it('prioritizes reachable enemy edges over center distance', () => {
    const { hero } = setup()
    const small = mob(105, 0)
    const boss = mob(130, 0, { type: 'boss', r: 48 })
    expect(nearestAlive([small, boss], hero)[0]).toBe(boss)
  })
})

describe('ES3 per-run kill feedback', () => {
  it('counts actual kills, tracks the highest streak and burst, and never rewards a corpse again', () => {
    const { s } = setup()
    const hooks = spyHooks()
    const first = mob(40, 0, { hp: 1 })
    hit(s, first, 10, hooks)
    hit(s, first, 10, hooks)
    s.time = 0.15; s.worldClock = 0.15
    hit(s, mob(50, 0, { hp: 1 }), 10, hooks)
    s.time = 0.3; s.worldClock = 0.3
    hit(s, mob(60, 0, { hp: 1 }), 10, hooks)
    expect(s).toMatchObject({ kill: 3, killStreak: { current: 3, best: 3, burst: 3, bestBurst: 3 } })
    s.time = 4; s.worldClock = 4
    hit(s, mob(70, 0, { hp: 1 }), 10, hooks)
    expect(s).toMatchObject({ kill: 4, killStreak: { current: 1, best: 3, burst: 1, bestBurst: 3 } })
    resetRun(s)
    expect(s).toMatchObject({ kill: 0, killStreak: { current: 0, best: 0, burst: 0, bestBurst: 0 } })
  })
})

describe('ES3 tiered contact feedback', () => {
  it('distinguishes a heavy hit on a high-mass target from an ordinary hit without duplicating impact ownership', () => {
    const { s } = setup()
    const hooks = spyHooks()
    hit(s, mob(60, 0), 10, hooks)
    hit(s, mob(70, 0, { type: 'golem', r: 30, hp: 200 }), 10, hooks)
    expect(s.impactWaves).toHaveLength(2)
    expect(s.impactWaves[0]?.contact).toBe('normal')
    expect(s.impactWaves[1]?.contact).toBe('heavy')
    expect(s.impactWaves[1]!.max).toBeGreaterThan(s.impactWaves[0]!.max)
  })
})

describe('ES3 chain lightning breakthroughs', () => {
  it('applies a real bounded shock to living targets starting at rank four', () => {
    const { s, hero } = setup('ranger')
    hero.skills.chain = 4
    const target = mob(80, 0, { hp: 500 })
    s.mobs.push(target)
    attack(s, spyHooks())
    expect(target.hp).toBeLessThan(500)
    expect(target.slow).toBeGreaterThan(0)
    expect(target.slow).toBeLessThanOrEqual(1.5)
  })
  it('discharges from one killed rank-five chain target to at most one additional living enemy', () => {
    const { s, hero } = setup('ranger')
    hero.skills.chain = 5
    s.mobs = Array.from({ length: 9 }, (_, i) => mob(80 + i * 18, 0, { hp: i === 0 ? 1 : 500, max: 500 }))
    attack(s, spyHooks())
    expect(s.kill).toBe(1)
    expect(s.mobs[7]!.hp).toBeLessThan(500)
    expect(s.mobs[8]!.hp).toBe(500)
    expect(s.lightningFx).toHaveLength(8)
  })
})

it('uses the actual impact origin and bounded directional recoil on heavy contact',()=>{
  const {s}=setup(); const e=mob(50,0,{type:'golem'})
  hit(s,e,10,spyHooks(),{x:100,y:0})
  expect(e.kx).toBe(-1)
  expect(s.cameraKick).toBeGreaterThan(0)
  expect(s.cameraKickAngle).toBeCloseTo(Math.PI)
  expect(s.hero!.x).toBe(0)
})
