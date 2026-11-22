import { expect, it } from 'vitest'
import { createEngine } from '../../engine'
import { BOSS_DEFINITIONS, type BossId } from './definitions'
import { getMode } from '../../../meta/modes'
import type { AudioSystem } from '../../audio/types'

function silentAudio(): AudioSystem {
  return {
    unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
    wake() {}, interrupt() {}, dispose() {}, tick() {}, onScreen() {},
    setMusicVolume() {}, setSfxVolume() {}, setCombatIntensity() {},
    playSfx() {}, resetBattleClock() {},
    toggleMusic() { return false }, toggleSfx() { return false },
  }
}

it('spawns each of the four new bosses in the real game loop across runs', () => {
  const engine = createEngine({ audio: silentAudio() })
  const sequence: BossId[] = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph']
  engine.state.W = 1280
  engine.state.H = 720

  for (const id of sequence) {
    engine.start()
    engine.state.mobs = []
    engine.state.spawnT = 999
    engine.state.time = getMode(engine.state.runMode).bossAt + 0.1
    engine.state.hero!.attack = 999
    engine.advance(1 / 60)
    const livingBosses = engine.state.mobs.filter(mob => mob.type === 'boss' && mob.hp > 0)
    expect(livingBosses, id).toHaveLength(1)
    const expectedHp = Math.round(BOSS_DEFINITIONS[id].health * getMode(engine.state.runMode).modifiers.enemyHp)
    expect(livingBosses[0]!.max, id).toBe(expectedHp)
    expect(livingBosses[0]!.ai?.state, id).toBe('recover')
  }
})
