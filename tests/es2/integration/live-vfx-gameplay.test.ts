import { describe, expect, it } from 'vitest'
import { createEngine } from '../../../src/game/engine'
import { MAX_CONTENT_EFFECTS } from '../../../src/game/content/registry'
import { acquireRelic } from '../../../src/game/content/relics/runtime'
import { setRandom } from '../../../src/game/math'
import { runtimeOf } from '../../../src/game/content/weapons/runtime'
import type { AudioSystem } from '../../../src/game/audio/types'
import type { Mob } from '../../../src/game/types'

const audio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})
const mob = (x: number, y: number): Mob => ({
  x, y, type: 'slime', hp: 1000, max: 1000, r: 18, speed: 0, dmg: 0,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})
describe('ES2 combat VFX in the actual game, not the standalone demo', () => {
  it('emits the authored directional slash at the actual swing and does not invent critical-hit FX', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state
    s.mobs.length = 0
    s.spawnT = 10000
    const h = s.hero!
    h.attack = 0
    s.mobs.push(mob(h.x + 45, h.y))
    engine.advance(0.016)
    const slash = s.content.effects.find(f => f.id === 'combat-vfx:sword-slash')
    expect(slash).toBeDefined()
    expect(slash?.x).toBe(h.x)
    expect((slash as { angle?: number })?.angle).toBeCloseTo(h.aimAngle)
    expect(s.content.effects.some(f => f.id === 'combat-vfx:critical-hit')).toBe(false)
  })

  it('only emits a dash effect after an accepted input; reset discards old effects', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state
    const first = s.content.effects.filter(f => f.id === 'combat-vfx:dash-afterimage').length
    engine.dash()
    const effects = s.content.effects.filter(f => f.id === 'combat-vfx:dash-afterimage')
    expect(effects).toHaveLength(first + 1)
    engine.dash()
    expect(s.content.effects.filter(f => f.id === 'combat-vfx:dash-afterimage')).toHaveLength(first + 1)
    engine.start()
    expect(s.content.effects.filter(f => f.id === 'combat-vfx:dash-afterimage')).toHaveLength(0)
  })

  it('tracks actual launch coordinates and shares the 96-effect cap', () => {
    const engine = createEngine({ audio: audio() })
    engine.selectJob('ranger')
    engine.start()
    const s = engine.state
    s.mobs.length = 0
    s.spawnT = 10000
    const h = s.hero!
    h.attack = 0
    s.mobs.push(mob(h.x + 65, h.y))
    engine.advance(0.016)
    const shot = s.shots.at(-1)!
    const trail = s.content.effects.find(f => f.id === 'combat-vfx:projectile-trail')
    expect(trail).toMatchObject({ x: shot.prevX, y: shot.prevY })
    expect((trail as { angle?: number })?.angle).toBeCloseTo(Math.atan2(shot.vy, shot.vx))
    expect(s.content.effects.length).toBeLessThanOrEqual(MAX_CONTENT_EFFECTS)
  })

  it('does not emit combat VFX when the combat pack is deliberately omitted', () => {
    const engine = createEngine({ audio: audio(), contentPacks: [] })
    engine.start()
    engine.dash()
    expect(engine.state.content.effects).toHaveLength(0)
  })

  it('emits critical impact only after a real crit-enhanced hit and at its actual target', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state, hero = s.hero!
    s.mobs.length = 0
    s.spawnT = 99999
    hero.attack = 0
    const enemy = mob(hero.x + 32, hero.y)
    s.mobs.push(enemy)
    acquireRelic(s, 'relics:ritual-dagger')
    setRandom(() => 0)
    try {
      engine.advance(0.016)
      const visual = s.content.effects.find(fx => fx.id === 'combat-vfx:critical-hit')
      expect(visual).toMatchObject({ x: enemy.x, y: enemy.y })
      expect(s.damageDealt).toBeGreaterThan(hero.damage)
    } finally { setRandom() }
  })

  it('renders barrier impact on genuine shield mitigation, not on an untouched incoming hit', () => {
    const engine = createEngine({ audio: audio() })
    engine.selectHero('crimson-paladin')
    engine.start()
    const s = engine.state, hero = s.hero!
    s.mobs.length = 0
    s.spawnT = 99999
    s.enemyShots.push({ x: hero.x, y: hero.y, vx: 0, vy: 0,
      radius: 14, damage: 50, life: 1 })
    engine.advance(0.016)
    const effect = s.content.effects.find(fx => fx.id === 'combat-vfx:shield-impact')
    expect(effect).toMatchObject({ x: hero.x, y: hero.y })
  })

  it('renders a poison miasma where the weapon actually created an active zone', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state, hero = s.hero!
    s.mobs.length = 0
    s.spawnT = 99999
    hero.attack = 99999
    s.content.levels['weapons:poison-cloud'] = 1
    s.mobs.push(mob(hero.x + 55, hero.y))
    engine.advance(0.016)
    const zone = runtimeOf(s).zones.find(z => z.kind === 'poison')
    expect(zone).toBeDefined()
    expect(s.content.effects.some(fx => fx.id === 'combat-vfx:poison-cloud' &&
      fx.x === zone?.x && fx.y === zone?.y)).toBe(true)
    expect(s.content.effects.some(fx => fx.id === 'combat-vfx:gravity-vortex')).toBe(false)
  })
})
