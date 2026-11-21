import { shallowReactive } from 'vue'
import { loadArtwork, BGM_URL, type Artwork } from './art'
import { createAudioSystem } from './audio/engine'
import type { AudioSystem } from './audio/types'
import { dash as heroDash } from './combat'
import { JOB, SCENE_SECONDS } from './constants'
import { trySpawnEvent } from './events'
import { impact } from './fx'
import { moveVector, PREVENT_DEFAULT_KEYS, upgradeKeyIndex, type KeyState } from './input'
import { minmax } from './math'
import { addXp, applyUpgrade, pickUpgrades } from './progression'
import { createRenderAssets, drawFrame, drawMiniMap, type RenderAssets } from './render'
import { setScene } from './scene'
import { spawnMob } from './spawn'
import { actorPose, createState, currentSceneInfo, resetRun, type Pose } from './state'
import { step } from './step'
import { emptyHud, type GameCommands, type UiState } from './store'
import type { GameHooks, GameMode, GameState, JobId, MoveInput, Point, UpgradeId } from './types'

/** Debug/automation API kept name-for-name from the original (`scripts/export-brand-assets.py` uses it). */
export interface TestApi {
  readonly mode: GameMode
  readonly enemies: number
  readonly audio: boolean
  readonly music: boolean
  readonly time: number
  level(): void
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
  /** Capture-only scene preview; requires ?showcase=1. */
  previewBiome(index: number): void
}

declare global {
  interface Window { __test?: TestApi }
}

export interface Engine extends GameCommands {
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

function createBgm(): HTMLAudioElement {
  const bgm = new Audio(BGM_URL)
  bgm.loop = true
  bgm.preload = 'auto'
  bgm.volume = 0.38
  return bgm
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

export function createEngine(opts: { audio?: AudioSystem } = {}): Engine {
  const s = createState()
  const audio = opts.audio ?? createAudioSystem({ bgm: createBgm() })
  const ui = shallowReactive<UiState>({
    mode: 'menu', choice: s.choice, musicOn: audio.musicOn, sfxOn: audio.sfxOn, hud: emptyHud(),
    upgrades: [], toastText: '', toastVisible: false, ending: '冒險結束', summary: '', coarsePointer: false,
  })
  let toastTimer = 0
  let keys: KeyState = {}
  let stick: MoveInput = { x: 0, y: 0 }
  let frameDrawn = 0
  let art: Artwork | null = null

  const hooks: GameHooks = {
    sfx: cue => audio.playSfx(cue),
    message,
    offerUpgrades,
    end,
  }

  function screen(name: GameMode): void {
    s.mode = name
    ui.mode = name
    ui.coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches
    audio.onScreen(name)
    if (name !== 'play') stick = { x: 0, y: 0 }
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
    }
  }

  function offerUpgrades(): void {
    screen('level')
    ui.upgrades = pickUpgrades()
    audio.playSfx('level')
  }

  function end(win: boolean): void {
    screen('result')
    audio.playSfx(win ? 'victory' : 'defeat')
    ui.ending = win ? '🏆 遠征勝利！' : '💀 冒險結束'
    ui.summary = `存活 ${Math.floor(s.time)} 秒 · 擊敗 ${s.kill} 隻魔物 · 等級 ${s.hero?.level ?? 1}`
    hud()
  }

  function start(): void {
    resetRun(s)
    audio.wake()
    screen('play')
    audio.playSfx('start')
    audio.resetBattleClock(0.06)
    message('幽暮之門已開啟')
    setScene(s, 0, false, hooks)
    for (let i = 0; i < 12; i++) spawnMob(s)
    hud()
  }

  function chooseUpgrade(id: UpgradeId): void {
    if (s.mode !== 'level' || !s.hero) return
    applyUpgrade(s, id, hooks)
    screen('play')
    if (s.levelQueue) offerUpgrades()
    audio.playSfx('upgrade')
    hud()
  }

  function togglePause(): void {
    if (s.mode === 'play') {
      audio.playSfx('pause')
      screen('paused')
    } else if (s.mode === 'paused') {
      audio.wake()
      audio.playSfx('resume')
      audio.resetBattleClock(0.05)
      screen('play')
    }
  }

  function advance(dt: number): void {
    s.worldClock += s.mode === 'play' ? 0 : dt * 0.3
    if (s.mode !== 'play') return
    step(s, dt, moveVector(keys, stick), hooks)
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
      s.mobs = []; s.shots = []; s.stars = []; s.fx = []
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
  }

  function listen(win: Window = window): () => void {
    const doc = win.document
    const onKeyDown = (e: KeyboardEvent): void => {
      if (s.mode === 'menu' && audio.musicOn) audio.wake()
      if (PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault()
      keys[e.code] = true
      if (e.repeat) return
      if (e.code === 'Space') heroDash(s, hooks)
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
      const n = upgradeKeyIndex(e.code)
      const pick = ui.upgrades[n]
      if (s.mode === 'level' && pick) chooseUpgrade(pick.id)
    }
    const onKeyUp = (e: KeyboardEvent): void => { keys[e.code] = false }
    const onBlur = (): void => {
      keys = {}
      if (s.mode === 'play') screen('paused')
    }
    const onVisibility = (): void => { if (doc.hidden && s.mode === 'play') screen('paused') }
    const onPointerDown = (e: PointerEvent): void => {
      audio.wake()
      if (e.target instanceof Element && e.target.closest('button')) audio.playSfx('ui')
    }
    const onPointerOver = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.target instanceof Element && e.target.closest('button')) audio.playSfx('hover')
    }
    win.addEventListener('keydown', onKeyDown)
    win.addEventListener('keyup', onKeyUp)
    win.addEventListener('blur', onBlur)
    doc.addEventListener('visibilitychange', onVisibility)
    doc.addEventListener('pointerdown', onPointerDown)
    doc.addEventListener('pointerover', onPointerOver)
    return () => {
      win.removeEventListener('keydown', onKeyDown)
      win.removeEventListener('keyup', onKeyUp)
      win.removeEventListener('blur', onBlur)
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
    let dpr = 1
    let last = 0
    let raf = 0
    const resize = (): void => {
      s.W = innerWidth
      s.H = innerHeight
      dpr = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(s.W * dpr)
      canvas.height = Math.round(s.H * dpr)
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

  return {
    ui,
    state: s,
    testApi,
    advance,
    listen,
    mount,
    selectJob(job: JobId) {
      s.choice = job
      ui.choice = job
      audio.wake()
      audio.playSfx('select')
    },
    start,
    chooseUpgrade,
    togglePause,
    dash: () => heroDash(s, hooks),
    toggleMusic() { ui.musicOn = audio.toggleMusic(s.mode) },
    toggleSfx() { ui.sfxOn = audio.toggleSfx() },
    goMenu: () => screen('menu'),
    setStick(v) { stick = v ?? { x: 0, y: 0 } },
  }
}

