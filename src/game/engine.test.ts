import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEngine, type Engine } from './engine'
import type { AudioSystem } from './audio/types'
import { DURATION } from './constants'
import { seeded, setRandom } from './math'
import type { GameMode, SfxCue } from './types'

class SpyAudio implements AudioSystem {
  cues: SfxCue[] = []
  screens: GameMode[] = []
  unlocked = false
  wakeCalls = 0
  interruptions = 0
  musicOn = true
  sfxOn = true
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
afterEach(() => setRandom())

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

  it('surviving to DURATION ends in victory', () => {
    engine.start()
    engine.state.mobs = []
    engine.state.time = DURATION - 0.01
    engine.advance(0.033)
    expect(engine.ui.mode).toBe('result')
    expect(audio.cues).toContain('victory')
    expect(engine.ui.ending).toBe('🏆 遠征勝利！')
  })

  it('dying ends in defeat', () => {
    engine.start()
    const hero = engine.state.hero!
    hero.hp = 1
    engine.state.mobs = [{ x: hero.x, y: hero.y, type: 'slime', hp: 30, max: 30, r: 18, speed: 0, dmg: 50, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }]
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

describe('keyboard and focus', () => {
  let stop: () => void
  beforeEach(() => { stop = engine.listen(window) })
  afterEach(() => stop())

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
    expect(engine.state.hero!.skills[first]).toBe(1)
  })

  it('window blur pauses a running game', () => {
    engine.start()
    window.dispatchEvent(new Event('blur'))
    expect(engine.ui.mode).toBe('paused')
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

  it('pauses on hidden or pagehide, never silently resumes on visibility return', () => {
    const stop = engine.listen(window)
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    engine.start()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(engine.ui.mode).toBe('paused')
    expect(audio.interruptions).toBe(1)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(engine.ui.mode).toBe('paused')
    engine.togglePause()
    expect(engine.ui.mode).toBe('play')
    window.dispatchEvent(new Event('pagehide'))
    expect(engine.ui.mode).toBe('paused')
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
