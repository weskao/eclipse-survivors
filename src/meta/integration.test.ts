import { beforeEach, describe, expect, it } from 'vitest'
import { BALANCE } from '../game/config'
import { createMetaState } from '../game/content/meta/state'
import { META_V3_HEAD_KEY, META_V3_SLOT_KEYS } from '../game/content/meta/store'
import { createEngine } from '../game/engine'
import { createProfileStore } from './profile'
import type { AudioSystem } from '../game/audio/types'
import type { GameMode, SfxCue } from '../game/types'

const audio: AudioSystem = {
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 100, sfxVolume: 100,
  setMusicVolume() {}, setSfxVolume() {},
  wake() {}, playSfx(_cue: SfxCue) {}, tick() {},
  onScreen(_mode: GameMode) {}, resetBattleClock() {}, toggleMusic: () => false,
  toggleSfx: () => false, interrupt() {}, setCombatIntensity() {}, dispose() {},
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
    expect(engine.state.cosmetic).toBe('knight-default')
    engine.state.time = 700
    engine.state.bossSpawned = true
    engine.state.bossDefeated = true
    engine.state.hero!.attack = 999
    engine.state.mobs = []
    engine.advance(0.016)
    expect(engine.ui.mode).toBe('play')
  })
  it('applies purchased insight, scavenging and starting blessings only once on run start', () => {
    const state = createMetaState()
    state.research = { ...state.research, power: 1, vitality: 1, insight: 3, scavenging: 2 }
    state.bonuses = ['ember-spark', 'wanderer-kit', 'guardian-vow']
    localStorage.setItem(META_V3_SLOT_KEYS.a, JSON.stringify({
      schema: 'eclipse-survivors.meta.v3', revision: 1, state, legacyProfile: null,
    }))
    localStorage.setItem(META_V3_HEAD_KEY, JSON.stringify({ version: 3, slot: 'a', revision: 1 }))
    const engine = createEngine({ audio })
    engine.start()
    const hero = engine.state.hero!
    const research = BALANCE.meta.research
    expect(hero.damage).toBeCloseTo(32 * (1 + research.power.benefitPerRank))
    expect(hero.max).toBe(Math.round((BALANCE.heroes.classic.knight.hp + research.vitality.benefitPerRank)
      * (1 + BALANCE.meta.startingBonuses['guardian-vow'].bonus)))
    expect(engine.state.xpGainMultiplier).toBeCloseTo(1 + research.insight.benefitPerRank * 3
      + BALANCE.meta.startingBonuses['ember-spark'].bonus)
    expect(engine.state.pickupGainMultiplier).toBeCloseTo(1 + research.scavenging.benefitPerRank * 2
      + BALANCE.meta.startingBonuses['wanderer-kit'].bonus)
    engine.goMenu()
    engine.start()
    expect(engine.state.hero!.max).toBe(hero.max)
    expect(engine.state.xpGainMultiplier).toBeCloseTo(1.04)
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
