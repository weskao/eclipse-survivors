import { shallowReactive } from 'vue'
import { createProfileStore, type ProfileStore } from '../meta/profile'
import { getMode } from '../meta/modes'
import type { RunStats, RunModeId, PermanentUpgrade, CosmeticId } from '../meta/types'
import { loadArtwork, BGM_URL, type Artwork } from './art'
import { createAudioSystem } from './audio/engine'
import type { AudioSystem } from './audio/types'
import { dash as heroDash } from './combat'
import { JOB, SCENE_SECONDS } from './constants'
import { createContentRegistry, type ContentRegistry } from './content/registry'
import { CONTENT_PACKS } from './content/packs'
import { BOSS_DEFINITIONS, type BossId } from './content/bosses/definitions'
import { createBossEncounterController } from './content/bosses/controller'
import { createBossEncounterPack } from './content/packs/bosses'
import type { ContentPack } from './content/contracts'
import { RELIC_BY_ID, type RelicId } from './content/relics/catalog'
import { claimTreasure, declineTreasure, inventorySnapshot, openTreasure, tickRelicRecovery } from './content/relics/runtime'
import { trySpawnEvent } from './events'
import { impact } from './fx'
import { EVOLUTIONS } from './evolutions'
import { moveVector, PREVENT_DEFAULT_KEYS, upgradeKeyIndex, type KeyState } from './input'
import { minmax, random } from './math'
import { addXp, applyUpgrade, pickUpgrades } from './progression'
import { createRenderAssets, drawFrame, drawMiniMap, type RenderAssets } from './render'
import { setScene } from './scene'
import { spawnMob } from './spawn'
import { actorPose, createState, currentSceneInfo, resetRun, type Pose } from './state'
import { step } from './step'
import { emptyHud, equippedSkillHud, type GameCommands, type UiState } from './store'
import type { AbilityId, ContentEvent, ContentId, EvolutionId, GameHooks, GameMode, GameState, JobId, MoveInput, Point, UpgradeId } from './types'

/** Debug/automation API kept name-for-name from the original (`scripts/export-brand-assets.py` uses it). */
export interface TestApi {
  readonly mode: GameMode
  readonly enemies: number
  readonly audio: boolean
  readonly music: boolean
  readonly time: number
  level(): void
  /** Stage an evolution for browser capture without changing normal play. */
  prepareEvolution(id: EvolutionId): void
  readonly hp: number | undefined
  readonly active: boolean
  readonly sceneArtLoaded: boolean
  readonly animated: boolean
  readonly position: Point | null
  readonly velocity: Point | null
  readonly pose: Pose
  readonly attackAnimation: boolean
  readonly vfxCount: number
  readonly frames: number
  readonly scene: string
  forceAttack(): void
  /** Browser-capture scenario, isolated from normal play. */
  showcaseBoss(phase?: 1 | 2 | 3): void
  /** Capture-only biome preview; requires ?showcase=1. */
  previewBiome(index: number): void
}

declare global {
  interface Window { __test?: TestApi }
}

export interface Engine extends GameCommands {
  readonly contentRegistry: ContentRegistry
  /** Only active in development with ?content-showcase=1. */
  showcaseGrant(id: ContentId): boolean
  showcaseEmit(event: ContentEvent): void
  readonly ui: UiState
  readonly state: GameState
  readonly testApi: TestApi
  /** Original `update()` tail run by `frame()`: clock, step, toast, 8 Hz hud. */
  advance(dt: number): void
  /** Keyboard / focus / global pointer listeners. Returns a cleanup. */
  listen(win?: Window): () => void
  /** Canvas, resize, rAF loop, listeners and `window.__test`. Returns a cleanup. */
  mount(canvas: HTMLCanvasElement, minimap: HTMLCanvasElement | null): () => void
}

