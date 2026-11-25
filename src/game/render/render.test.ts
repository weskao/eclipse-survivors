import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../state'
import type { GameState, Mob, MobType } from '../types'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { createRenderAssets, drawFrame, drawMiniMap } from './index'
import { createFactionBridge } from '../content/enemies/integration'
import { ENEMY_DEFINITIONS, type FactionKind } from '../content/enemies/definitions'
import { spawnFactionEnemy } from '../content/enemies/runtime'
import { FACTION_VISUAL_SIZE, type FactionArtwork } from './es2/production-factions'
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../content/accessibility/preferences'
import { resolvePresentationPolicy } from '../content/accessibility/presentation'

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

describe('smooth Canvas enemy and boss health bars', () => {
  it('hides full-health overhead bars by default and shows every live enemy kind when enabled', () => {
    const s = busyState()
    s.cameraKick = 0
    const kinds: MobType[] = ['slime', 'bat', 'goblin', 'golem', 'warlock']
    s.mobs = kinds.map((type, i) => mob(type, i * 30, 50, { hp: 10, max: 10, summonedByBoss: i === 0 }))
    s.mobs.push(mob('goblin', 0, 80, { hp: 20, max: 20, elite: true }),
      mob('boss', 100, 100, { hp: 100, max: 100 }),
      mob('slime', 0, 50, { hp: 0 }), mob('slime', 5000, 5000))
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const factions = createFactionBridge({ random: () => 0 })
    assets.factions = factions
    const body = { complete: true, naturalWidth: 576, naturalHeight: 96 } as HTMLImageElement
    const warning = { complete: true, naturalWidth: 96, naturalHeight: 96 } as HTMLImageElement
    const factionKinds = Object.keys(ENEMY_DEFINITIONS) as FactionKind[]
    assets.factionArtwork = Object.fromEntries(factionKinds.map(kind => [kind, { body, telegraph: warning }])) as FactionArtwork
    for (const [i, kind] of factionKinds.entries())
      spawnFactionEnemy(factions.runtime, kind, i * 20 - 100, 100, i === 0 ? { affix: 'armored' } : {})
    spawnFactionEnemy(factions.runtime, 'phantom', 0, 100, { summonedBy: 1 })
    spawnFactionEnemy(factions.runtime, 'fire-imp', 0, 100)!.hp = 0
    spawnFactionEnemy(factions.runtime, 'fire-imp', 5000, 5000)
    const { ctx } = createFakeCtx()
    const fills: { color: string; width: number }[] = []
    ctx.fillRect = (_x, _y, width) => { fills.push({ color: String(ctx.fillStyle), width }) }
    const borders: string[] = []
    ctx.strokeRect = () => { borders.push(String(ctx.strokeStyle)) }
    drawFrame(ctx, s, 1, assets)
    expect(fills.filter(f => f.color === '#78d8a0')).toHaveLength(0)
    expect(borders.filter(color => color === '#d6a4f3')).toHaveLength(0)
    let showFullEnemyHealthBars = true
    assets.presentation = () => resolvePresentationPolicy({ ...DEFAULT_ACCESSIBILITY_PREFERENCES, showFullEnemyHealthBars })
    fills.length = 0
    borders.length = 0
    drawFrame(ctx, s, 1, assets)
    expect(fills.filter(f => f.color === '#78d8a0')).toHaveLength(kinds.length + factionKinds.length)
    expect(fills.filter(f => f.color === '#b697fa')).toHaveLength(2)
    expect(borders.filter(color => color === '#d6a4f3')).toHaveLength(2)
    expect(fills.filter(f => f.color === '#a94463' && f.width === 186)).toHaveLength(1)
    showFullEnemyHealthBars = false
    fills.length = 0
    s.mobs[0]!.hp = 5
    factions.runtime.enemies[0]!.hp /= 2
    s.worldClock += .05
    drawFrame(ctx, s, 1, assets)
    expect(fills.filter(f => f.color === '#78d8a0')).toHaveLength(0)
    expect(fills.filter(f => f.color === '#eac95f')).toHaveLength(1)
    expect(fills.filter(f => f.color === '#d78ee9')).toHaveLength(1)
  })

  it('shares faction damage trails, healing and reduced motion with legacy bars', () => {
    const s = busyState()
    s.mobs = []
    s.cameraKick = 0
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const factions = createFactionBridge({ random: () => 0 })
    assets.factions = factions
    const kind = 'shadow-assassin'
    const body = { complete: true, naturalWidth: 576, naturalHeight: 96 } as HTMLImageElement
    assets.factionArtwork = { [kind]: { body, telegraph: body } } as FactionArtwork
    const enemy = spawnFactionEnemy(factions.runtime, kind, 0, 100)!
    const { ctx } = createFakeCtx()
    const fills: { color: string; width: number }[] = []
    ctx.fillRect = (_x, _y, width) => { fills.push({ color: String(ctx.fillStyle), width }) }
    const frame = () => { fills.length = 0; drawFrame(ctx, s, 1, assets) }
    const width = FACTION_VISUAL_SIZE[kind] * 0.58 - 2
    frame()
    expect(fills.some(f => f.color === '#78d8a0')).toBe(false)
    enemy.hp = enemy.max / 4
    s.worldClock += 0.05
    frame()
    const front = fills.find(f => f.color === '#ed9851')!.width
    expect(front).toBeGreaterThan(width / 4)
    expect(front).toBeLessThan(width)
    expect(fills.find(f => f.color === '#f2c37e')!.width).toBeGreaterThan(front)
    enemy.hp = enemy.max
    s.worldClock += 0.05
    frame()
    expect(fills.find(f => f.color === '#78d8a0')!.width).toBeLessThan(width)
    expect(fills.some(f => f.color === '#f2c37e')).toBe(false)
    assets.prefersReducedMotion = () => true
    enemy.hp = enemy.max / 2
    frame()
    expect(fills.find(f => f.color === '#eac95f')?.width).toBeCloseTo(width / 2)
    expect(fills.some(f => f.color === '#f2c37e')).toBe(false)
    expect(enemy.hp).toBe(enemy.max / 2)
    enemy.hp = enemy.max
    frame()
    expect(fills.some(f => f.color === '#78d8a0')).toBe(false)
  })

  it('retains a short damage trail and eases the front fill without changing actual HP', () => {
    const s = busyState()
    const enemy = mob('goblin', 0, 50, { hp: 10, max: 10 })
    const boss = mob('boss', 100, 50, { hp: 100, max: 100 })
    s.mobs = [enemy, boss]
    const { ctx } = createFakeCtx()
    const fills: { color: string; width: number }[] = []
    const originalFill = ctx.fillRect
    ctx.fillRect = (x, y, w, h) => {
      fills.push({ color: String(ctx.fillStyle), width: w })
      originalFill(x, y, w, h)
    }
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    drawFrame(ctx, s, 1, assets)
    fills.length = 0
    enemy.hp = 4
    boss.hp = 25
    s.worldClock += 0.05
    drawFrame(ctx, s, 1, assets)
    const enemyFill = fills.find(item => item.color === '#ed9851' && item.width < 100)
    const bossFill = fills.find(item => item.color === '#d35048' && item.width > 100)
    expect(enemyFill).toBeDefined()
    expect(bossFill).toBeDefined()
    expect(fills.some(item => item.color === '#f2c37e')).toBe(true)
    expect(enemyFill!.width).toBeGreaterThan(30 * 0.4)
    expect(bossFill!.width).toBeGreaterThan(186 * 0.25)
    expect(enemy.hp).toBe(4)
    expect(boss.hp).toBe(25)
    // A fully restored normal enemy keeps its bar until the visual fill reaches 100%.
    enemy.hp = 10
    s.worldClock += 0.05
    fills.length = 0
    drawFrame(ctx, s, 1, assets)
    expect(fills.some(item => item.color === '#78d8a0')).toBe(true)
  })
})

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
    expect(made).toHaveLength(9 + 3 + 8 + 1 + 2)
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

  it('keeps the battlefield fixed while choosing a skill despite a pending camera impact', () => {
    const s = busyState()
    s.mode = 'level'
    s.cameraKick = 9
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const firstTile = (): [number, number] => {
      const { ctx } = createFakeCtx()
      let position: [number, number] | null = null
      const original = ctx.drawImage
      ctx.drawImage = ((...args: unknown[]) => {
        if (!position && args[0] === assets.biomes[0]!.tile) {
          position = [args[1] as number, args[2] as number]
        }
        return (original as (...args: unknown[]) => void)(...args)
      }) as typeof ctx.drawImage
      drawFrame(ctx, s, 1, assets)
      if (!position) throw new Error('Expected background tile to render')
      return position
    }
    const before = firstTile()
    s.worldClock += 0.25
    expect(firstTile()).toEqual(before)
    // Actual combat must keep its hit feedback; only the selection overlay is still.
    s.mode = 'play'
    expect(firstTile()).not.toEqual(before)
  })

  it('with art ready, characters use the artwork', () => {
    const { ctx, drawn } = createFakeCtx()
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    drawFrame(ctx, busyState(), 2, assets)
    for (const k of ['knight', 'slime', 'goblin', 'golem', 'boss'] as const) expect(drawn, k).toContain(assets.art[k])
    expect(drawn).not.toContain(assets.sprites.knight)
  })

  it('with art not ready, characters fall back to painted sprites (golem reuses goblin)', () => {
    const { ctx, drawn } = createFakeCtx()
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(false), make)
    drawFrame(ctx, busyState(), 1, assets)
    // The hit-tinted bat now draws from its cached filtered bitmap, not the raw sprite.
    for (const k of ['knight', 'slime', 'goblin', 'boss']) expect(drawn, k).toContain(assets.sprites[k])
    expect(drawn).not.toContain(assets.art.knight)
  })

  it('draws every effect kind (numbers, lightning, fx) without throwing', () => {
    const f = createFakeCtx()
    const { make } = fakeCanvasFactory()
    drawFrame(f.ctx, busyState(), 1, createRenderAssets(fakeArtwork(true), make))
    expect(f.calls).toContain('strokeText')
    expect(f.calls.filter((c) => c === 'lineTo').length).toBeGreaterThan(0)
  })

  it('disables combat recoil when the camera-shake preference is off', () => {
    const state = busyState()
    state.cameraKick = 9
    state.mode = 'play'
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const firstTile = (): [number, number] => {
      const { ctx } = createFakeCtx()
      let position: [number, number] | null = null
      const original = ctx.drawImage
      ctx.drawImage = ((...args: unknown[]) => {
        if (!position && args[0] === assets.biomes[0]!.tile) {
          position = [args[1] as number, args[2] as number]
        }
        return (original as (...args: unknown[]) => void)(...args)
      }) as typeof ctx.drawImage
      drawFrame(ctx, state, 1, assets)
      if (!position) throw new Error('Missing background tile')
      return position
    }
    assets.cameraShakeEnabled = () => false
    const still = firstTile()
    state.worldClock += 0.3
    expect(firstTile()).toEqual(still)
    assets.cameraShakeEnabled = () => true
    expect(firstTile()).not.toEqual(still)
  })

  it('applies a live reduced-motion preference change on the next frame', () => {
    const s = busyState()
    const { make } = fakeCanvasFactory()
    const assets = createRenderAssets(fakeArtwork(true), make)
    let reducedMotion = false
    assets.prefersReducedMotion = () => reducedMotion
    const normal = createFakeCtx()
    drawFrame(normal.ctx, s, 1, assets)
    reducedMotion = true
    const reduced = createFakeCtx()
    drawFrame(reduced.ctx, s, 1, assets)
    // Reduced motion skips ambient, echoes and swipes, which are path draws (not drawImage).
    expect(normal.calls.length).toBeGreaterThan(reduced.calls.length)
  })


  it('hides floating damage numbers under the visual policy without suppressing the battlefield', () => {
    const s = busyState()
    s.hero!.levelAnim = 0
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    assets.presentation = () => ({
      quality: 'low', pixelRatioCap: 1, ambientDensity: 0.35, vfxOpacity: 0.3,
      reduceMotion: false, reduceFlashing: true, statusSymbols: true, showDamageNumbers: false,
    })
    const f = createFakeCtx()
    drawFrame(f.ctx, s, 1, assets)
    expect(f.calls).not.toContain('strokeText')
    expect(f.drawn).toContain(assets.art.knight)
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
  it('draws the scene title at the original height except during compact phone combat', () => {
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const titlePositions = (s: GameState, width: number, height: number): number[] => {
      s.W = width
      s.H = height
      const { ctx } = createFakeCtx()
      const baselines: number[] = []
      ctx.fillText = (text, _x, y) => {
        if (text === '黎明遺庭 · 晨光薄霧' || text === 'Dawnfall Courtyard · Dawn Mist') baselines.push(y)
      }
      drawFrame(ctx, s, 1, assets)
      return baselines
    }
    const run = busyState()
    expect(titlePositions(run, 320, 640)).toEqual([])
    expect(titlePositions(run, 700, 700)).toEqual([])
    expect(titlePositions(run, 640, 320)).toEqual([])
    expect(titlePositions(run, 812, 375)).toEqual([])
    expect(titlePositions(run, 701, 900)).toEqual([34])
    expect(titlePositions(run, 901, 520)).toEqual([])
    expect(titlePositions(run, 924, 412)).toEqual([])
    expect(titlePositions(run, 1100, 520)).toEqual([])
    expect(titlePositions(run, 1101, 520)).toEqual([34])
    expect(titlePositions(menuState(), 375, 812)).toEqual([34])
  })

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
