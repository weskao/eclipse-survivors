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
    const arrival = getMode(engine.state.runMode).bossAt
    engine.state.time = arrival - 12
    expect(engine.bossArrivalWarning, id).toMatchObject({ bossId: id, seconds: 12, urgent: false })
    engine.state.time = arrival + 0.1
    engine.state.hero!.attack = 999
    engine.advance(1 / 60)
    const livingBosses = engine.state.mobs.filter(mob => mob.type === 'boss' && mob.hp > 0)
    expect(livingBosses, id).toHaveLength(1)
    expect(livingBosses[0]!.bossArtId, id).toBe(id)
    expect(engine.bossArrivalWarning, id).toBeNull()
    const expectedHp = Math.round(BOSS_DEFINITIONS[id].health * getMode(engine.state.runMode).modifiers.enemyHp)
    expect(livingBosses[0]!.max, id).toBe(expectedHp)
    expect(livingBosses[0]!.ai?.state, id).toBe('recover')
  }
})

it('presents and sounds each authoritative phase transition once, and clears it when leaving combat', () => {
  const audio = silentAudio()
  const played: string[] = []
  audio.playSfx = cue => { played.push(cue) }
  const engine = createEngine({ audio })
  engine.state.W = 1280; engine.state.H = 720
  engine.selectRunMode('standard')
  engine.start()
  const s = engine.state
  s.mobs = []; s.spawnT = 999
  s.time = getMode(s.runMode).bossAt + .1
  s.hero!.attack = 999
  engine.advance(1 / 60)
  const boss = s.mobs.find(m => m.type === 'boss')!
  expect(boss).toBeDefined()
  expect(engine.ui.bossPhaseReveal).toBeNull()
  boss.hp = boss.max * .6
  engine.advance(1 / 60)
  expect(engine.ui.bossPhaseReveal).toMatchObject({ boss: 'abyss-monarch', phase: 2 })
  expect(played.filter(cue => cue === 'boss-phase-2')).toHaveLength(1)
  const event = engine.ui.bossPhaseReveal
  engine.advance(1 / 60)
  expect(engine.ui.bossPhaseReveal).toBe(event)
  expect(played.filter(cue => cue === 'boss-phase-2')).toHaveLength(1)
  boss.hp = boss.max * .25
  engine.advance(1 / 60)
  expect(engine.ui.bossPhaseReveal).toMatchObject({ boss: 'abyss-monarch', phase: 3 })
  expect(played.filter(cue => cue === 'boss-phase-3')).toHaveLength(1)
  engine.goMenu()
  expect(engine.ui.bossPhaseReveal).toBeNull()
})
