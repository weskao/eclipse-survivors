import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEngine, type Engine } from './engine'
import type { AudioSystem } from './audio/types'
import { DURATION } from './constants'
import { seeded, setRandom } from './math'
import { inventorySnapshot } from './content/relics/runtime'
import type { GameMode, SfxCue, UpgradeId } from './types'

class SpyAudio implements AudioSystem {
  cues: SfxCue[] = []
  screens: GameMode[] = []
  unlocked = false
  wakeCalls = 0
  interruptions = 0
  musicOn = true
  sfxOn = true
  musicVolume = 100
  sfxVolume = 100
  setMusicVolume(value: number): void { this.musicVolume = value }
  setSfxVolume(value: number): void { this.sfxVolume = value }
  wake(): void { this.unlocked = true; this.wakeCalls++ }
  interrupt(): void { this.interruptions++ }
  setCombatIntensity(): void {}
  playSfx(cue: SfxCue): void { this.cues.push(cue) }
  tick(): void {}
  onScreen(mode: GameMode): void { this.screens.push(mode) }
  resetBattleClock(): void {}
  toggleMusic(): boolean { return (this.musicOn = !this.musicOn) }
  toggleSfx(): boolean { return (this.sfxOn = !this.sfxOn) }
  disposed = 0
  dispose(): void { this.disposed++ }
}

let audio: SpyAudio
let engine: Engine
beforeEach(() => {
  setRandom(seeded(7))
  audio = new SpyAudio()
  engine = createEngine({ audio })
  engine.state.W = 1280
  engine.state.H = 720
})
afterEach(() => {
  setRandom()
  localStorage.removeItem('eclipseUpgradeEffect')
  localStorage.removeItem('eclipseCameraShake')
})

const key = (code: string): void => { window.dispatchEvent(new KeyboardEvent('keydown', { code })) }

