# ES2 performance profiling (diagnostic only)

This branch adds **adapters** and Vitest probes. It does not change shared simulation, combat rules, renderer entry points, monster counts or offscreen AI. A deterministic fixture is not a deterministic wall clock. Never use measured millisecond values as pass/fail thresholds.

## Workloads

| Profile | Work performed | Collection |
| --- | --- | --- |
| 130-actor game simulation | 130 initially alive mobs (including boss), 96 hero projectiles, 64 enemy projectiles, 96 particles and 48 damage numbers; authoritative `step()` | 30 warmup ticks + 120 measured ticks |
| Desktop/HIGH | 960×540 CSS px, 2× DPR, real HIGH presentation policy, `drawFrame()`, recording Canvas 2D | 10 warmup + 120 measured frames |
| Mobile/LOW | 390×844 CSS px, 1× DPR, real LOW/reduced-motion presentation policy, `drawFrame()`, recording Canvas 2D | 10 warmup + 120 measured frames |
| Long Endless | Start at 3,600 seconds of game time; run another 36,000 60-Hz ticks through `step()`, with 10 heap checkpoints and actor-count snapshots | Explicit opt-in (10 simulated minutes) |
| Cache probe | Bounded LRU, eight immutable keys in 16 slots, resize/DPR/scene/context/asset/quality invalidation tests | Exact hit/miss/eviction counts |

Timing probes emit an `ES2_PERFORMANCE` JSON log with real observed median/p95/p99 milliseconds per operation; the opt-in long run emits `ES2_ENDLESS_10MIN`. Canvas operation counts include `drawImage`, rectangles, paths and text: **these are mocked Canvas paint commands, not GPU draw calls or rendered FPS**. Initial load counts are fixture counts; actor counts may evolve as real simulation runs. Heap deltas are observed samples, **not allocation totals or proof of a memory leak**; allocation totals and GPU draw calls remain `null` until browser/device instrumentation captures them.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run tests/es2/performance
ES2_PERF_LONG=1 pnpm exec vitest run tests/es2/performance/benchmark.test.ts
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

Run desktop and physical iOS/Android browser traces separately with the same level, seed, viewport, and graphics policy before quoting real FPS, draw calls, allocations, energy use or thermal behavior. Capture a heap profile/GC timeline for memory-leak claims. Do not compare CI-to-local timings or infer a speedup from a mocked Canvas trace.

## Captured measurement in this session

The three helper source files were verified against their GitHub blob SHAs and standalone-checked using TypeScript 5.8.3 strict mode. An independent Node 22.16.0 (Linux) execution of the exact source blobs ran 120 samples of 128 scoped cache lookups each:

```json
{
  "label": "LOCAL_HELPER_PROBE_NOT_GAMEPLAY_FPS",
  "work": "128 scoped cache lookups per sample",
  "samples": 120,
  "elapsedMs": {
    "min": 0.021840999999994892,
    "median": 0.024654999999995653,
    "p95": 0.18143000000000598,
    "p99": 1.6020220000000052,
    "max": 1.9627509999999972
  },
  "cacheStats": {
    "size": 8,
    "hits": 15352,
    "misses": 8,
    "evictions": 0,
    "invalidations": 0,
    "hitRate": 0.9994791666666667
  }
}
```

These are **observed helper timings, not game benchmark outcomes**. Full repository `pnpm` verification and actual game/test-run timings could not be captured in this session because the execution container cannot reach the npm registry and does not have this repository's dependencies installed. A main-only `release.yml` workflow also deploys Pages; do not run it for a feature-branch verification. No speedup or real-device performance assertion is made.

## Ownership and invalidation

`cache.ts` only caches caller-defined immutable render data. `configure()` clears it when scene/biome, CSS dimensions, DPR, LOW/HIGH quality, asset revision or context identity changes; `clear()` releases entries on teardown. The cache is bounded, and hit-rate counters report actual lookup outcomes. Per-frame live enemies, collision results, hazard activation, projectiles and damage **must never** use a frame-stale cache. `visibility.ts` is a conservative **draw-only** broad phase; actors outside the screen remain active in `step()`. The production renderer already performs its own culling and weather caching; these adapters do not introduce a redundant second rendering loop.
