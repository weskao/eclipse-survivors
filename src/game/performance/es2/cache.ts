/** The owner supplies identities for any context and assets, and invalidates on changes. */
export interface RenderCacheScope {
  scene: number
  width: number
  height: number
  dpr: number
  quality: 'low' | 'medium' | 'high'
  assetVersion: string
  contextId: string
}

export interface CacheStats {
  size: number
  hits: number
  misses: number
  evictions: number
  invalidations: number
  hitRate: number | null
}

/** Bounded LRU for immutable, expensive-to-create render data only.
 * Never put mutable enemies, damage, hazard activation or projectile state here.
 */
export function createScopedCache<Value>(capacity: number) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new RangeError('Cache capacity must be a positive safe integer')
  }
  const entries = new Map<string, Value>()
  let scopeKey: string | undefined
  let hits = 0
  let misses = 0
  let evictions = 0
  let invalidations = 0

  return {
    configure(scope: RenderCacheScope): void {
      const key = JSON.stringify([scope.scene, scope.width, scope.height, scope.dpr,
        scope.quality, scope.assetVersion, scope.contextId])
      if (key === scopeKey) return
      if (scopeKey !== undefined) invalidations++
      entries.clear()
      scopeKey = key
    },
    get(key: string, build: () => Value): Value {
      if (scopeKey === undefined) throw new Error('Cache scope must be configured before use')
      if (entries.has(key)) {
        const value = entries.get(key)!
        entries.delete(key)
        entries.set(key, value)
        hits++
        return value
      }
      misses++
      const value = build()
      if (entries.size >= capacity) {
        const oldest = entries.keys().next()
        if (!oldest.done) { entries.delete(oldest.value); evictions++ }
      }
      entries.set(key, value)
      return value
    },
    clear(): void {
      entries.clear()
      if (scopeKey !== undefined) invalidations++
      scopeKey = undefined
    },
    stats(): CacheStats {
      const requests = hits + misses
      return { size: entries.size, hits, misses, evictions, invalidations, hitRate: requests ? hits / requests : null }
    },
  }
}
