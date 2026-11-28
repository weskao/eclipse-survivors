import { createEngine } from '../../../src/game/engine'
import { loadArtwork, type Artwork } from '../../../src/game/art'
import { createApp, h, nextTick } from 'vue'
import Es2MenuSystem from '../../../src/components/es2/menu/Es2MenuSystem.vue'
import { createState, resetRun } from '../../../src/game/state'
import { hit } from '../../../src/game/combat'
import { step } from '../../../src/game/step'
import type { GameHooks, Mob } from '../../../src/game/types'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../../src/game/content/enemies/definitions'
import { cleanupFactionEnemies, createFactionRuntime, damageFactionEnemy, spawnFactionEnemy, tickFactionEnemies } from '../../../src/game/content/enemies/runtime'
import { drawLiveFactionArt, loadProductionFactionArt } from '../../../src/game/render/es2/production-factions'
import { inventorySnapshot } from '../../../src/game/content/relics/runtime'
import { createRenderAssets, drawFrame } from '../../../src/game/render'
import { drawHitImpact, preloadHitImpactArt } from '../../../src/game/render/hit-impact'
import { drawEs3EnemyDeath, loadWorldRuntimeImages, type WorldRuntimeImages } from '../../../src/game/render/es2/production-world'
import { createStressScenario, type StressPreset } from '../../../src/game/performance/es2/scenarios'
import { distribution } from '../../../src/game/performance/es2/metrics'
import { resolvePresentationPolicy } from '../../../src/game/content/accessibility/presentation'
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../../../src/game/content/accessibility/preferences'
import type { AudioSystem } from '../../../src/game/audio/types'

declare global {
  interface Window {
    __es2BenchmarkResult?: unknown
    __es2BenchmarkError?: string
  }
}

