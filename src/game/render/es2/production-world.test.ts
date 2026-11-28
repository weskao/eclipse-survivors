import { describe, expect, it, vi } from 'vitest'
import { WORLD_ART, ES3_EPIC_TREASURE_URL, loadWorldRuntimeImages, drawProductionBossFrame, drawProductionEnemyFrame, drawEs3EnemyDeath } from './production-world'
import type { Ctx2D } from '../ctx'
import { cacheBossPhaseLayouts, bossFrameLayout } from './production-world'
import { BOSS_MAX_DRAW_PX, BOSS_BASE_DRAW_PX, bossPhaseVisualScale } from './boss-phase-layout'
import { characterOutsideViewport } from '../characters'

const loaded = (width: number, height: number): HTMLImageElement => ({
  complete: true, naturalWidth: width, naturalHeight: height,
}) as HTMLImageElement

describe('ES2 world art live asset mapping', () => {
  it('maps exactly the 49 original candidate WebPs with unique on-disk URLs', () => {
    expect(Object.keys(WORLD_ART.enemies)).toHaveLength(10)
    expect(Object.keys(WORLD_ART.bosses)).toHaveLength(4)
    expect(Object.keys(WORLD_ART.biomes)).toHaveLength(4)
    expect(Object.keys(WORLD_ART.ui)).toHaveLength(17)
    const urls = [
      ...Object.values(WORLD_ART.enemies).flatMap(a => [a.body, a.telegraph]),
      ...Object.values(WORLD_ART.bosses),
      ...Object.values(WORLD_ART.biomes).flatMap(a => [a.ground, a.decor]),
      ...Object.values(WORLD_ART.ui),
    ]
    expect(urls).toHaveLength(49)
    expect(new Set(urls).size).toBe(49)
    for (const url of urls) expect(url).toMatch(/\.webp(?:\?|$)/)
  })

  it('loads the authored common chest for real gameplay map markers, not only the archive', () => {
    const assigned: string[] = []
    const makeImage = (): HTMLImageElement => ({
      complete: false,
      set src(url: string) { assigned.push(url) },
    }) as unknown as HTMLImageElement
    const runtime = loadWorldRuntimeImages(makeImage)
    expect(runtime.chest).toBeDefined()
    expect(assigned).toContain(WORLD_ART.ui['treasure-common'])
    expect(assigned).toContain(WORLD_ART.ui['hud-xp'])
    expect(runtime.magnet).toBeDefined()
    for(const tier of ['rare','legendary','cursed'] as const) expect(assigned).toContain(WORLD_ART.ui['treasure-'+tier as keyof typeof WORLD_ART.ui])
    if (ES3_EPIC_TREASURE_URL) {
      expect(runtime.chests?.epic).not.toBe(runtime.chests?.rare)
      expect(assigned).toContain(ES3_EPIC_TREASURE_URL)
    } else expect(runtime.chests?.epic).toBe(runtime.chests?.rare)
    expect(Object.keys(runtime.enemyDeaths ?? {}).sort()).toEqual(['bat', 'goblin', 'golem', 'slime', 'warlock'])
    expect(assigned.filter(url => url.includes('-death-dissolve@3x'))).toEqual([])
    expect(assigned).toHaveLength(22 + Number(!!ES3_EPIC_TREASURE_URL))
  })

  it('loads only live world image categories once at mount, not all 49 UI resources', () => {
    const assigned: string[] = []
    const makeImage = (): HTMLImageElement => ({
      complete: false,
      set src(url: string) { assigned.push(url) },
    }) as unknown as HTMLImageElement
    const runtime = loadWorldRuntimeImages(makeImage)
    expect(Object.keys(runtime.bosses)).toHaveLength(4)
    expect(Object.keys(runtime.ground)).toHaveLength(4)
    expect(Object.keys(runtime.decor)).toHaveLength(4)
    expect(assigned).toHaveLength(22 + Number(!!ES3_EPIC_TREASURE_URL))
  })

  it('crops the real phase and enemy atlas cells without redrawing a blank image', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawProductionBossFrame(ctx, loaded(576, 192), 2, 236, 246)).toBe(true)
    expect(calls[0]?.slice(1, 5)).toEqual([192, 0, 192, 192])
    expect(drawProductionEnemyFrame(ctx, loaded(576, 96), 5, 100, 105)).toBe(true)
    expect(calls[1]?.slice(1, 5)).toEqual([480, 0, 96, 96])
    // Each atlas source frame is square: preserve silhouette proportions and bottom anchor.
    for (const call of calls) {
      const [, , , , , dx, dy, dw, dh] = call as [unknown, number, number, number, number, number, number, number, number]
      expect(dw).toBe(dh)
      expect(dx).toBe(-dw / 2)
      expect(dy + dh).toBe(4)
    }
    expect(drawProductionBossFrame(ctx, { ...loaded(576, 192), complete: false } as HTMLImageElement, 1, 236, 246)).toBe(false)
    expect(calls).toHaveLength(2)
  })

  it('reads 3x boss and enemy atlas cells without drawing neighboring frames', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawProductionBossFrame(ctx, loaded(2124, 708), 3, 236, 246)).toBe(true)
    expect(calls[0]?.slice(1, 5)).toEqual([1416, 0, 708, 708])
    expect(drawProductionEnemyFrame(ctx, loaded(1728, 288), 4, 96, 110)).toBe(true)
    expect(calls[1]?.slice(1, 5)).toEqual([1152, 0, 288, 288])
    expect(drawProductionBossFrame(ctx, loaded(2123, 708), 1, 236, 246)).toBe(false)
    expect(drawProductionEnemyFrame(ctx, loaded(1727, 288), 1, 96, 110)).toBe(false)
  })

  it('excludes transparent gutters from each native 3x boss phase without changing its foot anchor', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 3, 236, 246, 16)).toBe(true)
    expect(calls[0]?.slice(1, 5)).toEqual([1528, 16, 724, 724])
    const thirdSide = 236 * 1.24
    expect(calls[0]?.slice(5)).toEqual([-thirdSide / 2, -thirdSide + 4, thirdSide, thirdSide])
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 2, 236, 246, 16)).toBe(true)
    expect(calls[1]?.slice(1, 5)).toEqual([772, 16, 724, 724])
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 1, 236, 246, -1)).toBe(false)
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 1, 236, 246, 378)).toBe(false)
    expect(calls).toHaveLength(2)
  })

  it('rejects fractional and non-finite boss phases rather than sampling neighboring atlas cells', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    for (const invalid of [NaN, Infinity, -Infinity, 0, 1.5, 2.5, 4]) {
      expect(drawProductionBossFrame(ctx, loaded(2268, 756), invalid as 1 | 2 | 3, 236, 246, 16), String(invalid)).toBe(false)
    }
    expect(calls).toHaveLength(0)
    for (const valid of [1, 2, 3] as const) {
      expect(drawProductionBossFrame(ctx, loaded(2268, 756), valid, 236, 246, 16)).toBe(true)
    }
    expect(calls.map(call => call.slice(1, 5))).toEqual([
      [16, 16, 724, 724], [772, 16, 724, 724], [1528, 16, 724, 724],
    ])
  })

  it.each(['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph'] as const)(
    'loads %s native candidate lazily only after an explicit dev QA request',
    async id => {
      const makeImage = (): HTMLImageElement => ({
        complete: true, naturalWidth: 2268, naturalHeight: 756, src: '',
      }) as HTMLImageElement
      const normal = loadWorldRuntimeImages(makeImage)
      const qa = loadWorldRuntimeImages(makeImage, id)
      // Before the opt-in import resolves, always retain the production fallback.
      expect(qa.bosses[id].src).toBe(normal.bosses[id].src)
      await vi.waitFor(() => expect(qa.bosses[id].src).toContain(id + '-phases-native3x-QA-PENDING'))
      const other = id === 'abyss-monarch' ? 'frost-sovereign' : 'abyss-monarch'
      expect(qa.bosses[other].src).toBe(normal.bosses[other].src)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawProductionBossFrame(ctx, qa.bosses[id], 2, 236, 246)).toBe(true)
      expect(calls[0]?.slice(1, 5)).toEqual([772, 16, 724, 724])
      const secondSide = 236 * 1.12
      expect(calls[0]?.slice(5)).toEqual([-secondSide / 2, -secondSide + 4, secondSide, secondSide])
    },
  )

  it('uses legacy source rects while an opted-in boss candidate is still decoding', async () => {
    const makeImage = (): HTMLImageElement => ({
      complete: true, naturalWidth: 576, naturalHeight: 192, src: '',
    }) as HTMLImageElement
    const qa = loadWorldRuntimeImages(makeImage, 'abyss-monarch')
    await vi.waitFor(() => expect(qa.bosses['abyss-monarch'].src).toContain('QA-PENDING'))
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawProductionBossFrame(ctx, qa.bosses['abyss-monarch'], 2, 236, 246)).toBe(true)
    expect(calls[0]?.slice(1, 5)).toEqual([192, 0, 192, 192])
  })

  it('restores the authored boss atlas if a dev-only candidate image fails to load', async () => {
    const makeImage = (): HTMLImageElement => ({
      complete: true, naturalWidth: 576, naturalHeight: 192, src: '', onerror: null,
    }) as HTMLImageElement
    const qa = loadWorldRuntimeImages(makeImage, 'infernal-titan')
    await vi.waitFor(() => expect(qa.bosses['infernal-titan'].src).toContain('QA-PENDING'))
    const image = qa.bosses['infernal-titan']
    expect(image.onerror).toBeTypeOf('function')
    image.onerror?.call(image, {} as Event)
    expect(image.src).toBe(WORLD_ART.bosses['infernal-titan'])
  })

  it('keeps later boss phases at least as large as phase one, with a stable foot anchor', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    for (const phase of [1, 2, 3] as const) {
      expect(drawProductionBossFrame(ctx, loaded(2268, 756), phase, 236, 246, 16)).toBe(true)
    }
    const sizes = calls.map(call => Number(call[7]))
    expect(sizes[0]).toBe(236)
    expect(sizes[1]).toBeGreaterThan(sizes[0]!)
    expect(sizes[2]).toBeGreaterThan(sizes[1]!)
    for (const call of calls) {
      const [, , , , , x, y, w, h] = call as [unknown, number, number, number, number, number, number, number, number]
      expect(w).toBe(h)
      expect(x).toBe(-w / 2)
      expect(y + h).toBe(4)
    }
  })

  it('normalizes real visible phase height, not the transparent square, and never stretches or crops the source', () => {
    const cell = 192
    const atlas = loaded(cell * 3, cell)
    const rgba = new Uint8ClampedArray(cell * cell * 12)
    const bodies = [[20, 20, 100, 150], [30, 60, 120, 140], [15, 80, 170, 150]] as const
    for (const [i, [left, top, right, bottom]] of bodies.entries()) {
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++)
        rgba[(y * cell * 3 + i * cell + x) * 4 + 3] = 255
      // Detached source-sheet noise must not inflate the measured body.
      if (i) for (let x = 10; x < 60; x++) rgba[(10 * cell * 3 + i * cell + x) * 4 + 3] = 255
    }
    cacheBossPhaseLayouts(atlas, rgba)
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const base = BOSS_BASE_DRAW_PX
    for (const phase of [1, 2, 3] as const) {
      expect(drawProductionBossFrame(ctx, atlas, phase, base, base)).toBe(true)
      const [, sx, sy, sw, sh, x, y, w, h] = calls[phase - 1] as [unknown, number, number, number, number, number, number, number, number]
      const [left, top, right, bottom] = bodies[phase - 1]!
      expect([sx, sy, sw, sh]).toEqual([(phase - 1) * cell, 0, cell, cell])
      expect(w / sw).toBeCloseTo(h / sh)
      expect(h).toBeLessThanOrEqual(BOSS_MAX_DRAW_PX)
      expect((bottom - top) * h / cell).toBeCloseTo(130 * base / cell * bossPhaseVisualScale(phase))
      expect(y + bottom * h / cell).toBeCloseTo(4 - base + 150 * base / cell)
      expect(x + (left + right) / 2 * w / cell).toBeCloseTo(-base / 2 + 60 * base / cell)
      expect(4 + base * bossFrameLayout(atlas, phase)!.bodyTop).toBeCloseTo(y + top * h / cell)
    }
    expect(calls[0]?.slice(5)).toEqual([-base / 2, 4 - base, base, base])
    expect(characterOutsideViewport(400, 900, 800, 600, true)).toBe(false)
    expect(characterOutsideViewport(400, 900, 800, 600, false)).toBe(true)
  })

})


