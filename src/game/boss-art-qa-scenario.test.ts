import { afterEach, describe, expect, it } from 'vitest'
import { createEngine } from './engine'
import type { AudioSystem } from './audio/types'
import { BOSS_DEFINITIONS, type BossId } from './content/bosses/definitions'

const originalUrl = window.location.href
afterEach(() => window.history.replaceState({}, '', originalUrl))

function silentAudio(): AudioSystem {
  return {
    unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
    wake() {}, interrupt() {}, dispose() {}, tick() {}, onScreen() {},
    setMusicVolume() {}, setSfxVolume() {}, setCombatIntensity() {},
    playSfx() {}, resetBattleClock() {},
    toggleMusic() { return false }, toggleSfx() { return false },
  }
}

describe('development-only 4-boss visual QA scene', () => {
  for (const id of Object.keys(BOSS_DEFINITIONS) as BossId[]) {
    for (const phase of [1, 2, 3] as const) {
      it(`${id} phase ${phase} uses the correct controller and real renderer snapshot`, () => {
        window.history.replaceState({}, '', `/?showcase=1&es2BossArtQa=${id}`)
        const engine = createEngine({ audio: silentAudio() })
        engine.state.W = 375
        engine.state.H = 812
        engine.start()
        engine.testApi.showcaseBoss(phase)
        const boss = engine.state.mobs.filter(mob => mob.type === 'boss' && mob.hp > 0)
        expect(boss).toHaveLength(1)
        expect(boss[0]!.bossArtId).toBe(id)
        expect(boss[0]!.bossPhase).toBe(phase)
        expect(engine.testApi.bossPreview).toEqual({ id, phase })
      })
    }
  }

  for (const [width, height] of [[390, 844], [844, 390], [1440, 900]] as const) {
    it(`frames the complete boss within the ${width}x${height} DEV review viewport`, () => {
      window.history.replaceState({}, '', '/?showcase=1&es2BossArtQa=eclipse-seraph')
      const engine = createEngine({ audio: silentAudio() })
      engine.state.W = width
      engine.state.H = height
      engine.start()
      engine.testApi.showcaseBoss(3)
      const boss = engine.state.mobs.find(mob => mob.type === 'boss')!
      const hero = engine.state.hero!
      const screenX = width / 2 + boss.x - hero.x
      const screenY = height / 2 + boss.y - hero.y
      expect(screenX - 118).toBeGreaterThanOrEqual(4)
      expect(screenX + 118).toBeLessThanOrEqual(width - 4)
      expect(screenY - 236).toBeGreaterThanOrEqual(height < 500 ? 88 : 4)
      expect(screenY).toBeLessThanOrEqual(height - 20)
    })
  }

  it('does not enable the review boss outside explicit DEV showcase mode', () => {
    window.history.replaceState({}, '', '/?es2BossArtQa=eclipse-seraph')
    const engine = createEngine({ audio: silentAudio() })
    engine.start()
    engine.testApi.showcaseBoss(2)
    expect(engine.state.mobs.filter(mob => mob.type === 'boss')).toHaveLength(1)
    expect(engine.testApi.bossPreview.id).toBeNull()
  })

  it('rejects an unknown boss id rather than using it for the live controller', () => {
    window.history.replaceState({}, '', '/?showcase=1&es2BossArtQa=invalid')
    const engine = createEngine({ audio: silentAudio() })
    engine.start()
    engine.testApi.showcaseBoss(1)
    expect(engine.testApi.bossPreview.id).toBeNull()
  })
})
