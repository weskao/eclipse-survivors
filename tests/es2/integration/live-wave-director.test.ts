import { describe, expect, it } from 'vitest'
import { createEngine } from '../../../src/game/engine'
import type { AudioSystem } from '../../../src/game/audio/types'
import { MAX_MOBS } from '../../../src/game/constants'

const audio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})
describe('ES2 live wave director is the sole authoritative spawn scheduler', () => {
  it('does not allow legacy pulse spawns during a wave reward phase', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state
    s.mobs.length = 0
    s.time = 38
    s.spawnT = 0
    s.W = 960
    s.H = 540
    engine.advance(0.016)
    expect(s.mobs).toHaveLength(0)
  })
  it('creates actual configured actors with safe, damaging-attack telegraphs', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state
    s.mobs.length = 0
    s.time = 14.1
    s.W = 960
    s.H = 540
    engine.advance(0.016)
    expect(s.mobs.length).toBeGreaterThan(0)
    for (const mob of s.mobs) {
      expect(mob.hp).toBeGreaterThan(0)
      expect(mob.telegraphUntil).toBeGreaterThan(s.time)
      expect(Number.isFinite(mob.x) && Number.isFinite(mob.y)).toBe(true)
    }
  })
  it('launches real scheduled bosses once, with no phantom duplicate legacy boss', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state
    s.mobs.length = 0
    s.time = 92
    s.W = 960
    s.H = 540
    engine.advance(0.016)
    expect(s.mobs.filter(m => m.type === 'boss' && m.hp > 0)).toHaveLength(1)
    engine.advance(0.016)
    expect(s.mobs.filter(m => m.type === 'boss' && m.hp > 0)).toHaveLength(1)
  })
  it('registers actual Chaos Arena wave actors at scheduled gates', () => {
    const engine = createEngine({ audio: audio() })
    engine.selectRunMode('chaos-arena')
    engine.start()
    const s = engine.state
    s.W = 960
    s.H = 540
    s.mobs.length = 0
    s.time = 15
    engine.advance(0.016)
    expect(s.mobs.some(m => m.waveIndex === 1 && m.hp > 0)).toBe(true)
    expect(engine.ui.objectiveProgress?.waves).toBe(0)
  })
  it('does not exceed the shared actor cap, even at peak spawn windows', () => {
    const engine = createEngine({ audio: audio() })
    engine.start()
    const s = engine.state
    s.W = 960
    s.H = 540
    const sample = s.mobs[0]!
    while (s.mobs.length < MAX_MOBS) s.mobs.push({ ...sample, x: 500 + s.mobs.length })
    s.time = 14.1
    engine.advance(0.016)
    expect(s.mobs.length).toBeLessThanOrEqual(MAX_MOBS)
  })
})
