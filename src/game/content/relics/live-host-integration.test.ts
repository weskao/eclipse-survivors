import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createEngine } from '../../engine'
import type { AudioSystem } from '../../audio/types'
import { acquireRelic } from './runtime'
import { RELICS_PACK } from '../packs/relics'
import { seeded, setRandom } from '../../math'
import type { Mob } from '../../types'

const audio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})
const mob = (x: number, y: number, hp = 1000, max = hp): Mob => ({
  x, y, type: 'slime', hp, max, r: 18, speed: 0, dmg: 0,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})
function session(relicsEnabled = true) {
  const engine = createEngine({ audio: audio(), contentPacks: relicsEnabled ? [RELICS_PACK] : [] })
  engine.start()
  const state = engine.state
  state.mobs.length = 0
  state.enemyShots.length = 0
  state.spawnT = 9999
  return { engine, state, hero: state.hero! }
}
beforeEach(() => setRandom(seeded(17)))
afterEach(() => setRandom(seeded(17)))

describe('ES2 real game-loop relic effects', () => {
  it('makes phantom boots dodge an actual enemy projectile without phantom HP damage', () => {
    const { engine, state, hero } = session()
    expect(acquireRelic(state, 'relics:phantom-boots')).toBe(true)
    setRandom(() => 0)
    const hp = hero.hp
    state.enemyShots.push({ x: hero.x, y: hero.y, vx: 0, vy: 0,
      radius: 14, damage: 50, life: 1 })
    engine.advance(0.016)
    expect(hero.hp).toBe(hp)
    expect(state.damageTaken).toBe(0)
  })

  it('applies relic resistance in actual contact damage after normal invulnerability checks', () => {
    const { engine, state, hero } = session()
    expect(acquireRelic(state, 'relics:bulwark-ring')).toBe(true)
    const hp = hero.hp
    state.enemyShots.push({ x: hero.x, y: hero.y, vx: 0, vy: 0,
      radius: 14, damage: 50, life: 1 })
    engine.advance(0.016)
    expect(hp - hero.hp).toBeCloseTo(46.5)
    expect(state.damageTaken).toBeCloseTo(46.5)
  })

  it.each([false, true])('gives ordinary heroes base critical hits with relics enabled=%s', enabled => {
    for (const [roll, critical] of [[0.05, true], [0.09, false]] as const) {
      const { engine, state, hero } = session(enabled)
      setRandom(() => roll)
      hero.attack = 0
      const enemy = mob(hero.x + 28, hero.y)
      state.mobs.push(enemy)
      engine.advance(0.016)
      expect(1000 - enemy.hp).toBeCloseTo(hero.damage * (critical ? 1.5 : 1))
      expect(state.numberFx.at(-1)?.critical).toBe(critical)
    }
  })

  it('adds relic critical chance to the base chance and reports genuine critical hits', () => {
    const { engine, state, hero } = session()
    expect(acquireRelic(state, 'relics:ritual-dagger')).toBe(true)
    setRandom(() => 0.12)
    hero.attack = 0
    const enemy = mob(hero.x + 28, hero.y)
    state.mobs.push(enemy)
    engine.advance(0.016)
    expect(1000 - enemy.hp).toBeCloseTo(hero.damage * 1.5)
    expect(state.numberFx.at(-1)?.critical).toBe(true)
  })

  it('makes ritual-dagger crits affect actual attacks instead of metadata only', () => {
    const { engine, state, hero } = session()
    expect(acquireRelic(state, 'relics:ritual-dagger')).toBe(true)
    setRandom(() => 0)
    hero.attack = 0
    const enemy = mob(hero.x + 28, hero.y)
    state.mobs.push(enemy)
    engine.advance(0.016)
    expect(1000 - enemy.hp).toBeCloseTo(hero.damage * 1.5)
    expect(state.damageDealt).toBeCloseTo(hero.damage * 1.5)
  })

  it('executes low HP ordinary enemies only after actually hitting the same actor', () => {
    const { engine, state, hero } = session()
    expect(acquireRelic(state, 'relics:grave-bell')).toBe(true)
    hero.damage = 1
    hero.attack = 0
    const enemy = mob(hero.x + 28, hero.y, 4, 100)
    state.mobs.push(enemy)
    engine.advance(0.016)
    expect(enemy.hp).toBe(0)
    expect(state.kill).toBe(1)
    expect(state.damageDealt).toBe(4)
  })

  it('reflects only real post-mitigation HP damage to the actual colliding enemy once', () => {
    const { engine, state, hero } = session()
    expect(acquireRelic(state, 'relics:mirror-charm')).toBe(true)
    hero.attack = 999
    const enemy = { ...mob(hero.x + 25, hero.y), type: 'golem' as const,
      dmg: 30,
      ai: { state: 'windup' as const, timer: 0,
        attack: 'slam' as const, aimX: hero.x, aimY: hero.y, dirX: -1, dirY: 0, cycle: 1 },
    }
    state.mobs.push(enemy)
    const originalHp = hero.hp
    engine.advance(0.016)
    expect(originalHp - hero.hp).toBeCloseTo(30)
    expect(1000 - enemy.hp).toBeCloseTo(6)
    expect(state.kill).toBe(0)
    expect(state.damageDealt).toBeCloseTo(6)
  })
})
