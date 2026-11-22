import { describe, expect, it } from 'vitest'
import { createEngine } from './engine'
import type { AudioSystem } from './audio/types'
import { HERO_DEFINITIONS } from './content/heroes'
import { JOB } from './constants'

const audio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})

describe('live hero integration, including original roster regressions', () => {
  it.each(['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const)(
    'selects and actually plays %s with unique identity, stats and starter equipment', id => {
      const engine = createEngine({ audio: audio() })
      engine.selectHero(id)
      expect(engine.ui.heroId).toBe(id)
      engine.start()
      expect(engine.state.heroId).toBe(id)
      expect(engine.state.hero?.max).toBe(HERO_DEFINITIONS[id].stats.hp)
      expect(engine.state.hero?.damage).toBe(HERO_DEFINITIONS[id].stats.damage)
      expect(engine.state.content.levels[HERO_DEFINITIONS[id].startingAbility]).toBe(1)
      expect(engine.ui.hud.who).toContain(HERO_DEFINITIONS[id].label)
      expect(engine.ui.heroSpecial?.cooldown).toBe(0)
    },
  )

  it('casts once, displays cooldown, pauses it and clears it on replay and menu leave', () => {
    const engine = createEngine({ audio: audio() })
    engine.selectHero('shadowblade')
    engine.start()
    expect(engine.activateHeroSpecial()).toBe(true)
    expect(engine.activateHeroSpecial()).toBe(false)
    const cooldown = engine.ui.heroSpecial!.cooldown
    expect(cooldown).toBeGreaterThan(0)
    engine.togglePause()
    engine.advance(3)
    expect(engine.ui.heroSpecial!.cooldown).toBe(cooldown)
    engine.togglePause()
    engine.advance(0.1)
    expect(engine.ui.heroSpecial!.cooldown).toBeLessThan(cooldown)
    engine.goMenu()
    expect(engine.ui.heroSpecial).toBeNull()
    engine.start()
    expect(engine.ui.heroSpecial?.cooldown).toBe(0)
  })

  it('gives paladin real incoming-damage mitigation through enemy projectile collisions', () => {
    const engine = createEngine({ audio: audio() })
    engine.selectHero('crimson-paladin')
    engine.start()
    const state = engine.state, hero = state.hero!
    state.mobs = []; state.spawnT = 1000
    const before = hero.hp
    state.enemyShots.push({ x: hero.x, y: hero.y, vx: 0, vy: 0, radius: 14, damage: 50, life: 1 })
    engine.advance(0.016)
    expect(before - hero.hp).toBeCloseTo(43)
    expect(state.damageTaken).toBeCloseTo(43)
    expect(engine.activateHeroSpecial()).toBe(true)
    hero.inv = 0
    const shieldedHp = hero.hp
    state.enemyShots.push({ x: hero.x, y: hero.y, vx: 0, vy: 0, radius: 14, damage: 15, life: 1 })
    engine.advance(0.016)
    expect(hero.hp).toBe(shieldedHp)
    expect(engine.ui.heroSpecial!.barrier).toBeGreaterThan(0)
  })

  it('keeps three original characters, original fallback IDs and no ability for legacy runs', () => {
    for (const id of ['knight', 'ranger', 'wizard'] as const) {
      const engine = createEngine({ audio: audio() })
      engine.selectJob(id)
      engine.start()
      expect(engine.state.choice).toBe(id)
      expect(engine.state.heroId).toBe(id)
      expect(engine.state.hero?.max).toBe(JOB[id].hp)
      expect(engine.ui.heroSpecial).toBeNull()
    }
  })
})
