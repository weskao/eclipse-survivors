import { describe, expect, it } from 'vitest'
import { createEngine } from '../../../src/game/engine'
import { BIOME_IDS, createBiomeEnvironment } from '../../../src/game/content/biomes'
import type { AudioSystem } from '../../../src/game/audio/types'
import type { RunModeId } from '../../../src/meta/types'

const audio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})

describe('four genuinely playable ES2 biomes use the authoritative runtime', () => {
  it.each([
    ['boss-rush', BIOME_IDS[0], 'Blood Moon Cathedral'],
    ['endless-eclipse', BIOME_IDS[1], 'Cursed Forest'],
    ['relic-hunt', BIOME_IDS[2], 'Abyssal Necropolis'],
    ['cursed-expedition', BIOME_IDS[3], 'Celestial Rift'],
  ] as const)('%s enters %s with real collision and live HUD labeling', (mode, biomeId, label) => {
    const engine = createEngine({ audio: audio() })
    engine.selectRunMode(mode)
    engine.start()
    expect(engine.activeBiomeId).toBe(biomeId)
    expect(engine.ui.hud.quest).toContain(label)
    const environment = createBiomeEnvironment(biomeId, { seed: 0 })
    const obstacle = environment.obstacles(840, 840, 1000)[0]!
    expect(obstacle).toBeDefined()
    const s = engine.state
    s.W = 960; s.H = 540
    s.mobs.length = 0
    s.spawnT = 99999
    s.hero!.attack = 99999
    s.hero!.x = obstacle.x
    s.hero!.y = obstacle.y
    engine.advance(0.016)
    expect(Math.hypot(s.hero!.x - obstacle.x, s.hero!.y - obstacle.y))
      .toBeGreaterThanOrEqual(obstacle.r + 16.9)
  })

  it('keeps all four original legacy mode scenes intact and inactive when no biome is selected', () => {
    for (const mode of ['quick', 'standard', 'endless', 'challenge'] as const satisfies readonly RunModeId[]) {
      const engine = createEngine({ audio: audio() })
      engine.selectRunMode(mode)
      engine.start()
      expect(engine.activeBiomeId).toBeNull()
      expect(engine.state.currentScene).toBe(0)
    }
  })

  it('freezes the environment while paused and restarts in the correct environment', () => {
    const engine = createEngine({ audio: audio() })
    engine.selectRunMode('boss-rush')
    engine.start()
    engine.state.W = 960; engine.state.H = 540
    engine.togglePause()
    const position = { x: engine.state.hero!.x, y: engine.state.hero!.y }
    engine.advance(1)
    expect(engine.state.hero).toMatchObject(position)
    engine.togglePause()
    engine.goMenu()
    engine.selectRunMode('relic-hunt')
    engine.start()
    expect(engine.activeBiomeId).toBe('abyssal-necropolis')
  })
})