const mutedAudio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})
const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))
// Actual browser decode and paint, separate from the timed simulation workload.
// Check the production loader (no injected image or manually selected texture).
async function verifyContactArt(): Promise<string[]> {
  preloadHitImpactArt()
  const canvas = document.createElement('canvas')
  canvas.width = 200; canvas.height = 200
  const ctx = canvas.getContext('2d')!
  const original = ctx.drawImage.bind(ctx)
  let painted: HTMLImageElement | undefined
  ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
    if (args[0] instanceof HTMLImageElement) painted = args[0]
    original(...args)
  }) as CanvasRenderingContext2D['drawImage']
  const variants = [
    ['normal', undefined, 'normal'], ['heavy', undefined, 'heavy'],
    ['critical', undefined, 'critical'], ['normal', 'elemental', 'elemental'],
    ['heavy', 'evolved', 'evolved'], ['heavy', 'hero', 'hero'],
    ['critical', 'hero', 'critical'],
  ] as const
  const results: string[] = []
  const deadline = performance.now() + 10000
  for (const [contact, flavor, id] of variants) {
    for (;;) {
      painted = undefined
      ctx.clearRect(0, 0, 200, 200)
      ctx.save(); ctx.translate(100, 100)
      drawHitImpact(ctx, contact, 100, .2, true, true, undefined, flavor)
      ctx.restore()
      const bitmap = painted as HTMLImageElement | undefined
      if (bitmap && new URL(bitmap.src).pathname.endsWith('hit-' + id + '@3x.webp')) {
        if (bitmap.naturalWidth !== 480 || bitmap.naturalHeight !== 360) throw new Error('Wrong contact art size: ' + id)
        const pixels = ctx.getImageData(0, 0, 200, 200).data
        let alpha = 0
        for (let i = 3; i < pixels.length; i += 4) alpha = Math.max(alpha, pixels[i]!)
        if (alpha <= 0 || alpha > 123) throw new Error('Contact art alpha outside reduced-flashing contract: ' + id + ' ' + alpha)
        results.push(id)
        break
      }
      if (performance.now() >= deadline) throw new Error('Native contact texture not painted: ' + id)
      await nextFrame()
    }
  }
  return results
}
// Real decoded native candidate pixels, outside the timed performance workload.
async function verifyNativeDeathArt(art: Artwork): Promise<Record<string, number>> {
  const canonicalOnly = loadWorldRuntimeImages(undefined, undefined, false, false)
  if (Object.keys(canonicalOnly.enemyDeaths ?? {}).length) throw new Error('Rejected old atlases loaded')
  const qa = loadWorldRuntimeImages()
  const atlasCanvas = document.createElement('canvas')
  atlasCanvas.width = atlasCanvas.height = 872
  const read = atlasCanvas.getContext('2d', { willReadFrequently: true })!
  const preview = document.createElement('canvas')
  preview.width = preview.height = 160
  const paint = preview.getContext('2d', { willReadFrequently: true })!
  const result: Record<string, number> = {}
  const deadline = performance.now() + 15000
  for (const id of ['slime', 'bat', 'goblin', 'golem', 'warlock'] as const) {
    const image = qa.enemyDeaths?.[id]
    if (!image) throw new Error('Missing isolated native candidate: ' + id)
    while (!image.complete || !image.naturalWidth) {
      if (performance.now() >= deadline) throw new Error('Candidate decode timeout: ' + id)
      await nextFrame()
    }
    if (image.naturalWidth !== 872 || image.naturalHeight !== 872) throw new Error('Invalid native atlas: ' + id)
    read.clearRect(0, 0, 872, 872)
    read.drawImage(image, 0, 0)
    const pixels = read.getImageData(0, 0, 872, 872).data
    const coverage = [0, 0, 0, 0]
    for (let y = 0; y < 872; y++) for (let x = 0; x < 872; x++) {
      const alpha = pixels[(y * 872 + x) * 4 + 3]!
      if (!alpha) continue
      if (x % 436 < 8 || x % 436 >= 428 || y % 436 < 8 || y % 436 >= 428)
        throw new Error('Nontransparent atlas gutter: ' + id + ' ' + x + ',' + y)
      coverage[Math.floor(y / 436) * 2 + Math.floor(x / 436)]!++
    }
    const frameSignatures = new Set<number>()
    for (const remaining of [1, .7, .4, .1]) {
      paint.clearRect(0, 0, 160, 160)
      paint.save(); paint.translate(80, 145)
      const drawn = drawEs3EnemyDeath(paint, image, remaining, 1, 139, 139)
      paint.restore()
      if (!drawn || paint.globalAlpha !== 1) throw new Error('Invalid death frame draw/state: ' + id)
      const rgba = paint.getImageData(0, 0, 160, 160).data
      let signature = 2166136261
      let visible = false
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3]!) visible = true
        signature = Math.imul(signature ^ rgba[i]!, 16777619)
        signature = Math.imul(signature ^ rgba[i + 1]!, 16777619)
        signature = Math.imul(signature ^ rgba[i + 2]!, 16777619)
        signature = Math.imul(signature ^ rgba[i + 3]!, 16777619)
      }
      if (!visible) throw new Error('Blank death frame: ' + id)
      frameSignatures.add(signature)
    }
    if (coverage.some(n => n === 0) || frameSignatures.size !== 4) throw new Error('Missing or repeated death frames: ' + id)
    result[id] = frameSignatures.size
  }
  atlasCanvas.width = atlasCanvas.height = preview.width = preview.height = 0
  verifyLiveDeaths(art, qa)
  return result
}

