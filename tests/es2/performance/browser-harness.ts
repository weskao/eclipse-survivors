import { createEngine } from '../../../src/game/engine'
import { loadArtwork } from '../../../src/game/art'
import { createRenderAssets, drawFrame } from '../../../src/game/render'
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
  const usePixi = new URLSearchParams(location.search).get('knightPixi') === '1'
  let rendererStatus: string = 'canvas'
  if (usePixi) {
    const { createKnightPixi } = await import('virtual:knight-pixi')
    const renderer = await createKnightPixi(art.knight, mode => { rendererStatus = mode })
    if (!renderer) throw new Error('Knight Pixi dependency unavailable')
    assets.knightPixi = renderer
  }
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
  assets.knightPixi?.dispose()
  if (usePixi && rendererStatus !== 'pixi') throw new Error('Benchmark did not use the real Knight GPU renderer')
  return {
    label: 'ES2_REAL_CHROMIUM_CANVAS_PERFORMANCE_NOT_PHYSICAL_DEVICE',
    renderer: rendererStatus, platform: navigator.userAgent, preset, viewport: [s.W, s.H], dpr,
    initialMobs: 130, liveMobs: s.mobs.length,
    frames: 120,
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
