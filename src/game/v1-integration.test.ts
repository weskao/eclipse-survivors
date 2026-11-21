import { describe, expect, it, vi } from 'vitest'
import { hit } from './combat'
import { step } from './step'
import { createState, resetRun } from './state'
import { equippedSkillHud } from './store'
import type { GameHooks, GameState, Mob } from './types'

const hooks = (): GameHooks => ({
  sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn(),
})
const fresh = (): GameState => {
  const s = createState()
  resetRun(s)
  s.mode = 'play'
  s.W = 1280
  s.H = 720
  s.spawnT = 9999
  s.nextEventAt = Infinity
  s.hero!.attack = 9999
  return s
}

describe('v1 cross-feature contracts', () => {
  it('uses mode-specific victory after boss defeat even while world events and AI are active', () => {
    const s = fresh()
    const h = hooks()
    s.time = 150
    s.bossSpawned = true
    s.bossDefeated = false
    step(s, 0.016, { x: 0, y: 0 }, h)
    expect(h.end).not.toHaveBeenCalled()
    s.bossDefeated = true
    step(s, 0.016, { x: 0, y: 0 }, h)
    expect(h.end).toHaveBeenCalledWith(true)
    const endless = fresh()
    endless.runMode = 'endless'
    endless.time = 600
    endless.bossSpawned = true
    endless.bossDefeated = true
    const endlessHooks = hooks()
    step(endless, 0.016, { x: 0, y: 0 }, endlessHooks)
    expect(endlessHooks.end).not.toHaveBeenCalled()
  })

  it('records warlock kills once in combined combat statistics and still displays skill evolutions', () => {
    const s = fresh()
    s.runMode = 'challenge'
    s.currentScene = 2
    const hero = s.hero!
    hero.skills.frost = 3
    hero.skills.chain = 3
    hero.evolutions['frozen-thunderstorm'] = true
    const enemy: Mob = {
      x: 70, y: 20, type: 'warlock', hp: 5, max: 5, r: 22, speed: 0, dmg: 0,
      phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
    }
    s.mobs.push(enemy)
    const h = hooks()
    hit(s, enemy, 10, h)
    hit(s, enemy, 10, h)
    expect(s.kill).toBe(1)
    expect(s.defeatedTypes.warlock).toBe(1)
    expect(s.damageDealt).toBe(5)
    expect(s.stars).toHaveLength(1)
    const hud = equippedSkillHud(hero)
    expect(hud.map(x => x.id)).toEqual(expect.arrayContaining(['frost', 'chain', 'frozen-thunderstorm']))
    expect(hud.find(x => x.id === 'frozen-thunderstorm')?.evolved).toBe(true)
  })

  it('clears transient world, boss and evolved ability state on restart without changing selected run mode', () => {
    const s = fresh()
    s.runMode = 'standard'
    s.bossDefeated = true
    s.hero!.evolutions['blade-tempest'] = true
    s.events.push({ id: 1, kind: 'chest', x: 0, y: 0, expiresAt: 30 })
    s.enemyShots.push({ x: 0, y: 0, vx: 0, vy: 0, radius: 5, damage: 1, life: 1 })
    resetRun(s)
    expect(s.runMode).toBe('standard')
    expect(s.bossDefeated).toBe(false)
    expect(s.events).toEqual([])
    expect(s.enemyShots).toEqual([])
    expect(s.hero!.evolutions).toEqual({})
  })
})