// Real combat hit -> bounded fallen pool -> production drawFrame -> expiry.
function verifyLiveDeaths(art: Artwork, world: WorldRuntimeImages): void {
  const s = createState()
  resetRun(s)
  s.mode = 'play'; s.W = 960; s.H = 540; s.spawnT = 100000; s.nextEventAt = Infinity
  const kinds = ['slime', 'bat', 'goblin', 'golem', 'warlock'] as const
  const hooks: GameHooks = { sfx() {}, message() {}, end() {}, offerUpgrades() {} }
  const assets = createRenderAssets(art)
  assets.productionWorld = world
  const canvas = document.createElement('canvas')
  canvas.width = s.W; canvas.height = s.H
  const ctx = canvas.getContext('2d')!
  const original = ctx.drawImage.bind(ctx)
  const frames = new Map(kinds.map(id => [id, new Set<string>()]))
  let nativeDraws = 0
  ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
    const id = kinds.find(kind => args[0] === world.enemyDeaths?.[kind])
    if (id) {
      nativeDraws++
      frames.get(id)!.add(args.slice(1, 5).join(','))
      const x = args[1], y = args[2]
      if (x === 444 && y === 444 && ctx.globalAlpha > .550001)
        throw new Error('Reduced-flashing dissolve exceeded opacity budget: ' + id)
    }
    original(...args)
  }) as CanvasRenderingContext2D['drawImage']
  const prefs = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, reducedMotion: 'off' as const, reducedFlashing: true }
  assets.presentation = () => resolvePresentationPolicy(prefs)
  const enemies: Mob[] = kinds.map((type, i) => ({
    type, x: (i - 2) * 140, y: 105, hp: 10, max: 10, r: 20, speed: 50, dmg: 1,
    phase: 1, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
  }))
  s.mobs = enemies.slice()
  drawFrame(ctx, s, 1, assets)
  if (nativeDraws) throw new Error('Death atlas replaced a living enemy')
  for (const enemy of enemies) hit(s, enemy, 10, hooks)
  if (s.kill !== 5 || s.fallenMobs.length !== 5) throw new Error('Actual hit did not create five death animations')
  assets.presentation = () => resolvePresentationPolicy({ ...prefs, reducedMotion: 'on' })
  drawFrame(ctx, s, 1, assets)
  if (nativeDraws) throw new Error('Reduced Motion painted a death atlas')
  assets.presentation = () => resolvePresentationPolicy(prefs)
  for (let i = 0; i < 30; i++) {
    drawFrame(ctx, s, 1, assets)
    step(s, 1 / 60, { x: 0, y: 0 }, hooks)
  }
  for (const id of kinds) if (frames.get(id)!.size !== 4) throw new Error('Live combat did not draw all four frames: ' + id)
  if (Number(s.fallenMobs.length) !== 0) throw new Error('Death pool did not expire')
  canvas.width = canvas.height = 0
}

// Real decoded faction sources, the actual runtime and the production Canvas adapter.
// Keep this outside the timed performance workload.
async function verifyFactionArt(): Promise<string[]> {
  const art = loadProductionFactionArt()
  const kinds = Object.keys(ENEMY_DEFINITIONS) as FactionKind[]
  await Promise.all(Object.values(art).flatMap(pair =>
    [pair.body, pair.telegraph, ...(pair.highResBody ? [pair.highResBody] : [])].map(image => image.decode())))
  const s = createState(); resetRun(s); s.W = 900; s.H = 600
  const canvas = document.createElement('canvas')
  canvas.width = s.W; canvas.height = s.H
  const ctx = canvas.getContext('2d')!
  const original = ctx.drawImage.bind(ctx)
  let calls: { image: CanvasImageSource; crop: number[]; alpha: number }[] = []
  ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
    calls.push({ image: args[0], crop: args.slice(1, 5) as number[], alpha: ctx.globalAlpha })
    original(...args)
  }) as CanvasRenderingContext2D['drawImage']
  try {
    for (const kind of kinds) {
      const runtime = createFactionRuntime()
      const enemy = spawnFactionEnemy(runtime, kind, 200, 220)!
      const arena = { runtime, hero: { x: 250, y: 220 }, width: s.W, height: s.H, onHeroDamage: () => true }
      const pair = art[kind], body = pair.highResBody ?? pair.body
      const side = pair.highResBody ? 512 : body.naturalHeight
      const draw = (motion = false, flashing = false) => {
        calls = []; ctx.clearRect(0, 0, s.W, s.H)
        drawLiveFactionArt(ctx, s, runtime, art, 0, 0, undefined, motion, false, flashing)
        return calls.find(call => call.image === body)
      }
      const cell = (call: ReturnType<typeof draw>) => call
        ? call.crop[0]! / side + (pair.highResBody ? call.crop[1]! / side * 3 : 0) : -1
      s.worldClock = 0
      if (![0, 1].includes(cell(draw()))) throw new Error('Missing live faction idle art: ' + kind)
      if (damageFactionEnemy(runtime, enemy, 1, 150, 220) <= 0) throw new Error('Faction hit failed: ' + kind)
      enemy.state = 'recover'; enemy.timer = .1
      tickFactionEnemies(arena, .05)
      if (!draw()) throw new Error('Faction hit art missing: ' + kind)
      tickFactionEnemies(arena, .06)
      enemy.phaseCooldown = 10
      tickFactionEnemies(arena, .01)
      if (cell(draw(false, true)) !== 2 || !calls.some(call => call.image === pair.telegraph))
        throw new Error('Faction windup art/cue missing: ' + kind)
      tickFactionEnemies(arena, enemy.timer + .001)
      if (cell(draw()) !== 3) throw new Error('Faction release art missing: ' + kind)
      if (damageFactionEnemy(runtime, enemy, enemy.hp * 10, 150, 220) <= 0)
        throw new Error('Faction death hit failed: ' + kind)
      cleanupFactionEnemies(runtime)
      if (runtime.enemies.includes(enemy) || !runtime.fallen.includes(enemy) || cell(draw()) !== 4)
        throw new Error('Faction fallen art missing: ' + kind)
      if (calls.some(call => call.image === pair.telegraph) || draw(true))
        throw new Error('Faction fallen actor retained warning or reduced-motion animation: ' + kind)
      const duration = enemy.deathVisualTotal ?? .46
      tickFactionEnemies(arena, duration * .75)
      const fading = draw()
      if (!fading || fading.alpha <= 0 || fading.alpha >= 1)
        throw new Error('Faction dissolve alpha missing: ' + kind)
      tickFactionEnemies(arena, duration)
      if (runtime.fallen.includes(enemy) || draw()) throw new Error('Faction fallen actor did not expire: ' + kind)
    }
    return kinds
  } finally { canvas.width = canvas.height = 0 }
}