describe('engine commands fire the original cues', () => {
  it('select → spotlight choice + select cue', () => {
    engine.selectJob('ranger')
    expect(engine.ui.choice).toBe('ranger')
    expect(audio.cues).toEqual(['select'])
  })

  it('start → play mode, 12 mobs, start cue, hud filled', () => {
    engine.start()
    expect(engine.ui.mode).toBe('play')
    expect(engine.testApi.enemies).toBe(12)
    expect(audio.cues).toContain('start')
    expect(engine.ui.hud.who).toBe('曙鋼騎士 · LV.1')
    expect(engine.ui.toastText).toBe('幽暮之門已開啟')
  })

  it('starts every new specialization at level one without a fabricated initial upgrade queue', () => {
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const) {
      engine.selectHero(id)
      engine.start()
      expect(engine.ui.mode, id).toBe('play')
      expect(engine.state.hero?.level, id).toBe(1)
      expect(engine.state.levelQueue, id).toBe(0)
      expect(engine.ui.heroId, id).toBe(id)
      engine.goMenu()
    }
  })

  it('opens settings from gameplay safely and restores play after closing', () => {
    engine.start()
    engine.openSettings()
    expect(engine.ui.settingsOpen).toBe(true)
    expect(engine.ui.mode).toBe('paused')
    const stop = engine.listen(window)
    key('KeyP')
    expect(engine.ui.mode).toBe('paused')
    key('Escape')
    expect(engine.ui.settingsOpen).toBe(false)
    expect(engine.ui.mode).toBe('play')
    stop()
  })

  it('keeps the skill selection state intact when settings are opened during an upgrade', () => {
    engine.start()
    engine.testApi.level()
    const stop = engine.listen(window)
    engine.openSettings()
    key('Digit1')
    expect(engine.ui.mode).toBe('level')
    engine.closeSettings()
    expect(engine.ui.mode).toBe('level')
    stop()
  })

  it('persists still/soft upgrade effects and combat camera motion preferences', () => {
    expect(engine.ui.upgradeEffect).toBe('soft')
    expect(engine.ui.cameraShake).toBe(true)
    engine.setUpgradeEffect('still')
    engine.setCameraShake(false)
    expect(engine.ui.upgradeEffect).toBe('still')
    expect(engine.ui.cameraShake).toBe(false)
    expect(localStorage.getItem('eclipseUpgradeEffect')).toBe('still')
    expect(localStorage.getItem('eclipseCameraShake')).toBe('off')
    const reloaded = createEngine({ audio })
    expect(reloaded.ui.upgradeEffect).toBe('still')
    expect(reloaded.ui.cameraShake).toBe(false)
  })

  it('freezes upgrade-scene ambient motion only in still mode', () => {
    engine.start()
    engine.testApi.level()
    const before = engine.state.worldClock
    engine.advance(0.2)
    expect(engine.state.worldClock).toBeGreaterThan(before)
    engine.setUpgradeEffect('still')
    const frozen = engine.state.worldClock
    engine.advance(0.2)
    expect(engine.state.worldClock).toBe(frozen)
    expect(engine.ui.mode).toBe('level')
  })

  it('sends slider changes to the audio system and updates the UI', () => {
    engine.setMusicVolume(43)
    engine.setSfxVolume(17)
    expect(engine.ui.musicVolume).toBe(43)
    expect(engine.ui.sfxVolume).toBe(17)
  })

  it('pause/resume cues and mode round-trip', () => {
    engine.start()
    engine.togglePause()
    expect(engine.ui.mode).toBe('paused')
    engine.togglePause()
    expect(engine.ui.mode).toBe('play')
    expect(audio.cues.slice(-2)).toEqual(['pause', 'resume'])
  })

  it('level-up offers 3 upgrades with the level cue; choosing plays upgrade', () => {
    engine.start()
    engine.testApi.level()
    expect(engine.ui.mode).toBe('level')
    expect(engine.ui.upgrades).toHaveLength(3)
    expect(audio.cues).toContain('level')
    engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
    expect(engine.ui.mode).toBe('play')
    expect(audio.cues.at(-1)).toBe('upgrade')
  })

  it('discards camera impact when the level-up picker opens and after choosing a skill', () => {
    engine.start()
    engine.state.cameraKick = 8
    engine.testApi.level()
    expect(engine.ui.mode).toBe('level')
    expect(engine.state.cameraKick).toBe(0)
    engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
    expect(engine.ui.mode).toBe('play')
    expect(engine.state.cameraKick).toBe(0)
  })

  it('handles three queued level-ups, rejects a hidden choice and updates equipped HUD skills', () => {
    engine.start()
    engine.testApi.level()
    engine.testApi.level()
    engine.testApi.level()
    expect(engine.state.levelQueue).toBe(3)
    expect(engine.ui.mode).toBe('level')
    engine.chooseUpgrade('guardian-sanctuary')
    expect(engine.state.levelQueue).toBe(3)
    for (let i = 0; i < 3; i++) {
      const choices = engine.ui.upgrades
      expect(new Set(choices.map(item => item.id)).size).toBe(choices.length)
      engine.chooseUpgrade(choices[0]!.id)
      expect(engine.state.levelQueue).toBe(2 - i)
      expect(engine.ui.mode).toBe(i < 2 ? 'level' : 'play')
    }
    expect(engine.ui.hud.skills.length).toBeGreaterThan(0)
    expect(engine.ui.hud.skills.every(item =>
      item.id in engine.state.hero!.skills || item.id in engine.state.hero!.evolutions ||
      item.id in engine.state.content.levels,
    )).toBe(true)
  })

  it('surviving to DURATION after boss defeat ends in victory', () => {
    engine.start()
    engine.state.mobs = []
    engine.state.time = DURATION - 0.01
    engine.state.bossSpawned = true
    engine.state.bossDefeated = true
    engine.advance(0.033)
    expect(engine.ui.mode).toBe('result')
    expect(audio.cues).toContain('victory')
    expect(engine.ui.ending).toBe('🏆 遠征勝利！')
  })

  it('dying ends in defeat', () => {
    engine.start()
    const hero = engine.state.hero!
    hero.hp = 1
    engine.state.mobs = [{ x: hero.x, y: hero.y, type: 'slime', hp: 30, max: 30, r: 18, speed: 0, dmg: 50, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ai: { state: 'attack', timer: 0.1, attack: 'pounce', aimX: hero.x, aimY: hero.y, dirX: 0, dirY: 0, cycle: 0 } }]
    hero.attack = 10
    engine.advance(0.016)
    expect(engine.ui.mode).toBe('result')
    expect(audio.cues).toContain('hurt')
    expect(audio.cues).toContain('defeat')
    expect(engine.ui.ending).toBe('💀 冒險結束')
  })

  it('toggles reflect the audio system', () => {
    engine.toggleMusic()
    engine.toggleSfx()
    expect(engine.ui.musicOn).toBe(false)
    expect(engine.ui.sfxOn).toBe(false)
  })

  it('goMenu returns to the menu', () => {
    engine.start()
    engine.goMenu()
    expect(engine.ui.mode).toBe('menu')
  })
})

describe('ES2 live treasure selection', () => {
  it('turns a real chest pickup into exactly one selectable relic without losing original XP behavior', () => {
    engine.start()
    const s = engine.state
    const hero = s.hero!
    s.mobs = []
    s.spawnT = 100
    s.nextEventAt = Infinity
    s.events = [{ id: 1, kind: 'chest', x: hero.x, y: hero.y, expiresAt: s.time + 30 }]
    engine.advance(0.016)
    expect(engine.ui.mode).toBe('level')
    expect(engine.ui.specialChoice?.kind).toBe('treasure')
    expect(engine.ui.specialChoice?.items).toHaveLength(3)
    expect(hero.xp).toBe(0)
    const id = engine.ui.specialChoice!.items[0]!.id
    engine.chooseTreasure(id)
    expect(engine.ui.specialChoice).toBeNull()
    expect(engine.ui.mode).toBe('play')
    expect(inventorySnapshot(s).items).toHaveLength(1)
    engine.chooseTreasure(id)
    expect(inventorySnapshot(s).items).toHaveLength(1)
  })
})

