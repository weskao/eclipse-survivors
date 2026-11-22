import { describe, expect, it } from 'vitest'
import { distribution, profileFrames } from '../../../src/game/performance/es2/metrics'

describe('performance statistics', () => {
  it('uses nearest-rank median, p95 and p99 without mutating samples', () => {
    const samples = Array.from({ length: 100 }, (_, i) => 100 - i)
    expect(distribution(samples)).toEqual({ min: 1, median: 50, p95: 95, p99: 99, max: 100 })
    expect(samples[0]).toBe(100)
    expect(distribution([3, 1, 2])).toEqual({ min: 1, median: 2, p95: 3, p99: 3, max: 3 })
  })
  it('rejects missing and nonfinite samples', () => {
    expect(() => distribution([])).toThrow()
    expect(() => distribution([1, Number.NaN])).toThrow()
    expect(() => profileFrames(0, () => {})).toThrow()
  })
  it('samples actual operations with an injectable monotonic clock', () => {
    let now = 0
    const seen: number[] = []
    const result = profileFrames(3, i => { seen.push(i); now += i + 1 }, () => now)
    expect(result.samplesMs).toEqual([1, 2, 3])
    expect(result.summary.median).toBe(2)
    expect(seen).toEqual([0, 1, 2])
    expect(() => profileFrames(1, () => { now -= 1 }, () => now)).toThrow()
  })
})
