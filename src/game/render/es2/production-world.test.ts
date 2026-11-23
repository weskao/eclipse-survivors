import { describe, expect, it } from 'vitest'
import { WORLD_ART, loadWorldRuntimeImages, drawProductionBossFrame, drawProductionEnemyFrame } from './production-world'
import type { Ctx2D } from '../ctx'

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

  it('only loads visible game categories once at mount, not all 49 UI resources', () => {
    const assigned: string[] = []
    const makeImage = (): HTMLImageElement => ({
      complete: false,
      set src(url: string) { assigned.push(url) },
    }) as unknown as HTMLImageElement
    const runtime = loadWorldRuntimeImages(makeImage)
    expect(Object.keys(runtime.bosses)).toHaveLength(4)
    expect(Object.keys(runtime.ground)).toHaveLength(4)
    expect(Object.keys(runtime.decor)).toHaveLength(4)
    expect(assigned).toHaveLength(12)
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
    expect(calls[0]?.slice(5)).toEqual([-118, -232, 236, 236])
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 2, 236, 246, 16)).toBe(true)
    expect(calls[1]?.slice(1, 5)).toEqual([772, 16, 724, 724])
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 1, 236, 246, -1)).toBe(false)
    expect(drawProductionBossFrame(ctx, loaded(2268, 756), 1, 236, 246, 378)).toBe(false)
    expect(calls).toHaveLength(2)
  })
})
