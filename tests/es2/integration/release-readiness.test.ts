import { describe, expect, it } from 'vitest'
import { createEngine } from '../../../src/game/engine'
import type { AudioSystem } from '../../../src/game/audio/types'
import type { HeroId } from '../../../src/game/types'
import { HERO_DEFINITIONS, isSpecializationId } from '../../../src/game/content/heroes'
import type { RunModeId } from '../../../src/meta/types'

function silentAudio(): AudioSystem {
  return {
    unlocked: false, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
    wake() {}, interrupt() {}, setCombatIntensity() {}, playSfx() {},
    tick() {}, onScreen() {}, resetBattleClock() {}, dispose() {},
    toggleMusic: () => false, toggleSfx: () => false,
    setMusicVolume() {}, setSfxVolume() {},
  }
}

describe('ES2 release gate: real game-session selection (RED until host wiring)', () => {
  it.each(['shadowblade', 'spirit-summoner', 'crimson-paladin'])(
    'starts a playable session with the real %s hero identity',
    id => {
      const engine = createEngine({ audio: silentAudio() })
      engine.selectHero(id as HeroId)
      expect(engine.ui.heroId).toBe(id)
      expect(() => engine.start()).not.toThrow()
      // heroId is authoritative; choice is the unchanged legacy sprite fallback.
      expect(engine.state.heroId).toBe(id)
      expect(isSpecializationId(id)).toBe(true)
      if (!isSpecializationId(id)) throw new Error('Expected a new hero')
      expect(engine.state.choice).toBe(HERO_DEFINITIONS[id].legacyArtJob)
      expect(engine.state.hero?.max).toBe(HERO_DEFINITIONS[id].stats.hp)
      expect(engine.state.hero).not.toBeNull()
      expect(engine.state.mode).toBe('play')
    },
  )

  it.each(['boss-rush', 'endless-eclipse', 'relic-hunt', 'cursed-expedition', 'chaos-arena'])(
    'starts a session with authoritative %s rules rather than falling back to quick',
    id => {
      const engine = createEngine({ audio: silentAudio() })
      engine.selectRunMode(id as unknown as RunModeId)
      expect(engine.ui.runMode).toBe(id)
      engine.start()
      expect(engine.state.runMode).toBe(id)
      expect(engine.state.mode).toBe('play')
    },
  )
})
