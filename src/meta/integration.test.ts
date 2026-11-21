import { beforeEach, describe, expect, it } from 'vitest'
import { createEngine } from '../game/engine'
import { createProfileStore } from './profile'
import type { AudioSystem } from '../game/audio/types'
import type { GameMode, SfxCue } from '../game/types'

const audio: AudioSystem = {
  unlocked: true, musicOn: false, sfxOn: false, wake() {}, playSfx(_cue: SfxCue) {}, tick() {},
  onScreen(_mode: GameMode) {}, resetBattleClock() {}, toggleMusic: () => false,
  toggleSfx: () => false, dispose() {},
}
beforeEach(() => localStorage.clear())

describe('progression engine integration', () => {
  it('selects and preserves game mode when restarting', () => {
    const engine = createEngine({ audio, profileStore: createProfileStore(localStorage) })
    engine.selectRunMode('standard')
    engine.start()
    expect(engine.state.runMode).toBe('standard')
    engine.goMenu()
    engine.start()
    expect(engine.state.runMode).toBe('standard')
  })
  it('applies purchased upgrades to the next run and keeps endless mode running', () => {
    const store = createProfileStore(localStorage)
    store.recordRun({ id: 'funds', mode: 'quick', hero: 'knight', victory: true, seconds: 151,
      kills: 100, level: 10, damageDealt: 100, damageTaken: 0, remainingHp: 100,
      bossDefeated: true, enemies: { boss: 1 }, abilities: [] })
    expect(store.buyUpgrade('power')).toBe(true)
    const engine = createEngine({ audio, profileStore: store })
    engine.selectRunMode('endless')
    engine.start()
    expect(engine.state.hero!.damage).toBeCloseTo(32 * 1.04)
    engine.state.time = 700
    engine.state.bossSpawned = true
    engine.state.bossDefeated = true
    engine.state.hero!.attack = 999
    engine.state.mobs = []
    engine.advance(0.016)
    expect(engine.ui.mode).toBe('play')
  })
  it('saves a completed run once, including stats, and restores after restart', () => {
    const store = createProfileStore(localStorage)
    const engine = createEngine({ audio, profileStore: store })
    engine.start()
    engine.state.time = 151
    engine.state.kill = 19
    engine.state.bossSpawned = true
    engine.state.bossDefeated = true
    engine.state.mobs = []
    engine.state.hero!.attack = 999
    engine.advance(0.016)
    expect(engine.ui.mode).toBe('result')
    expect(engine.ui.runResult?.kills).toBe(19)
    expect(store.get().runs).toBe(1)
    engine.advance(0.016)
    expect(store.get().runs).toBe(1)
    expect(createProfileStore(localStorage).get().best.quick?.kills).toBe(19)
  })
})
