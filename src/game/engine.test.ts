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
  resultThemes: Array<'victory' | 'defeat' | null> = []
  setResultTheme(theme: 'victory' | 'defeat' | null): void { this.resultThemes.push(theme) }
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

describe('home selection persistence', () => {
  it.each([
    ['knight', 'knight', 'quick'],
    ['ranger', 'ranger', 'standard'],
    ['wizard', 'wizard', 'endless'],
    ['shadowblade', 'knight', 'challenge'],
    ['spirit-summoner', 'wizard', 'boss-rush'],
    ['crimson-paladin', 'knight', 'endless-eclipse'],
    ['shadowblade', 'knight', 'relic-hunt'],
    ['spirit-summoner', 'wizard', 'cursed-expedition'],
    ['crimson-paladin', 'knight', 'chaos-arena'],
  ] as const)('restores %s with %s legacy job in %s mode before starting a run', (hero, job, mode) => {
    engine.selectHero(hero)
    engine.selectRunMode(mode)
    const freshAudio = new SpyAudio()
    const reopened = createEngine({ audio: freshAudio })
    expect(reopened.ui.heroId).toBe(hero)
    expect(reopened.ui.choice).toBe(job)
    expect(reopened.ui.runMode).toBe(mode)
    expect(reopened.state.heroId).toBe(hero)
    expect(reopened.state.choice).toBe(job)
    expect(freshAudio.cues).toEqual([])
    expect(freshAudio.wakeCalls).toBe(0)
    reopened.start()
    expect(reopened.state.heroId).toBe(hero)
    expect(reopened.state.runMode).toBe(mode)
  })

  it('reads the latest stored selection on returning from combat without a select cue', () => {
    engine.selectJob('ranger')
    engine.selectRunMode('standard')
    engine.start()
    localStorage.setItem('eclipseSelectedHero', 'spirit-summoner')
    localStorage.setItem('eclipseSelectedRunMode', 'relic-hunt')
    audio.cues.length = 0
    engine.goMenu()
    expect(engine.ui.mode).toBe('menu')
    expect(engine.ui.heroId).toBe('spirit-summoner')
    expect(engine.ui.choice).toBe('wizard')
    expect(engine.ui.runMode).toBe('relic-hunt')
    expect(audio.cues).toEqual(['scene'])
    engine.start()
    expect(engine.state.heroId).toBe('spirit-summoner')
    expect(engine.state.runMode).toBe('relic-hunt')
  })

  it('stores an explicitly selected default mode without replaying selection audio', () => {
    expect(localStorage.getItem('eclipseSelectedRunMode')).toBeNull()
    engine.selectRunMode('quick')
    expect(localStorage.getItem('eclipseSelectedRunMode')).toBe('quick')
    expect(audio.cues).toEqual([])
  })

  it('replaces both stored selections immediately, even without starting combat', () => {
    engine.selectHero('shadowblade')
    engine.selectRunMode('boss-rush')
    engine.selectJob('wizard')
    engine.selectRunMode('quick')
    expect(localStorage.getItem('eclipseSelectedHero')).toBe('wizard')
    expect(localStorage.getItem('eclipseSelectedRunMode')).toBe('quick')
    expect(createEngine({ audio }).ui).toMatchObject({ heroId: 'wizard', choice: 'wizard', runMode: 'quick' })
  })

  it.each(['removed-id', 'constructor', '__proto__', ''])('ignores invalid saved IDs (%s) independently', invalid => {
    localStorage.setItem('eclipseSelectedHero', invalid)
    localStorage.setItem('eclipseSelectedRunMode', 'challenge')
    expect(createEngine({ audio }).ui).toMatchObject({ heroId: 'knight', choice: 'knight', runMode: 'challenge' })
    localStorage.setItem('eclipseSelectedHero', 'ranger')
    localStorage.setItem('eclipseSelectedRunMode', invalid)
    expect(createEngine({ audio }).ui).toMatchObject({ heroId: 'ranger', choice: 'ranger', runMode: 'quick' })
  })

  it('keeps the active selection usable when storage writes are unavailable', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      engine.selectHero('shadowblade')
      engine.selectRunMode('challenge')
      engine.start()
      engine.goMenu()
      expect(engine.ui).toMatchObject({ heroId: 'shadowblade', choice: 'knight', runMode: 'challenge' })
    } finally { write.mockRestore() }
  })

  it('falls back independently on returning home when a previously stored choice is no longer available', () => {
    engine.selectHero('shadowblade')
    engine.selectRunMode('boss-rush')
    engine.start()
    localStorage.setItem('eclipseSelectedHero', 'removed-hero')
    engine.goMenu()
    expect(engine.ui).toMatchObject({ heroId: 'knight', choice: 'knight', runMode: 'boss-rush' })
    engine.selectHero('ranger')
    engine.start()
    localStorage.setItem('eclipseSelectedRunMode', 'removed-mode')
    engine.goMenu()
    expect(engine.ui).toMatchObject({ heroId: 'ranger', choice: 'ranger', runMode: 'quick' })
    expect(engine.state.runMode).toBe('quick')
  })

  it('revalidates each browser preference when the active account changes without playing a selection cue', () => {
    engine.selectHero('spirit-summoner')
    engine.selectRunMode('relic-hunt')
    audio.cues.length = 0
    const account = engine.cloudWallet!
    expect(account.select('selection-qa-a')).toBe(true)
    expect(engine.ui).toMatchObject({ heroId: 'spirit-summoner', choice: 'wizard', runMode: 'relic-hunt' })
    localStorage.setItem('eclipseSelectedHero', 'removed-hero')
    expect(account.select('selection-qa-b')).toBe(true)
    expect(engine.ui).toMatchObject({ heroId: 'knight', choice: 'knight', runMode: 'relic-hunt' })
    localStorage.setItem('eclipseSelectedHero', 'ranger')
    localStorage.setItem('eclipseSelectedRunMode', 'removed-mode')
    expect(account.select(null)).toBe(true)
    expect(engine.ui).toMatchObject({ heroId: 'ranger', choice: 'ranger', runMode: 'quick' })
    expect(audio.cues).toEqual([])
  })

  it('rejects specializations whose starting ability is no longer registered', () => {
    localStorage.setItem('eclipseSelectedHero', 'shadowblade')
    localStorage.setItem('eclipseSelectedRunMode', 'standard')
    const limited = createEngine({ audio, contentPacks: [] })
    expect(limited.ui).toMatchObject({ heroId: 'knight', choice: 'knight', runMode: 'standard' })
    limited.selectHero('shadowblade')
    expect(limited.ui.heroId).toBe('knight')
    expect(localStorage.getItem('eclipseSelectedHero')).toBe('shadowblade')
  })

  it('does not restore an older saved choice when the latest write fails', () => {
    engine.selectJob('ranger')
    engine.selectRunMode('standard')
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      engine.selectHero('crimson-paladin')
      engine.selectRunMode('challenge')
      engine.start()
      engine.goMenu()
      expect(engine.ui).toMatchObject({ heroId: 'crimson-paladin', choice: 'knight', runMode: 'challenge' })
      expect(engine.state.runMode).toBe('challenge')
    } finally { write.mockRestore() }
  })

  it('keeps the displayed and engine mode aligned before starting a run', () => {
    engine.selectRunMode('chaos-arena')
    expect(engine.ui.runMode).toBe('chaos-arena')
    expect(engine.state.runMode).toBe('chaos-arena')
  })

  it('ignores mode changes during combat and rejects invalid mode IDs', () => {
    engine.selectRunMode('constructor' as never)
    expect(engine.ui.runMode).toBe('quick')
    engine.selectRunMode('challenge')
    engine.start()
    engine.selectRunMode('endless')
    expect(engine.ui.runMode).toBe('challenge')
    expect(localStorage.getItem('eclipseSelectedRunMode')).toBe('challenge')
  })
})

