import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../state'
import type { GameState, Mob, MobType } from '../types'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { createRenderAssets, drawFrame, drawMiniMap } from './index'

const mob = (type: MobType, x: number, y: number, over: Partial<Mob> = {}): Mob => ({
  x, y, type, hp: 5, max: 10, r: 20, speed: 50, dmg: 1, phase: 1.3, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, ...over,
})

function menuState(): GameState {
  const s = createState()
  s.W = 800
  s.H = 600
  return s
}

function busyState(): GameState {
  const s = menuState()
  resetRun(s)
  const hero = s.hero!
  hero.skills = { blaze: 2, shield: 3, orb: 2 }
  hero.levelAnim = 0.5
  hero.dash = 0.2
  hero.inv = 1
  hero.face = -1
  hero.strike = 0.1
  hero.moveAmount = 0.8
  s.worldClock = 2.5
  s.cameraKick = 4
  s.mobs = [
    mob('slime', 60, 40), mob('bat', -80, 90, { hit: 1 }), mob('goblin', 100, -60, { stagger: 1 }),
    mob('golem', -120, -50), mob('boss', 0, 150),
  ]
  s.shots = [
    { x: 30, y: 10, vx: 100, vy: 0, life: 1, d: 1, kind: 'arrow', r: 4 },
    { x: -30, y: 20, vx: 0, vy: 100, life: 1, d: 1, kind: 'magic', r: 6 },
  ]
  s.stars = [{ x: 50, y: 50, value: 5, t: 1 }, { x: -50, y: 50, value: 20, t: 2 }]
  s.swipes = [{ x: 10, y: 10, a: 0.5, life: 0.1, max: 0.2, r: 40 }]
  s.motionEchoes = [{ x: 5, y: 5, kind: 'knight', frame: 0, angle: 0, life: 0.1, max: 0.23 }]
  s.impactWaves = [{ x: 20, y: 20, size: 60, color: '#ffd59a', life: 0.2, max: 0.38 }]
  s.lightningFx = [{ pts: [{ x: 0, y: 0 }, { x: 40, y: 30 }, { x: 80, y: 20 }], life: 0.1, max: 0.23 }]
  s.numberFx = [{ x: 30, y: -30, life: 0.3, value: 42, boss: false }, { x: 0, y: 120, life: 0.3, value: 99, boss: true }]
  s.fx = (['spark', 'footstep', 'ice', 'meteor', 'ember', 'vortex'] as const).map((type) => (
    { x: 10, y: -20, life: 0.4, max: 0.8, color: '#ffffff', r: 4, type }
  ))
  return s
}

describe('createRenderAssets', () => {
  it('paints fallback sprites and the three props via the injected canvas factory', () => {
    const { make, made } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(false), make)
    for (const k of ['knight', 'ranger', 'wizard', 'slime', 'bat', 'goblin', 'boss', 'tree', 'rock']) {
      expect(assets.sprites[k], k).toBeDefined()
    }
    expect(assets.props.tree.width).toBe(230)
    expect(assets.props.ruin.width).toBe(148)
    expect(assets.props.crystal.width).toBe(120)
    expect(made).toHaveLength(9 + 3 + 8)
    expect(made.every((m) => m.fake.calls.includes('fill') || m.fake.calls.includes('stroke'))).toBe(true)
  })
})

describe('drawFrame', () => {
  it('menu (no hero): draws background and ambient, then returns before any character', () => {
    const { ctx, calls, drawn } = createFakeCtx()
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    drawFrame(ctx, menuState(), 1, assets)
    expect(calls[0]).toBe('setTransform')
    expect(calls).toContain('fillText')
    expect(calls).not.toContain('strokeText')
    const biomeTiles = assets.biomes.map(b => b.tile)
    const landmarks = assets.biomes.map(b => b.landmark)
    const props = Object.values(assets.props)
    expect(drawn.every(d => d === assets.art.courtyard || biomeTiles.includes(d as HTMLCanvasElement) || landmarks.includes(d as HTMLCanvasElement) || props.includes(d as HTMLCanvasElement))).toBe(true)
    expect(calls.at(-1)).toBe('fillRect')
  })

  it('with art ready, characters use the artwork', () => {
    const { ctx, drawn } = createFakeCtx()
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    drawFrame(ctx, busyState(), 2, assets)
    for (const k of ['knight', 'slime', 'bat', 'goblin', 'golem', 'boss'] as const) expect(drawn, k).toContain(assets.art[k])
    expect(drawn).not.toContain(assets.sprites.knight)
  })

  it('with art not ready, characters fall back to painted sprites (golem reuses goblin)', () => {
    const { ctx, drawn } = createFakeCtx()
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(false), make)
    drawFrame(ctx, busyState(), 1, assets)
    for (const k of ['knight', 'slime', 'bat', 'goblin', 'boss']) expect(drawn, k).toContain(assets.sprites[k])
    expect(drawn).not.toContain(assets.art.knight)
  })

  it('draws every effect kind (numbers, lightning, fx) without throwing', () => {
    const f = createFakeCtx()
    const { make } = fakeCanvasFactory()
    drawFrame(f.ctx, busyState(), 1, createRenderAssets(fakeArtwork(true), make))
    expect(f.calls).toContain('strokeText')
    expect(f.calls.filter((c) => c === 'lineTo').length).toBeGreaterThan(0)
  })

  it.each([0, 1, 2, 3])('scene %i draws', (scene) => {
    const s = busyState()
    s.currentScene = scene
    s.worldClock = 100
    const { make } = fakeCanvasFactory()
    expect(() => drawFrame(createFakeCtx().ctx, s, 1, createRenderAssets(fakeArtwork(true), make))).not.toThrow()
  })
})

describe('drawMiniMap', () => {
  const assets = () => createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)

  it('draws a dot per on-map mob and skips off-map ones', () => {
    const s = busyState()
    s.mobs = [mob('slime', 100, 0), mob('boss', -200, 100), mob('bat', 0, -300), mob('goblin', 9000, 9000)]
    const { ctx, calls } = createFakeCtx()
    drawMiniMap(ctx, s, assets())
    expect(calls.filter((c) => c === 'arc')).toHaveLength(3)
    expect(calls).toContain('strokeRect')
  })

  it('does nothing without a hero', () => {
    const { ctx, calls } = createFakeCtx()
    drawMiniMap(ctx, menuState(), assets())
    expect(calls).toHaveLength(0)
  })
})


describe('biome renderer contracts', () => {
  it('uses different cached world tiles and landmarks across scenes', () => {
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    const drawn = [0, 1, 2, 3].map(scene => {
      const s = busyState()
      s.currentScene = scene
      const f = createFakeCtx()
      drawFrame(f.ctx, s, 1, assets)
      return f.drawn
    })
    for (let i = 0; i < 4; i++) expect(drawn[i]).toContain(assets.biomes[i]!.tile)
    expect(drawn[0]).toContain(assets.art.courtyard)
    for (let i = 1; i < 4; i++) expect(drawn[i]).not.toContain(assets.art.courtyard)
  })
  it('shows spawned event symbols on minimap and in world without affecting combat', () => {
    const s = busyState()
    s.events.push({ id: 1, kind: 'chest', x: 50, y: 20, expiresAt: 50 })
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    const mini = createFakeCtx()
    drawMiniMap(mini.ctx, s, assets)
    expect(mini.calls).toContain('fillText')
    const world = createFakeCtx()
    drawFrame(world.ctx, s, 1, assets)
    expect(world.calls.filter(x => x === 'fillText').length).toBeGreaterThan(1)
  })
})