// Actual engine event/claim, production Vue dialog and decoded reveal images.
async function verifyTreasureReveals(): Promise<string[]> {
  const tiers = ['rare', 'epic', 'legendary'] as const
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const results: string[] = []
  for (const tier of tiers) {
    const audio = mutedAudio()
    const cues: string[] = []
    audio.playSfx = cue => { cues.push(cue) }
    const engine = createEngine({ audio })
    engine.start()
    const s = engine.state, hero = s.hero!
    s.mobs = []; s.spawnT = 100000; s.nextEventAt = Infinity
    s.events = [{ id: 1, kind: 'chest', tier, x: hero.x, y: hero.y, expiresAt: s.time + 30 }]
    engine.advance(.016)
    if (engine.ui.specialChoice?.tier !== tier) throw new Error('Real chest event did not open: ' + tier)
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({ render: () => h(Es2MenuSystem, {
      screen: engine.ui.mode === 'level' ? 'level' : 'hidden',
      choice: engine.ui.choice, heroId: engine.ui.heroId, runMode: engine.ui.runMode, version: 'QA',
      specialChoice: engine.ui.specialChoice,
      // Exercise the real system preference rather than forcing the separate still-art setting.
      upgradeEffect: 'soft',
      accessibilityPreferences: { ...DEFAULT_ACCESSIBILITY_PREFERENCES, reducedMotion: 'system' },
      onSpecialChoose: (id: string) => engine.chooseTreasure(id),
    }) })
    try {
      app.mount(host)
      await nextTick()
      const seal = document.querySelector<HTMLImageElement>('[data-es3-chest-reveal]')
      if (reduced) {
        if (seal || document.querySelector('[data-es3-skip-reveal]')) throw new Error('Reduced Motion displayed a reveal')
      } else {
        if (!seal || !new URL(seal.src).pathname.endsWith('treasure-' + tier + '@3x.webp')) throw new Error('Wrong reveal bitmap: ' + tier)
        await seal.decode()
        document.querySelector<HTMLButtonElement>('[data-es3-skip-reveal]')!.click()
        await nextTick()
        if (document.querySelector('[data-es3-chest-reveal]') || inventorySnapshot(s).items.length) throw new Error('Skip did not preserve the unclaimed offer')
      }
      const item = engine.ui.specialChoice!.items[0]!
      const choice = document.querySelector<HTMLButtonElement>('[data-choice="' + item.id + '"]')!
      choice.click(); choice.click()
      await nextTick()
      if (inventorySnapshot(s).items.length !== 1 || cues.filter(cue => cue === 'treasureClaim').length !== 1 || s.mode !== 'play')
        throw new Error('Chest claim was not atomic: ' + tier)
      results.push(tier)
    } finally {
      app.unmount()
      host.remove()
    }
  }
  return results
}

