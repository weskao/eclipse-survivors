import { beforeEach, describe, expect, it } from 'vitest'
import { createEngine } from '../../../src/game/engine'
import { createMetaProgressionStore, META_V3_HEAD_KEY } from '../../../src/game/content/meta/store'
import { createProfileStore, SAVE_KEY } from '../../../src/meta/profile'
import type { AudioSystem } from '../../../src/game/audio/types'
import type { RunStats } from '../../../src/meta/types'

const audio: AudioSystem = {
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 100, sfxVolume: 100,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, playSfx() {}, tick() {},
  onScreen() {}, resetBattleClock() {}, toggleMusic: () => false,
  toggleSfx: () => false, interrupt() {}, setCombatIntensity() {}, dispose() {},
}
const legacyRun = (id: string): RunStats => ({
  id, mode: 'quick', hero: 'knight', victory: true, seconds: 151,
  kills: 80, level: 9, damageDealt: 1200, damageTaken: 0,
  remainingHp: 70, bossDefeated: true, enemies: { boss: 1, slime: 79 }, abilities: [],
})
function finish(engine: ReturnType<typeof createEngine>): void {
  engine.start()
  engine.state.time = 151
  engine.state.kill = 20
  engine.state.bossSpawned = true
  engine.state.bossDefeated = true
  engine.state.hero!.attack = 99999
  engine.state.mobs = []
  engine.advance(0.016)
  expect(engine.ui.mode).toBe('result')
}
beforeEach(() => localStorage.clear())

describe('integration cutover: one v3 currency writer and preserved v2 snapshot', () => {
  it('migrates legacy v2 balances once without writing any completed run back to v2', () => {
    const legacy = createProfileStore(localStorage)
    legacy.recordRun(legacyRun('legacy-1'))
    const oldBytes = localStorage.getItem(SAVE_KEY)
    const oldBalance = legacy.get().embers
    const engine = createEngine({ audio })
    finish(engine)
    expect(localStorage.getItem(SAVE_KEY)).toBe(oldBytes)
    expect(localStorage.getItem(META_V3_HEAD_KEY)).not.toBeNull()
    const snapshot = createMetaProgressionStore(localStorage).get()
    expect(snapshot.status).toBe('ready')
    expect(snapshot.state?.runs).toBe(2)
    expect(snapshot.state!.embers).toBeGreaterThan(oldBalance)
    expect(engine.ui.profile.runs).toBe(2)
    expect(engine.ui.profile.embers).toBe(snapshot.state?.embers)
    engine.advance(0.016)
    expect(createMetaProgressionStore(localStorage).get().state?.runs).toBe(2)
  })

  it('never pays the original v2 writer from an ordinary new engine session', () => {
    const engine = createEngine({ audio })
    finish(engine)
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
    expect(createMetaProgressionStore(localStorage).get().state?.runs).toBe(1)
  })
})