describe('keyboard and focus', () => {
  let stop: () => void
  beforeEach(() => { stop = engine.listen(window) })
  afterEach(() => stop())

  it('shows the menu music activation as pending until a user gesture unlocks audio', () => {
    expect(engine.ui.audioUnlocked).toBe(false)
    expect(engine.ui.musicOn).toBe(true)
    key('KeyA')
    expect(engine.ui.audioUnlocked).toBe(true)
    expect(engine.ui.musicOn).toBe(true)
  })

  it("explicit menu music activation never toggles the user\'s music preference", () => {
    expect(engine.ui.audioUnlocked).toBe(false)
    engine.enableMenuAudio()
    expect(engine.ui.audioUnlocked).toBe(true)
    expect(engine.ui.musicOn).toBe(true)
  })

  it('menu keydown unlocks audio only when music is on', () => {
    engine.toggleMusic()
    key('KeyA')
    expect(audio.unlocked).toBe(false)
    engine.toggleMusic()
    key('KeyA')
    expect(audio.unlocked).toBe(true)
  })

  it('P pauses and resumes; digit 1 picks the first upgrade', () => {
    engine.start()
    key('KeyP')
    expect(engine.ui.mode).toBe('paused')
    key('Escape')
    expect(engine.ui.mode).toBe('play')
    engine.testApi.level()
    const first = engine.ui.upgrades[0]!.id
    key('Digit1')
    expect(engine.ui.mode).toBe('play')
    expect(engine.state.hero!.skills[first as UpgradeId]).toBe(1)
  })

  it('selects upgrades using numpad positions even with a non-English IME', () => {
    engine.start()
    engine.testApi.level()
    const second = engine.ui.upgrades[1]!.id
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Numpad2', key: 'Process', isComposing: true }))
    expect(engine.ui.mode).toBe('play')
    expect(engine.state.hero!.skills[second as UpgradeId]).toBe(1)
  })

  it('window blur does not pause a run or leave movement stuck', () => {
    engine.start()
    key('KeyD')
    engine.advance(0.05)
    const movingSpeed = engine.state.hero!.vx
    expect(movingSpeed).toBeGreaterThan(0)
    window.dispatchEvent(new Event('blur'))
    expect(engine.ui.mode).toBe('play')
    expect(audio.interruptions).toBe(0)
    engine.advance(0.05)
    expect(engine.state.hero!.vx).toBeLessThan(movingSpeed)
  })

  it('pointerdown on a button wakes audio and plays the ui cue', () => {
    const b = document.createElement('button')
    document.body.append(b)
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(audio.unlocked).toBe(true)
    expect(audio.cues).toContain('ui')
    b.remove()
  })
})

describe('engine victory integration', () => {
  it('keeps playing beyond the deadline until the required boss has been killed', () => {
    engine.start()
    engine.state.time = DURATION - 0.01
    engine.state.bossSpawned = true
    engine.state.mobs = [{ x: 500, y: 0, type: 'boss', hp: 1, max: 1, r: 48, speed: 0, dmg: 32, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }]
    engine.advance(0.033)
    expect(engine.ui.mode).toBe('play')
    engine.state.mobs[0]!.hp = 0
    // A corpse removed externally is not proof that the boss was defeated by the player.
    engine.advance(0.033)
    expect(engine.ui.mode).toBe('play')
  })
})

describe('interruption and input lifecycle', () => {
  it('clears held movement when leaving a run and starting again', () => {
    const stop = engine.listen(window)
    engine.start()
    key('KeyD')
    engine.advance(0.05)
    expect(engine.state.hero!.x).toBeGreaterThan(0)
    engine.goMenu()
    engine.start()
    engine.advance(0.05)
    expect(engine.state.hero!.x).toBe(0)
    stop()
  })

  it('keeps gameplay running when hidden or pagehide, while interrupting background audio', () => {
    const stop = engine.listen(window)
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    engine.start()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(engine.ui.mode).toBe('play')
    expect(audio.interruptions).toBe(1)
    const elapsed = engine.state.time
    engine.advance(0.016)
    expect(engine.state.time).toBeGreaterThan(elapsed)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(engine.ui.mode).toBe('play')
    key('KeyA')
    window.dispatchEvent(new Event('pagehide'))
    expect(engine.ui.mode).toBe('play')
    expect(audio.interruptions).toBe(2)
    hidden.mockRestore()
    stop()
  })

  it('wakes audio from gameplay keyboard input, and pause clears held keys', () => {
    const stop = engine.listen(window)
    engine.start()
    key('KeyD')
    engine.togglePause()
    engine.togglePause()
    engine.advance(0.05)
    expect(engine.state.hero!.x).toBe(0)
    expect(audio.wakeCalls).toBeGreaterThan(1)
    stop()
  })
})