async function run() {
  const preset: StressPreset = new URLSearchParams(location.search).get('preset') === 'mobile-low'
    ? 'mobile-low' : 'desktop'
  const source = createStressScenario(preset)
  const engine = createEngine({ audio: mutedAudio() })
  engine.selectRunMode('endless')
  engine.start()
  const s = engine.state
  s.hero = source.hero
  s.mobs = source.mobs
  s.shots = source.shots
  s.enemyShots = source.enemyShots
  s.fx = source.fx
  s.numberFx = source.numberFx
  s.W = source.W
  s.H = source.H
  s.bossSpawned = true
  s.spawnT = 100_000
  const canvas = document.querySelector<HTMLCanvasElement>('#bench')!
  const dpr = preset === 'mobile-low' ? 1 : 2
  canvas.width = s.W * dpr
  canvas.height = s.H * dpr
  canvas.style.width = s.W + 'px'
  canvas.style.height = s.H + 'px'
  const ctx = canvas.getContext('2d', { alpha: false })!
  const art = loadArtwork()
  await Promise.all(Object.values(art).map(async image => {
    if (image.complete && image.naturalWidth > 0) return
    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => reject(new Error('Artwork cannot load: ' + image.src)), { once: true })
    })
  }))
  const assets = createRenderAssets(art)
  assets.content = engine.contentRegistry
  const low = resolvePresentationPolicy({
    ...DEFAULT_ACCESSIBILITY_PREFERENCES,
    quality: 'low', reducedMotion: 'on',
  })
  assets.presentation = () => preset === 'mobile-low' ? low : null
  const heap = (): number | null => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
    return memory?.usedJSHeapSize ?? null
  }
  const contactArt = await verifyContactArt()
  const nativeDeathArt = await verifyNativeDeathArt(art)
  const factionArt = await verifyFactionArt()
  const treasureReveals = await verifyTreasureReveals()
  const heapBefore = heap()
  for (let i = 0; i < 30; i++) {
    engine.advance(1 / 60)
    drawFrame(ctx, s, dpr, assets)
  }
  const simMs: number[] = []
  const renderMs: number[] = []
  const rafIntervalsMs: number[] = []
  let prev = await nextFrame()
  for (let i = 0; i < 120; i++) {
    const ts = await nextFrame()
    rafIntervalsMs.push(ts - prev)
    prev = ts
    const simulationStart = performance.now()
    engine.advance(1 / 60)
    simMs.push(performance.now() - simulationStart)
    const renderStart = performance.now()
    drawFrame(ctx, s, dpr, assets)
    renderMs.push(performance.now() - renderStart)
  }
  const heapAfter = heap()
  return {
    label: 'ES2_REAL_CHROMIUM_CANVAS_PERFORMANCE_NOT_PHYSICAL_DEVICE',
    platform: navigator.userAgent, preset, viewport: [s.W, s.H], dpr,
    initialMobs: 130, liveMobs: s.mobs.length,
    frames: 120, contactArt, nativeDeathArt, liveDeathLifecycle: true, factionArt, treasureReveals,
    simulationMs: distribution(simMs),
    canvas2dRenderMs: distribution(renderMs),
    requestAnimationFrameIntervalMs: distribution(rafIntervalsMs),
    browserEstimatedFpsFromMedianRaf: 1000 / distribution(rafIntervalsMs).median,
    heapBeforeBytes: heapBefore, heapAfterBytes: heapAfter,
    observedHeapDeltaBytes: heapBefore !== null && heapAfter !== null ? heapAfter - heapBefore : null,
    gpuDrawCalls: null, allocationBytes: null,
  }
}
run().then(result => {
  window.__es2BenchmarkResult = result
  console.info('ES2_REAL_BROWSER_BENCHMARK ' + JSON.stringify(result))
}).catch(error => {
  window.__es2BenchmarkError = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error(window.__es2BenchmarkError)
})
