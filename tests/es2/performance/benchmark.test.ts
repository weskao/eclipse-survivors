import { describe, expect, it } from 'vitest'
import { createHero, createState } from '../../../src/game/state'
import { BALANCE } from '../../../src/game/config'
import { spawnOpeningWave } from '../../../src/game/spawn'
import { step } from '../../../src/game/step'
import { createRenderAssets, drawFrame } from '../../../src/game/render'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../../../src/game/render/fakes'
import { seeded, setRandom } from '../../../src/game/math'
import { resolvePresentationPolicy } from '../../../src/game/content/accessibility/presentation'
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../../../src/game/content/accessibility/preferences'
import { createStressScenario } from '../../../src/game/performance/es2/scenarios'
import { createScopedCache } from '../../../src/game/performance/es2/cache'
import { distribution, profileFrames } from '../../../src/game/performance/es2/metrics'
import type { GameHooks } from '../../../src/game/types'

const hooks: GameHooks = {
  sfx() {}, message() {}, offerUpgrades() {},
  end() { throw new Error('An Endless stress run must not finish itself') },
}
const drawCommands = new Set(['drawImage', 'fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'fillText', 'strokeText'])
const heapBytes = (): number => process.memoryUsage().heapUsed

describe('ES2 actual engine + recording Canvas stress diagnostics', () => {
  it('generates repeatable desktop and mobile/LOW workloads without dropping actors', () => {
    const a = createStressScenario('desktop')
    const b = createStressScenario('desktop')
    expect(a.mobs).toHaveLength(130)
    expect(a.shots).toHaveLength(96)
    expect(a.enemyShots).toHaveLength(64)
    expect(a.fx).toHaveLength(96)
    expect(a.runMode).toBe('endless')
    expect(a.mobs.map(m => [m.type, m.x, m.y])).toEqual(b.mobs.map(m => [m.type, m.x, m.y]))
    const low = createStressScenario('mobile-low')
    expect([low.W, low.H]).toEqual([390, 844])
    expect(low.mobs).toHaveLength(130)
  })

  it('emits real timing distributions and Canvas command counts, with no FPS claim or timing gate', () => {
    const state = createStressScenario('desktop')
    const renderState = createStressScenario('mobile-low')
    const fake = createFakeCtx()
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const lowPolicy = resolvePresentationPolicy({
      ...DEFAULT_ACCESSIBILITY_PREFERENCES, quality: 'low', reducedMotion: 'on',
    })
    assets.presentation = () => lowPolicy
    const desktopFake = createFakeCtx()
    const desktopAssets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const highPolicy = resolvePresentationPolicy({
      ...DEFAULT_ACCESSIBILITY_PREFERENCES, quality: 'high', reducedMotion: 'off',
    })
    desktopAssets.presentation = () => highPolicy
    const desktopState = createStressScenario('desktop')
    setRandom(seeded(20261122))
    try {
      for (let i = 0; i < 30; i++) step(state, 1 / 60, { x: 0, y: 0 }, hooks)
      for (let i = 0; i < 10; i++) {
        drawFrame(fake.ctx, renderState, 1, assets)
        fake.calls.length = 0
        fake.drawn.length = 0
      }
      for (let i = 0; i < 10; i++) {
        drawFrame(desktopFake.ctx, desktopState, 2, desktopAssets)
        desktopFake.calls.length = 0
        desktopFake.drawn.length = 0
      }
      const heapStart = heapBytes()
      const sim = profileFrames(120, () => step(state, 1 / 60, { x: 0, y: 0 }, hooks))
      const paintCalls: number[] = []
      const render = profileFrames(120, () => {
        fake.calls.length = 0
        fake.drawn.length = 0
        drawFrame(fake.ctx, renderState, 1, assets)
        paintCalls.push(fake.calls.filter(command => drawCommands.has(command)).length)
      })
      const desktopPaintCalls: number[] = []
      const desktopRender = profileFrames(120, () => {
        desktopFake.calls.length = 0
        desktopFake.drawn.length = 0
        drawFrame(desktopFake.ctx, desktopState, 2, desktopAssets)
        desktopPaintCalls.push(desktopFake.calls.filter(command => drawCommands.has(command)).length)
      })
      const heapEnd = heapBytes()
      const cache = createScopedCache<number>(16)
      cache.configure({ scene: 0, width: renderState.W, height: renderState.H,
        dpr: 1, quality: 'low', assetVersion: 'test', contextId: 'fake' })
      for (let i = 0; i < 128; i++) cache.get(String(i % 8), () => i)
      const report = {
        label: 'ES2_DIAGNOSTIC_RECORDING_CANVAS_NOT_BROWSER_FPS',
        scenario: { initialMonsters: 130, initialShots: 96, enemyShots: 64,
          fx: 96, currentMonsters: state.mobs.length, viewport: [renderState.W, renderState.H],
          quality: 'low/reduced-motion' },
        simulatedTicks: 120,
        renderedFramesPerViewport: 120,
        simulationMsPerTick: sim.summary,
        mobileLowMockedCanvasMsPerFrame: render.summary,
        desktopHighMockedCanvasMsPerFrame: desktopRender.summary,
        mobileLowCanvasPaintCalls: distribution(paintCalls),
        desktopHighCanvasPaintCalls: distribution(desktopPaintCalls),
        observedHeapDeltaBytes: heapEnd - heapStart,
        allocatedBytes: null,
        gpuDrawCalls: null,
        helperCacheProbe: cache.stats(),
      }
      console.info('ES2_PERFORMANCE ' + JSON.stringify(report))
      expect(sim.samplesMs).toHaveLength(120)
      expect(render.samplesMs).toHaveLength(120)
      expect(desktopRender.samplesMs).toHaveLength(120)
      expect(lowPolicy.quality).toBe('low')
      expect(highPolicy.quality).toBe('high')
      expect(desktopPaintCalls.every(n => n > 0)).toBe(true)
      expect(paintCalls.every(n => n > 0)).toBe(true)
      expect(report.helperCacheProbe.hitRate).toBeGreaterThan(0)
      expect(state.mode).toBe('play')
    } finally {
      setRandom()
    }
  })

  it.skipIf(process.env.ES2_PERF_LONG !== '1')('profiles a 10-minute simulated Endless run with heap checkpoints', () => {
    const state = createStressScenario('desktop')
    state.time = 3600
    const heapSamples = [heapBytes()]
    const snapshots: number[] = []
    setRandom(seeded(20261122))
    try {
      const times = profileFrames(36_000, tick => {
        step(state, 1 / 60, { x: 0, y: 0 }, hooks)
        if ((tick + 1) % 3600 === 0) {
          heapSamples.push(heapBytes())
          snapshots.push(state.mobs.length)
        }
      })
      console.info('ES2_ENDLESS_10MIN ' + JSON.stringify({
        simulatedMinutes: 10, initialGameTimeSeconds: 3600,
        timingMsPerTick: times.summary, heapCheckpointsBytes: heapSamples,
        observedHeapGrowthBytes: heapSamples.at(-1)! - heapSamples[0]!,
        actorCheckpoints: snapshots, allocationBytes: null,
      }))
      expect(heapSamples).toHaveLength(11)
      expect(state.runMode).toBe('endless')
      expect(state.mode).toBe('play')
    } finally {
      setRandom()
    }
  })
})

it('ES3 gameplay remains identical across graphical quality and reduced motion/flashing', () => {
  const run = (quality: 'low' | 'medium' | 'high') => {
    setRandom(seeded(20261126))
    const state = createStressScenario('desktop'), fake = createFakeCtx()
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    assets.presentation = () => resolvePresentationPolicy({ ...DEFAULT_ACCESSIBILITY_PREFERENCES, quality, reducedMotion: quality === 'low' ? 'on' : 'off', reducedFlashing: quality === 'low' })
    try {
      for (let i = 0; i < 60; i++) { step(state, 1/60, { x: 0, y: 0 }, hooks); drawFrame(fake.ctx, state, 1, assets); fake.calls.length = 0; fake.drawn.length = 0 }
      return { time: state.time, hp: state.hero?.hp, xp: state.hero?.xp, kills: state.kill, mobs: state.mobs.map(m => [m.x,m.y,m.hp]), telemetry: state.combatTelemetry }
    } finally { setRandom() }
  }
  const high = run('high'); expect(run('medium')).toEqual(high); expect(run('low')).toEqual(high)
})

it('reports deterministic mode-specific opening XP and pressure curves', () => {
  const run = (mode: 'quick' | 'standard' | 'endless' | 'challenge') => {
    setRandom(seeded(20261126))
    try {
      const s = createState(); s.mode = 'play'; s.runMode = mode; s.W = 960; s.H = 540; s.hero = createHero('knight'); s.hero.inv = 999
      s.hero.need = BALANCE.progression.initialXpByMode[mode]
      spawnOpeningWave(s)
      for (let i=0; i<1801; i++) step(s, 1/60, {x: 0, y: 0}, hooks)
      expect(s.combatTelemetry.samples).toHaveLength(3)
      expect(s.kill).toBeGreaterThan(0)
      return { mode, ...s.combatTelemetry, kills: s.kill, damage: s.damageDealt }
    } finally { setRandom() }
  }
  for (const mode of ['quick','standard','endless','challenge'] as const) {
    const a = run(mode); expect(run(mode)).toEqual(a); console.info('ES3_OPENING_CURVE '+JSON.stringify(a))
  }
})