describe('engine commands fire the original cues', () => {
  it('select → spotlight choice + dedicated hero-select cue', () => {
    engine.selectJob('ranger')
    expect(engine.ui.choice).toBe('ranger')
    expect(audio.cues).toEqual(['hero-select'])
  })

  it.each(['knight', 'ranger', 'wizard', 'shadowblade', 'spirit-summoner', 'crimson-paladin'] as const)('plays one confirmation for %s, including an explicit reselect', hero => {
    engine.selectHero(hero)
    expect(engine.ui.heroId).toBe(hero)
    expect(audio.cues).toEqual(['hero-select'])
    engine.selectHero(hero)
    expect(audio.cues).toEqual(['hero-select', 'hero-select'])
  })

  it('does not confirm an invalid or in-combat hero selection', () => {
    engine.selectHero('invalid' as never)
    expect(audio.cues).toEqual([])
    engine.start()
    audio.cues.length = 0
    engine.selectHero('ranger')
    expect(audio.cues).toEqual([])
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
    expect(engine.ui.cameraShake).toBe(false)
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

  it('starts stable for new players and restores explicitly enabled camera shake', () => {
    expect(localStorage.getItem('eclipseCameraShake')).toBeNull()
    expect(engine.ui.cameraShake).toBe(false)
    engine.setCameraShake(true)
    expect(localStorage.getItem('eclipseCameraShake')).toBe('on')
    expect(createEngine({ audio }).ui.cameraShake).toBe(true)
    engine.setCameraShake(false)
    expect(createEngine({ audio }).ui.cameraShake).toBe(false)
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

  it('legendary offers replace the level cue with one legendary reveal and claim', () => {
    engine.start()
    let offered = false
    for (let i = 0; i < 60 && !offered; i++) {
      audio.cues = []
      engine.testApi.level()
      const legendary = engine.ui.upgrades.find(up => up.rarity === 'legendary' && !up.isEvolution)
      if (legendary) {
        offered = true
        expect(audio.cues.filter(cue => cue === 'legendaryReveal')).toHaveLength(1)
        expect(audio.cues).not.toContain('level')
        engine.chooseUpgrade(legendary.id)
        expect(audio.cues.at(-1)).toBe('legendaryClaim')
        expect(audio.cues).not.toContain('upgrade')
      } else {
        expect(audio.cues).toContain('level')
        expect(audio.cues).not.toContain('legendaryReveal')
        engine.chooseUpgrade(engine.ui.upgrades[0]!.id)
      }
    }
    expect(offered).toBe(true)
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
    expect(audio.resultThemes).toContain('victory')
    expect(engine.ui.ending).toBe('🏆 遠征勝利！')
  })

  it('projects real combat streaks into the HUD and run results, with gameplay-clock expiry', () => {
    engine.selectHero('knight')
    engine.selectRunMode('quick')
    engine.start()
    const s = engine.state
    s.spawnT = 999
    s.hero!.need = 99999
    s.mobs = [50, 60].map(x => ({ x, y: 0, type: 'slime' as const, hp: 1, max: 1, r: 18, speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }))
    engine.advance(0.13)
    expect(engine.ui.hud).toMatchObject({ kill: 2, combo: { count: 2 } })
    engine.togglePause()
    const pausedAt = s.time
    engine.advance(4)
    expect(s.time).toBe(pausedAt)
    expect(s.killStreak.current).toBe(2)
    engine.togglePause()
    // Isolate the expiry window from the four faction actors spawned by start().
    s.hero!.attack = 100
    for (let i = 0; i < 35; i++) engine.advance(0.1)
    expect(engine.ui.hud).toMatchObject({ kill: 2 })
    expect(engine.ui.hud).not.toMatchObject({ combo: { count: 2 } })
    s.mobs = []
    s.time = DURATION - 0.01
    s.bossSpawned = true
    s.bossDefeated = true
    engine.advance(0.033)
    expect(engine.ui.runResult).toMatchObject({ bestKillStreak: 2, bestMultiKill: 2 })
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
    expect(engine.ui.upgrades).toHaveLength(3)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Numpad2', key: 'Process', isComposing: true }))
    expect(engine.ui.mode).toBe('play')
    expect(audio.cues.at(-1)).toBe('upgrade')
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

  it('wakes on pointerdown but plays a single generic cue on completed click', () => {
    const b = document.createElement('button')
    document.body.append(b)
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(audio.unlocked).toBe(true)
    expect(audio.cues).not.toContain('ui')
    b.click()
    expect(audio.cues).toEqual(['ui'])
    b.remove()
  })

  it('shares select feedback across mouse, keyboard activation and listbox options', () => {
    const b = document.createElement('button')
    b.dataset.uiSfx = 'select'
    document.body.append(b)
    audio.unlocked = false
    b.click() // Keyboard activation dispatches click without an earlier pointerdown.
    expect(audio.unlocked).toBe(true)
    expect(audio.cues).toEqual(['select'])
    const li = document.createElement('li')
    li.setAttribute('role', 'option')
    li.dataset.uiSfx = 'select'
    document.body.append(li)
    li.click()
    expect(audio.cues).toEqual(['select', 'select'])
    b.remove()
    li.remove()
  })

  it('skips disabled or handled clicks and never doubles an engine-owned action', () => {
    const b = document.createElement('button')
    document.body.append(b)
    b.disabled = true
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(audio.cues).toEqual([])
    b.disabled = false
    b.dataset.uiSfx = 'managed'
    b.addEventListener('click', () => engine.selectJob('ranger'))
    b.click()
    expect(audio.cues).toEqual(['hero-select'])
    b.remove()
  })

  it('only sounds an actual mode change and gives accepted/denied purchase feedback', () => {
    engine.selectRunMode('challenge')
    expect(audio.cues).toEqual(['select'])
    engine.selectRunMode('challenge')
    expect(audio.cues).toEqual(['select'])
    engine.buyPermanentUpgrade('power')
    expect(audio.cues.at(-1)).toBe('upgrade')
    // Permanent research has a bounded rank; further transactions must be denied.
    for (let attempt = 0; attempt < 100; attempt++) engine.buyPermanentUpgrade('power')
    expect(audio.cues.at(-1)).toBe('deny')
  })
})

describe('ES3 live combat soundtrack pressure', () => {
  it('counts living legacy and faction enemies together without counting defeated mobs', () => {
    const intensity = vi.spyOn(audio, 'setCombatIntensity')
    engine.selectJob('knight')
    engine.selectRunMode('quick')
    engine.start()
    const s = engine.state
    s.hero!.attack = 999
    s.hero!.inv = 999
    s.spawnT = 999
    s.nextEventAt = Infinity
    const mob = s.mobs[0]!
    // The live opening faction wave is already present. Fifteen legacy actors
    // alone would remain below the combat music threshold.
    s.mobs = Array.from({ length: 15 }, (_, i) => ({ ...mob, x: 300 + i * 30, y: 100, hp: 100, max: 100 }))
    engine.advance(.26)
    expect(intensity).toHaveBeenLastCalledWith('combat')
    // Only the few faction actors remain alive; corpses cannot sustain combat intensity.
    s.mobs.forEach(m => { m.hp = 0 })
    engine.advance(.26)
    expect(intensity).toHaveBeenLastCalledWith('calm')
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

describe('hero art capture East encounter', () => {
  it('cannot alter a normal game without the explicit dev QA flag', () => {
    engine.selectHero('shadowblade')
    engine.start()
    const mobs = [...engine.state.mobs]
    const aim = engine.state.hero!.aimAngle
    expect(engine.testApi.prepareHeroArtEastAttack()).toBe(false)
    expect(engine.state.mobs).toEqual(mobs)
    expect(engine.state.hero!.aimAngle).toBe(aim)
  })

  it('uses real attack against an East target only in explicit dev QA', () => {
    const old = window.location.href
    try {
      window.history.replaceState(null, '', '?es2HeroArtQA=1')
      for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const) {
        engine.selectHero(id)
        engine.start()
        expect(engine.testApi.prepareHeroArtEastAttack(), id).toBe(true)
        const hero = engine.state.hero!
        expect(hero.strike, id).toBeGreaterThan(0)
        expect(Math.abs(hero.aimAngle), id).toBeLessThan(Math.PI / 8)
        expect(hero.face, id).toBe(1)
        expect(engine.activateHeroSpecial(), id).toBe(true)
        engine.goMenu()
      }
    } finally {
      window.history.replaceState(null, '', old)
    }
  })
})

describe('hero active skill audio', () => {
  it.each([
    ['shadowblade', 'shadowblade-special'],
    ['spirit-summoner', 'spirit-summoner-special'],
    ['crimson-paladin', 'crimson-paladin-special'],
  ] as const)('plays only the dedicated cast cue for %s on success', (hero, cue) => {
    engine.selectHero(hero)
    engine.selectRunMode('standard')
    engine.start()
    engine.state.mobs = []
    engine.togglePause()
    audio.cues.length = 0
    expect(engine.activateHeroSpecial()).toBe(false)
    expect(audio.cues).toEqual([])
    engine.togglePause()
    audio.cues.length = 0
    expect(engine.activateHeroSpecial()).toBe(true)
    expect(engine.activateHeroSpecial()).toBe(false)
    expect(audio.cues).toEqual([cue])
  })
})

describe('ES3 early upgrade pacing', () => {
  it.each([['quick', 12], ['standard', 14], ['challenge', 15], ['endless', 13]] as const)('sets a mode-specific initial XP threshold in a real run (%s)', (mode, need) => {
    engine.selectRunMode(mode)
    engine.start()
    expect(engine.state.hero!.need).toBe(need)
    expect(engine.state.hero!.level).toBe(1)
    expect(engine.state.levelQueue).toBe(0)
  })
})

it.each(['common', 'rare', 'epic', 'legendary', 'cursed'] as const)('plays the actual claimed relic rarity accent from a %s chest only once', tier => {
  engine.start()
  const s = engine.state, hero = s.hero!
  s.mobs = []; s.spawnT = 100; s.nextEventAt = Infinity
  s.events = [{ id: 1, kind: 'chest', tier, x: hero.x, y: hero.y, expiresAt: s.time + 30 }]
  const play = vi.spyOn(audio, 'playSfx')
  engine.advance(.016)
  expect(engine.ui.specialChoice?.tier).toBe(tier)
  const item = engine.ui.specialChoice!.items[0]!
  const expected = ['common','rare','epic','legendary','cursed'].indexOf(item.cursed ? 'cursed' : item.rarity ?? 'common')
  engine.chooseTreasure(item.id)
  engine.chooseTreasure(item.id)
  expect(play.mock.calls.filter(([cue]) => cue === 'treasureClaim')).toEqual([['treasureClaim', expected]])
  expect(inventorySnapshot(s).items).toHaveLength(1)
})

describe('real hero active video scenario', () => {
  it('keeps a real Knight cast in live combat after defeating the staged crowd', () => {
    const old = window.location.href
    try {
      window.history.replaceState(null, '', '?heroActiveVideoQa=1')
      engine.selectHero('knight')
      engine.selectRunMode('standard')
      engine.start()
      expect(engine.testApi.prepareHeroActiveVideo()).toBe(true)
      const hero = engine.state.hero!
      // A short evidence recording must not be interrupted by a level-up dialog.
      expect(hero.need).toBeGreaterThan(1000)
      expect(engine.state.mobs).toHaveLength(8)
      expect(engine.activateHeroSpecial()).toBe(true)
      expect(audio.cues).toContain('knight-special')
      for (let i = 0; i < 90; i++) engine.advance(.033)
      expect(engine.state.mode).toBe('play')
      expect(engine.state.time).toBeGreaterThan(2)
    } finally {
      window.history.replaceState(null, '', old)
    }
  })
  it('never changes an ordinary game without the explicit dev flag', () => {
    engine.selectHero('knight')
    engine.start()
    const need = engine.state.hero!.need
    const mobs = [...engine.state.mobs]
    expect(engine.testApi.prepareHeroActiveVideo()).toBe(false)
    expect(engine.state.hero!.need).toBe(need)
    expect(engine.state.mobs).toEqual(mobs)
  })
})