describe('ES3 native death atlases in normal gameplay', () => {
  it('preloads all five exact native atlases without a debug flag and restores canonical fallback on error', () => {
    const makeImage = (): HTMLImageElement => ({
      complete: false, naturalWidth: 0, naturalHeight: 0, src: '', onerror: null,
    }) as unknown as HTMLImageElement
    const runtime = loadWorldRuntimeImages(makeImage)
    expect(Object.keys(runtime.enemyDeaths ?? {}).sort()).toEqual(['bat', 'goblin', 'golem', 'slime', 'warlock'])
    for (const id of ['slime', 'bat', 'goblin', 'golem', 'warlock'] as const) {
      expect(runtime.enemyDeaths?.[id]?.src).toContain(id + '-death-preferred@3x.webp')
      expect(runtime.enemyDeaths?.[id]?.src).not.toContain('-death-dissolve@3x')
    }
    const failed = runtime.enemyDeaths?.golem!
    expect(failed.onerror).toBeTypeOf('function')
    failed.onerror?.call(failed, {} as Event)
    expect(runtime.enemyDeaths?.golem).toBeUndefined()
    expect(runtime.enemyDeaths?.bat).toBeDefined()
    const canonicalOnly = loadWorldRuntimeImages(makeImage, undefined, false, false)
    expect(Object.keys(canonicalOnly.enemyDeaths ?? {})).toEqual([])
  })
})

