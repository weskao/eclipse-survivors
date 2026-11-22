import { describe, expect, it } from 'vitest'
import { createState, resetRun } from './state'
import { nearbyObstacles } from './world'
import type { Mob } from './types'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './render/fakes'
import { createRenderAssets, drawFrame } from './render'

const mob = (x: number, y: number, hp = 100): Mob => ({
  x, y, hp, max: 100, type: 'slime', r: 18, speed: 0, dmg: 0, phase: 0,
  hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})

describe('crowd performance contracts', () => {
  it('reuses deterministic obstacle geometry between overlapping queries', () => {
    const first = nearbyObstacles(0, 300, 200, 700)
    const second = nearbyObstacles(0, 330, 200, 700)
    const shared = first.find(a => second.some(b => a.x === b.x && a.y === b.y))
    expect(shared).toBeDefined()
    expect(second.find(b => b.x === shared!.x && b.y === shared!.y)).toBe(shared)
    expect(nearbyObstacles(0, 300, 200, 700)).toEqual(first)
  })

  it('only sorts living on-screen actors and still draws the hero and nearby boss', () => {
    const s = createState()
    resetRun(s)
    s.W = 960
    s.H = 540
    const near = mob(50, 20)
    const boss = { ...mob(130, 40), type: 'boss' as const, r: 48 }
    s.mobs = [near, boss, mob(0, 30, 0),
      ...Array.from({ length: 130 }, (_, i) => mob(3200 + i * 10, 2800 + i * 5))]
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const { ctx, drawn } = createFakeCtx()
    drawFrame(ctx, s, 1, assets)
    expect(assets.depthOrder).toEqual([s.hero, near, boss])
    expect(drawn).toContain(assets.art.knight)
    expect(drawn).toContain(assets.art.boss)
  })
})
