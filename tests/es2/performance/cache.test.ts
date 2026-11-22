import { describe, expect, it } from 'vitest'
import { createScopedCache, type RenderCacheScope } from '../../../src/game/performance/es2/cache'

const scope: RenderCacheScope = {
  scene: 0, width: 960, height: 540, dpr: 2,
  quality: 'high', assetVersion: 'v1', contextId: 'canvas-1',
}
describe('bounded, scope-invalidated render cache', () => {
  it('caches null, tracks hit rate and evicts least-recently-used keys', () => {
    const cache = createScopedCache<number | null>(2)
    cache.configure(scope)
    let builds = 0
    expect(cache.get('a', () => { builds++; return null })).toBeNull()
    expect(cache.get('a', () => { builds++; return 9 })).toBeNull()
    cache.get('b', () => 2)
    cache.get('a', () => 3)
    cache.get('c', () => 4)
    expect(cache.stats()).toMatchObject({ size: 2, hits: 2, misses: 3, evictions: 1, hitRate: 0.4 })
    expect(cache.get('b', () => 22)).toBe(22)
    expect(builds).toBe(1)
    expect(cache.stats().size).toBeLessThanOrEqual(2)
  })
  it('rebuilds for scene, viewport, DPR, quality, asset, or context changes', () => {
    const cache = createScopedCache<number>(2)
    cache.configure(scope)
    cache.get('shared', () => 1)
    for (const change of [
      { scene: 3 }, { width: 390, height: 844 }, { dpr: 3 },
      { quality: 'low' as const }, { assetVersion: 'v2' }, { contextId: 'canvas-2' },
    ]) {
      cache.configure({ ...scope, ...change })
      expect(cache.stats().size).toBe(0)
      expect(cache.get('shared', () => 8)).toBe(8)
      cache.configure(scope)
      expect(cache.stats().size).toBe(0)
      cache.get('shared', () => 1)
    }
    cache.clear()
    expect(cache.stats().size).toBe(0)
    expect(() => cache.get('shared', () => 1)).toThrow()
  })
  it('regenerates deterministic values after eviction and rejects unbounded sizes', () => {
    expect(() => createScopedCache(0)).toThrow()
    expect(() => createScopedCache(Infinity)).toThrow()
    const cache = createScopedCache<number>(1)
    cache.configure(scope)
    cache.get('cell:0:0', () => 42)
    cache.get('cell:1:0', () => 7)
    expect(cache.get('cell:0:0', () => 42)).toBe(42)
  })
})