it('keeps all native death cells anchored and bounds final-frame opacity in reduced flashing', () => {
  const image = loaded(872, 872)
  const calls: { args: unknown[]; alpha: number }[] = []
  let alpha = 1, saved = 1
  const ctx = {
    get globalAlpha() { return alpha }, set globalAlpha(v: number) { alpha = v },
    save() { saved = alpha }, restore() { alpha = saved },
    drawImage(...args: unknown[]) { calls.push({ args, alpha }) },
  } as unknown as Ctx2D
  for (const remaining of [1, .7, .4, .24]) {
    expect(drawEs3EnemyDeath(ctx, image, remaining, 1, 100, 110, true)).toBe(true)
    expect(ctx.globalAlpha).toBe(1)
  }
  expect(calls.map(c => c.args.slice(1, 5))).toEqual([[8, 8, 420, 420], [444, 8, 420, 420], [8, 444, 420, 420], [444, 444, 420, 420]])
  expect(calls.every(c => c.args.slice(5).join(',') === '-50,-96,100,100')).toBe(true)
  expect(calls[3]!.alpha).toBeLessThanOrEqual(.55)
  expect(drawEs3EnemyDeath(ctx, loaded(871, 872), .5, 1, 100, 110)).toBe(false)
  expect(drawEs3EnemyDeath(ctx, image, 0, 1, 100, 110)).toBe(false)
  expect(calls).toHaveLength(4)
})
