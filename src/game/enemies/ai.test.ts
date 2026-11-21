import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../state'
import type { GameHooks, GameState, Mob, MobType } from '../types'
import { tickEnemies, tickEnemyProjectiles } from './ai'
import { updateBossPhase, summonBossMinions } from '../bosses/phases'

const hooks = (): GameHooks => ({ sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() })
const setup = (): GameState => {
  const s = createState()
  s.hero = createHero('knight')
  s.mode = 'play'; s.W = 390; s.H = 844
  return s
}
const enemy = (type: MobType, x: number, y = 0, extra: Partial<Mob> = {}): Mob => ({
  type, x, y, hp: 100, max: 100, r: type === 'boss' ? 48 : 18, speed: 80, dmg: 12,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ...extra,
})

describe('enemy AI', () => {
  it('slime warns before jumping, hits only once, and recovers before cooldown', () => {
    const s = setup(), h = hooks(), e = enemy('slime', 35)
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    expect(e.ai?.state).toBe('windup')
    expect(s.hero!.hp).toBe(s.hero!.max)
    tickEnemies(s, 0.2, h)
    expect(s.hero!.hp).toBe(s.hero!.max)
    tickEnemies(s, 0.5, h)
    expect(s.hero!.hp).toBeLessThan(s.hero!.max)
    expect(e.ai?.state).toBe('recover')
    const hp = s.hero!.hp
    tickEnemies(s, 0.3, h)
    expect(s.hero!.hp).toBe(hp)
  })
  it('bat locks the dive direction after its directional telegraph', () => {
    const s = setup(), h = hooks(), e = enemy('bat', 140)
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    expect(e.ai?.state).toBe('windup')
    const aimX = e.ai!.aimX
    s.hero!.x = 300
    tickEnemies(s, 0.6, h)
    expect(e.ai?.state).toBe('attack')
    expect(e.ai!.aimX).toBe(aimX)
    const x = e.x
    tickEnemies(s, 0.1, h)
    expect(e.x).toBeLessThan(x)
  })
  it('goblin sidesteps during approach and attacks after a warning', () => {
    const s = setup(), h = hooks(), e = enemy('goblin', 240)
    s.mobs.push(e)
    tickEnemies(s, 0.15, h)
    expect(e.y).not.toBe(0)
    e.x = 90
    tickEnemies(s, 0.15, h)
    expect(e.ai?.state).toBe('windup')
    expect(s.hero!.hp).toBe(s.hero!.max)
  })
  it('golem locks a ground slam target, allowing dodge before damage', () => {
    const s = setup(), h = hooks(), e = enemy('golem', 85)
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    expect(e.ai?.state).toBe('windup')
    expect(e.ai?.attack).toBe('slam')
    s.hero!.x = 210
    tickEnemies(s, 1.2, h)
    expect(s.hero!.hp).toBe(s.hero!.max)
    expect(e.ai?.state).toBe('recover')
  })
  it('warlock fires visible, finite projectiles that hurt only on collision', () => {
    const s = setup(), h = hooks(), e = enemy('warlock', 230)
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    expect(e.ai?.state).toBe('windup')
    tickEnemies(s, 0.8, h)
    expect(s.enemyShots).toHaveLength(1)
    expect(s.hero!.hp).toBe(s.hero!.max)
    for (let i = 0; i < 15; i++) tickEnemyProjectiles(s, 0.1, h)
    expect(s.hero!.hp).toBeLessThan(s.hero!.max)
    expect(s.enemyShots).toHaveLength(0)
  })
  it('elite variants fire an extra magic volley but retain warning time', () => {
    const s = setup(), h = hooks(), e = enemy('warlock', 220, 0, { elite: true })
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    expect(s.enemyShots).toHaveLength(0)
    tickEnemies(s, 0.8, h)
    expect(s.enemyShots).toHaveLength(3)
  })
  it('projectiles expire and never strike a dashing or dead hero', () => {
    const s = setup(), h = hooks()
    s.hero!.dash = 1
    s.enemyShots.push({ x: 20, y: 0, vx: -100, vy: 0, radius: 9, damage: 10, life: 0.5 })
    tickEnemyProjectiles(s, 0.2, h)
    expect(s.hero!.hp).toBe(s.hero!.max)
    expect(s.enemyShots).toHaveLength(0)
    s.enemyShots.push({ x: 100, y: 0, vx: 0, vy: 0, radius: 9, damage: 10, life: 0.1 })
    tickEnemyProjectiles(s, 0.2, h)
    expect(s.enemyShots).toHaveLength(0)
  })
  it('dying during a telegraph cancels all queued attacks', () => {
    const s = setup(), h = hooks(), e = enemy('golem', 85)
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    e.hp = 0
    tickEnemies(s, 2, h)
    expect(s.hero!.hp).toBe(s.hero!.max)
    expect(s.enemyShots).toHaveLength(0)
  })
})

describe('boss phases', () => {
  it('moves through three phases at health thresholds and announces them once', () => {
    const s = setup(), h = hooks(), e = enemy('boss', 180, 0, { max: 900, hp: 900 })
    s.mobs.push(e)
    expect(updateBossPhase(s, e, h)).toBe(1)
    e.hp = 600
    expect(updateBossPhase(s, e, h)).toBe(2)
    e.hp = 250
    expect(updateBossPhase(s, e, h)).toBe(3)
    updateBossPhase(s, e, h)
    expect((h.message as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
  })
  it('phase transitions interrupt pending attacks and leave recovery time', () => {
    const s = setup(), h = hooks(), e = enemy('boss', 120, 0, { max: 900, hp: 900 })
    s.mobs.push(e)
    tickEnemies(s, 0.1, h)
    expect(e.ai?.state).toBe('windup')
    e.hp = 400
    tickEnemies(s, 0.1, h)
    expect(e.bossPhase).toBe(2)
    expect(e.ai?.state).toBe('recover')
    expect(s.hero!.hp).toBe(s.hero!.max)
  })
  it('summons are capped by live minion count and the global mob limit', () => {
    const s = setup(), e = enemy('boss', 200, 0)
    s.mobs.push(e)
    for (let i = 0; i < 10; i++) summonBossMinions(s, e)
    expect(s.mobs.filter(m => m.summonedByBoss)).toHaveLength(6)
    expect(s.mobs.every(m => Number.isFinite(m.x) && Number.isFinite(m.y))).toBe(true)
  })
  it('never summons from a dead boss', () => {
    const s = setup(), e = enemy('boss', 150, 0, { hp: 0 })
    s.mobs.push(e)
    summonBossMinions(s, e)
    expect(s.mobs).toHaveLength(1)
  })
})
