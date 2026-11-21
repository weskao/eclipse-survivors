// Every former `Math.random()` call in gameplay goes through `random()` so tests can seed it.
let source: () => number = Math.random

export const random = (): number => source()
/** Test hook: swap the RNG; call with no argument to restore Math.random. */
export function setRandom(fn: () => number = Math.random): void { source = fn }

export const rand = (a: number, b: number): number => a + random() * (b - a)
export const minmax = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x))
export const dist = (x: number, y: number): number => Math.hypot(x, y)
/** Deterministic pseudo-noise used for world-prop placement and decorative patterns. */
export const hash = (x: number, y: number): number => {
  const z = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return z - Math.floor(z)
}
export const easing = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(t, 1)), 3)

/** Small deterministic RNG (mulberry32) for tests. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
