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

  it('schedules a real boss encounter instead of just recording Boss Rush metadata', () => {
    const engine = createEngine({ audio: silentAudio() })
    engine.selectRunMode('boss-rush' as RunModeId)
    engine.start()
    if (!engine.state.hero) throw new Error('No live hero')
    engine.state.hero.inv = 200
    // Keep this encounter test free from level-up modal interruptions.
    // Gameplay ticks must still create the real boss at its scheduled time.
    engine.state.hero.attack = Number.POSITIVE_INFINITY
    engine.state.spawnT = Number.POSITIVE_INFINITY
    engine.state.mobs = []
    for (let tick = 0; tick < 27; tick++) engine.advance(1)
    expect(engine.state.mobs.some(mob => mob.type === 'boss' && mob.hp > 0)).toBe(true)
    expect(engine.state.mode).toBe('play')
    expect(engine.ui.objectiveProgress?.bosses).toBe(0)
  })

  it('freezes the authoritative Endless Eclipse objective clock during pause', () => {
    const engine = createEngine({ audio: silentAudio() })
    engine.selectRunMode('endless-eclipse' as RunModeId)
    engine.start()
    engine.advance(1)
    const before = engine.ui.objectiveProgress?.seconds
    expect(before).toBeGreaterThan(0)
    engine.togglePause()
    engine.advance(10)
    expect(engine.ui.objectiveProgress?.seconds).toBe(before)
    expect(engine.state.mode).toBe('paused')
  })

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