function createBgm(source: string): HTMLAudioElement {
  const bgm = new Audio(source)
  bgm.loop = true
  bgm.preload = 'auto'
  bgm.volume = 0.38
  return bgm
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

export function createEngine(opts: { audio?: AudioSystem; profileStore?: ProfileStore; contentPacks?: readonly ContentPack[] } = {}): Engine {
  const s = createState()
  const requestedPacks = opts.contentPacks ?? CONTENT_PACKS
  const relicsEnabled = requestedPacks.some(pack => pack.id === 'relics')
  const bosses = requestedPacks.some(pack => pack.id === 'bosses') ? createBossEncounterController() : null
  const contentRegistry = createContentRegistry(
    bosses ? requestedPacks.map(pack => pack.id === 'bosses' ? createBossEncounterPack(bosses) : pack) : requestedPacks,
    random,
  )
  const bossIds = Object.keys(BOSS_DEFINITIONS) as BossId[]
  let bossSequence = 0
  const bossAdapter = bosses ? {
    spawn(state: GameState, hooks: GameHooks): void {
      const id = bossIds[bossSequence % bossIds.length]!
      const hero = state.hero
      if (!hero) return
      const spawned = bosses.spawn(state, id, { x: hero.x + 245, y: hero.y }, hooks)
      if (spawned) {
        bossSequence++
        hooks.message(`⚠ ${BOSS_DEFINITIONS[id].title} 降臨！`)
      }
    },
    tick(state: GameState, dt: number, hooks: GameHooks): void { bosses.tick(state, dt, hooks) },
  } : undefined
  const profileStore = opts.profileStore ?? createProfileStore()
  const audio = opts.audio ?? createAudioSystem({
    bgm: createBgm(BGM_URL),
    menuBgm: createBgm(`${import.meta.env.BASE_URL}audio/eclipse-overture.wav`),
  })
  const settingsStorage = (() => { try { return localStorage } catch { return null } })()
  let initialEffect: 'soft' | 'still' = 'soft'
  let initialShake = true
  try {
    if (settingsStorage?.getItem('eclipseUpgradeEffect') === 'still') initialEffect = 'still'
    if (settingsStorage?.getItem('eclipseCameraShake') === 'off') initialShake = false
  } catch { /* private browsing may block settings */ }
  const ui = shallowReactive<UiState>({
    mode: 'menu', choice: s.choice, musicOn: audio.musicOn, audioUnlocked: audio.unlocked, sfxOn: audio.sfxOn,
    musicVolume: audio.musicVolume, sfxVolume: audio.sfxVolume,
    settingsOpen: false, upgradeEffect: initialEffect, cameraShake: initialShake, hud: emptyHud(),
    upgrades: [], specialChoice: null, toastText: '', toastVisible: false, ending: '冒險結束', summary: '', coarsePointer: false,
    runMode: 'quick', profile: profileStore.get(), runResult: null, rewards: null,
  })
  let resumeAfterSettings = false
  let toastTimer = 0
  let keys: KeyState = {}
  let stick: MoveInput = { x: 0, y: 0 }
  let runSequence = 0
  let frameDrawn = 0
  let art: Artwork | null = null

  function wakeAudio(): void {
    audio.wake()
    ui.audioUnlocked = audio.unlocked
  }

  const hooks: GameHooks = {
    sfx: cue => audio.playSfx(cue),
    message,
    offerUpgrades,
    end,
    // Skip all event-object allocation in the default empty-pack game.
    content: contentRegistry.packs.some(pack => pack.onEvent)
      ? (state, event) => contentRegistry.emit(state, event, hooks)
      : undefined,
    openTreasure: relicsEnabled ? (state, chestId) => {
      const offer = openTreasure(state, chestId, random)
      if (!offer) return false
      ui.specialChoice = { kind: 'treasure', items: offer.options.map(id => {
        const relic = RELIC_BY_ID.get(id)!
        return { id, title: relic.title, description: relic.description, icon: relic.icon, rarity: relic.rarity }
      }) }
      ui.upgrades = []
      screen('level')
      return true
    } : undefined,
  }

  function screen(name: GameMode): void {
    // A level-up freezes gameplay: discard pending hit recoil before the picker opens.
    if (name === 'level') s.cameraKick = 0
    s.mode = name
    ui.mode = name
    ui.coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches
    audio.onScreen(name)
    if (name !== 'play') {
      keys = {}
      stick = { x: 0, y: 0 }
    }
  }

  function message(text: string): void {
    ui.toastText = text
    ui.toastVisible = true
    toastTimer = 1.7
  }

  function hud(): void {
    const hero = s.hero
    if (!hero) return
    const sc = currentSceneInfo(s)
    const boss = s.mobs.find(e => e.type === 'boss' && e.hp > 0)
    const xpPct = minmax(hero.xp / hero.need * 100, 0, 100)
    ui.hud = {
      who: `${JOB[s.choice].label} · LV.${hero.level}`,
      hpPct: minmax(hero.hp / hero.max * 100, 0, 100),
      hpLabel: `生命 ${Math.ceil(hero.hp)} / ${hero.max}`,
      xpPct,
      kill: s.kill,
      timer: `${pad2(Math.floor(s.time / 60))}:${pad2(Math.floor(s.time % 60))}`,
      bossPct: boss ? Math.max(0, boss.hp / boss.max * 100) : null,
      quest: boss ? `最終決戰 · ${sc.name}` : `${sc.name} · ${sc.label}`,
      skills: equippedSkillHud(hero, contentRegistry, s),
    }
  }

  function offerUpgrades(): void {
    const choices = pickUpgrades(s.hero ?? undefined, random, contentRegistry, s)
    if (!choices.length) {
      s.levelQueue = 0
      screen('play')
      message('所有祝福已達到最高等級')
      return
    }
    ui.upgrades = choices
    screen('level')
    audio.playSfx('level')
  }

  function end(win: boolean): void {
    if (s.mode === 'result') return
    hooks.content?.(s, { type: 'run-complete', win })
    const h = s.hero
    const stats: RunStats = {
      id: `${Date.now()}-${++runSequence}-${Math.random().toString(36).slice(2)}`,
      mode: s.runMode, hero: s.choice, victory: win, seconds: Math.floor(s.time),
      kills: s.kill, level: h?.level ?? 1, remainingHp: Math.max(0, Math.ceil(h?.hp ?? 0)),
      damageDealt: Math.round(s.damageDealt), damageTaken: Math.round(s.damageTaken),
      bossDefeated: s.bossDefeated, enemies: { ...s.defeatedTypes },
      abilities: [
        ...(Object.keys(h?.skills ?? {}) as UpgradeId[]),
        ...(Object.keys(s.content.levels) as ContentId[]),
        ...(Object.entries(h?.evolutions ?? {}).filter(([, active]) => active).map(([id]) => id as EvolutionId)),
      ],
    }
    ui.runResult = stats
    ui.rewards = profileStore.recordRun(stats)
    ui.profile = profileStore.get()
    screen('result')
    audio.playSfx(win ? 'victory' : 'defeat')
    ui.ending = win ? '🏆 遠征勝利！' : '💀 冒險結束'
    ui.summary = `存活 ${Math.floor(s.time)} 秒 · 擊敗 ${s.kill} 隻魔物 · 等級 ${s.hero?.level ?? 1}`
    hud()
  }

  function start(): void {
    resetRun(s)
    hooks.content?.(s, { type: 'reset' })
    s.runMode = ui.runMode
    s.cosmetic = profileStore.get().equippedCosmetics[s.choice]
    const permanent = profileStore.get().upgrades
    if (s.hero) {
      s.hero.damage *= 1 + 0.04 * permanent.power
      s.hero.max += 12 * permanent.vitality
      s.hero.hp += 12 * permanent.vitality
    }
    ui.runResult = null
    ui.rewards = null
    ui.specialChoice = null
    keys = {}
    stick = { x: 0, y: 0 }
    audio.setCombatIntensity('calm')
    wakeAudio()
    screen('play')
    hooks.content?.(s, { type: 'start' })
    audio.playSfx('start')
    audio.resetBattleClock(0.06)
    message('幽暮之門已開啟')
    setScene(s, 0, false, hooks)
    for (let i = 0; i < 12; i++) spawnMob(s)
    hud()
  }

  function chooseUpgrade(id: AbilityId): void {
    if (s.mode !== 'level' || !s.hero || ui.specialChoice || !ui.upgrades.some(up => up.id === id)) return
    if (!applyUpgrade(s, id, hooks, contentRegistry)) return
    screen('play')
    if (s.levelQueue) offerUpgrades()
    audio.playSfx('upgrade')
    hud()
  }

  function chooseTreasure(id: string): void {
    const offer = inventorySnapshot(s).pending
    if (!offer || s.mode !== 'level' || !ui.specialChoice ||
        !ui.specialChoice.items.some(item => item.id === id)) return
    if (!claimTreasure(s, offer.chestId, id as RelicId)) return
    ui.specialChoice = null
    audio.playSfx('upgrade')
    message('✦ 已獲得聖物：' + RELIC_BY_ID.get(id as RelicId)!.title)
    screen('play')
    if (s.levelQueue) offerUpgrades()
    hud()
  }

  function cancelTreasure(): void {
    const offer = inventorySnapshot(s).pending
    if (!offer || s.mode !== 'level' || !ui.specialChoice || !declineTreasure(s, offer.chestId)) return
    ui.specialChoice = null
    screen('play')
    if (s.levelQueue) offerUpgrades()
    hud()
  }

  function togglePause(): void {
    if (s.mode === 'play') {
      audio.playSfx('pause')
      screen('paused')
    } else if (s.mode === 'paused') {
      wakeAudio()
      audio.playSfx('resume')
      audio.resetBattleClock(0.05)
      screen('play')
    }
  }

  function openSettings(): void {
    if (ui.settingsOpen) return
    resumeAfterSettings = s.mode === 'play'
    if (resumeAfterSettings) togglePause()
    ui.settingsOpen = true
  }

  function closeSettings(): void {
    if (!ui.settingsOpen) return
    ui.settingsOpen = false
    if (resumeAfterSettings && s.mode === 'paused') togglePause()
    resumeAfterSettings = false
  }

  function saveSetting(key: string, value: string): void {
    try { settingsStorage?.setItem(key, value) } catch { /* unavailable */ }
  }

  function advance(dt: number): void {
    // Preserve gentle ambient life by default; keep the upgrade backdrop fully still when requested.
    s.worldClock += s.mode === 'play' || (s.mode === 'level' && ui.upgradeEffect === 'still') ? 0 : dt * 0.3
    if (s.mode !== 'play') return
    step(s, dt, moveVector(keys, stick), hooks, contentRegistry, bossAdapter)
    if (relicsEnabled && s.mode === 'play') tickRelicRecovery(s, dt)
    if (Math.floor(s.time * 4) !== Math.floor((s.time - dt) * 4)) {
      const bossAlive = s.mobs.some(m => m.type === 'boss' && m.hp > 0)
      audio.setCombatIntensity(bossAlive ? 'boss' : s.mobs.length >= 16 ? 'combat' : 'calm')
    }
    if (toastTimer > 0) {
      toastTimer -= dt
      if (toastTimer <= 0) ui.toastVisible = false
    }
    if (Math.floor(s.time * 8) !== Math.floor((s.time - dt) * 8)) hud()
  }

  const testApi: TestApi = {
    get mode() { return s.mode },
    get enemies() { return s.mobs.length },
    get audio() { return audio.unlocked },
    get music() { return audio.musicOn },
    get time() { return s.time },
    level() { if (s.hero) addXp(s, s.hero.need, hooks) },
    prepareEvolution(id: EvolutionId) {
      if (!s.hero || s.mode !== 'play') return
      const evo = EVOLUTIONS.find(e => e.id === id)
      if (!evo) return
      for (const required of evo.requires) {
        s.hero.skills[required] = Math.max(3, s.hero.skills[required] ?? 0)
      }
      // Stable, visible targets for the capture harness; no game-rule changes.
      for (const [i, mob] of s.mobs.slice(0, 5).entries()) {
        mob.x = s.hero.x + 45 + i * 25
        mob.y = s.hero.y + (i % 2 ? 35 : -35)
        mob.speed = 0
        mob.dmg = 0
        mob.hp = mob.max = 3000
      }
      s.hero.attack = 1
      s.hero.hp = Math.min(s.hero.max, s.hero.hp)
      hud()
    },
    get hp() { return s.hero?.hp },
    get active() { return s.hero != null },
    get sceneArtLoaded() { return !!art?.courtyard.complete && art.courtyard.naturalWidth > 0 },
    get animated() { return !!s.hero },
    get position() { return s.hero ? { x: s.hero.x, y: s.hero.y } : null },
    get velocity() { return s.hero ? { x: s.hero.vx, y: s.hero.vy } : null },
    get pose() { return actorPose(s.hero) },
    get attackAnimation() { return !!s.hero && s.hero.strike > 0 },
    get vfxCount() { return s.impactWaves.length + s.lightningFx.length + s.swipes.length + s.fx.length },
    get frames() { return frameDrawn },
    get scene() { return currentSceneInfo(s).name },
    previewBiome(index: number) {
      if (window.location.search.indexOf('showcase=1') < 0 || s.mode !== 'play' ||
          !s.hero || !Number.isInteger(index) || index < 0 || index > 3) return
      s.hero.x = 0; s.hero.y = 0; s.hero.hp = s.hero.max; s.hero.inv = 0; s.hero.need = 99999
      s.hero.attack = 0.45
      s.cam.x = 0; s.cam.y = 0
      s.time = index * SCENE_SECONDS + 2
      s.worldClock = s.time
      s.spawnT = 999; s.bossSpawned = true
      s.mobs = []; s.shots = []; s.enemyShots = []; s.stars = []; s.fx = []
      setScene(s, index, false, hooks)
      s.nextEventAt = Infinity
      for (let i = 0; i < 8; i++) spawnMob(s)
      trySpawnEvent(s, index % 2 ? 'shrine' : 'chest')
      hud()
    },
    forceAttack() {
      const hero = s.hero
      if (!hero) return
      hero.strike = 0.29
      s.swipes.push({ x: hero.x, y: hero.y, a: 0, life: 0.29, max: 0.29, r: 75 })
      impact(s, hero.x + 80, hero.y, 45)
    },
    showcaseBoss(phase: 1 | 2 | 3 = 1) {
      const hero = s.hero
      if (!hero || s.mode !== 'play') return
      s.mobs = []
      s.enemyShots = []
      s.time = 96
      s.spawnT = 10000
      s.bossSpawned = true
      hero.inv = 120
      hero.attack = 10000
      spawnMob(s, 'boss')
      const boss = s.mobs.find(e => e.type === 'boss')
      if (!boss) return
      boss.x = hero.x + 165
      boss.y = hero.y - 8
      boss.hp = boss.max * (phase === 1 ? 1 : phase === 2 ? 0.56 : 0.25)
      s.cam.x = hero.x
      s.cam.y = hero.y
    },
  }

  function listen(win: Window = window): () => void {
    const doc = win.document
    const onKeyDown = (e: KeyboardEvent): void => {
      if (ui.settingsOpen) {
        if (e.code === 'Escape') { e.preventDefault(); closeSettings() }
        return
      }
      if ((s.mode === 'menu' && audio.musicOn) || s.mode === 'play') wakeAudio()
      if (s.mode === 'play' && PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault()
      if (s.mode === 'play') keys[e.code] = true
      if (e.repeat) return
      if (e.code === 'Space' && s.mode === 'play') heroDash(s, hooks)
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
      const n = upgradeKeyIndex(e.code)
      if (s.mode === 'level' && ui.specialChoice) {
        const choice = ui.specialChoice.items[n]
        if (choice) chooseTreasure(choice.id)
      } else {
        const pick = ui.upgrades[n]
        if (s.mode === 'level' && pick) chooseUpgrade(pick.id)
      }
    }
    const onKeyUp = (e: KeyboardEvent): void => { keys[e.code] = false }
    const onBlur = (): void => {
      // Release held controls without changing the player's pause state.
      keys = {}
      stick = { x: 0, y: 0 }
    }
    const onVisibility = (): void => {
      if (doc.hidden) {
        onBlur()
        audio.interrupt()
      }
    }
    const onPageHide = (): void => {
      onBlur()
      audio.interrupt()
    }
    const onPointerDown = (e: PointerEvent): void => {
      wakeAudio()
      if (e.target instanceof Element && e.target.closest('button')) audio.playSfx('ui')
    }
    const onPointerOver = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.target instanceof Element && e.target.closest('button')) audio.playSfx('hover')
    }
    win.addEventListener('keydown', onKeyDown)
    win.addEventListener('keyup', onKeyUp)
    win.addEventListener('blur', onBlur)
    win.addEventListener('pagehide', onPageHide)
    doc.addEventListener('visibilitychange', onVisibility)
    doc.addEventListener('pointerdown', onPointerDown)
    doc.addEventListener('pointerover', onPointerOver)
    return () => {
      win.removeEventListener('keydown', onKeyDown)
      win.removeEventListener('keyup', onKeyUp)
      win.removeEventListener('blur', onBlur)
      win.removeEventListener('pagehide', onPageHide)
      doc.removeEventListener('visibilitychange', onVisibility)
      doc.removeEventListener('pointerdown', onPointerDown)
      doc.removeEventListener('pointerover', onPointerOver)
    }
  }

  function mount(canvas: HTMLCanvasElement, minimap: HTMLCanvasElement | null): () => void {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas context unavailable')
    const mini = minimap?.getContext('2d') ?? null
    art = loadArtwork()
    const assets: RenderAssets = createRenderAssets(art)
    if (contentRegistry.packs.some(pack => pack.effects?.length)) assets.content = contentRegistry
    if (bosses) assets.bosses = bosses
    assets.cameraShakeEnabled = () => ui.cameraShake
    let dpr = 1
    let last = 0
    let raf = 0
    const resize = (): void => {
      s.W = innerWidth
      s.H = innerHeight
      dpr = Math.min(devicePixelRatio || 1, 1.5)
      const width = Math.round(s.W * dpr)
      const height = Math.round(s.H * dpr)
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const frame = (t: number): void => {
      const dt = last ? Math.min((t - last) / 1000, 0.033) : 0
      last = t
      advance(dt)
      frameDrawn++
      drawFrame(ctx, s, dpr, assets)
      if (s.hero && mini && frameDrawn % 7 === 0) drawMiniMap(mini, s, assets)
      audio.tick(s.mode)
      raf = requestAnimationFrame(frame)
    }
    addEventListener('resize', resize)
    resize()
    const unlisten = listen()
    window.__test = testApi
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      unlisten()
      delete window.__test
      audio.dispose()
    }
  }

  const devShowcase = (): boolean => import.meta.env.DEV && typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('content-showcase') === '1'

  return {
    contentRegistry,
    showcaseGrant(id) {
      if (!devShowcase() || s.mode !== 'play' || !s.hero) return false
      const ok = contentRegistry.acquire(s, id, hooks)
      if (ok) hud()
      return ok
    },
    showcaseEmit(event) { if (devShowcase() && s.mode === 'play') hooks.content?.(s, event) },
    ui,
    state: s,
    testApi,
    advance,
    listen,
    mount,
    enableMenuAudio() { if (s.mode === 'menu' && audio.musicOn) wakeAudio() },
    selectRunMode(mode: RunModeId) { if (getMode(mode)) ui.runMode = mode },
    buyPermanentUpgrade(id: PermanentUpgrade) {
      if (s.mode === 'menu' && profileStore.buyUpgrade(id)) ui.profile = profileStore.get()
    },
    selectCosmetic(hero: JobId, skin: CosmeticId) {
      if (s.mode === 'menu' && profileStore.selectCosmetic(hero, skin)) ui.profile = profileStore.get()
    },
    resetProgress() {
      if (s.mode !== 'menu') return
      profileStore.reset()
      ui.profile = profileStore.get()
    },
    selectJob(job: JobId) {
      s.choice = job
      ui.choice = job
      s.cosmetic = profileStore.get().equippedCosmetics[job]
      wakeAudio()
      audio.playSfx('select')
    },
    start,
    chooseUpgrade,
    chooseTreasure,
    cancelTreasure,
    togglePause,
    dash: () => heroDash(s, hooks),
    toggleMusic() {
      ui.musicOn = audio.toggleMusic(s.mode)
      ui.audioUnlocked = audio.unlocked
      ui.musicVolume = audio.musicVolume
    },
    toggleSfx() {
      ui.sfxOn = audio.toggleSfx()
      ui.audioUnlocked = audio.unlocked
      ui.sfxVolume = audio.sfxVolume
    },
    setMusicVolume(value) { audio.setMusicVolume(value); ui.musicVolume = audio.musicVolume },
    setSfxVolume(value) { audio.setSfxVolume(value); ui.sfxVolume = audio.sfxVolume },
    setUpgradeEffect(effect) {
      if (effect !== 'soft' && effect !== 'still') return
      ui.upgradeEffect = effect
      saveSetting('eclipseUpgradeEffect', effect)
    },
    setCameraShake(enabled) {
      ui.cameraShake = enabled
      saveSetting('eclipseCameraShake', enabled ? 'on' : 'off')
      if (!enabled) s.cameraKick = 0
    },
    openSettings,
    closeSettings,
    goMenu: () => screen('menu'),
    setStick(v) { stick = v ?? { x: 0, y: 0 } },
  }
}

