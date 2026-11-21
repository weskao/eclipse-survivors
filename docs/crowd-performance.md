# Crowd performance optimization

Branch: `perf/mob-crowd-optimization` (based on main at `76cc7fda`).

## Root causes verified by RED tests

- Each mob resolved obstacles independently, regenerating the same deterministic world-cell geometry every tick.
- Depth sorting included every mob (including distant and dead ones), although the sprite renderer culled offscreen actors afterwards.
- Fullscreen vignette gradients were allocated every frame.
- Each magic projectile allocated an additional radial gradient per draw.
- Damage numbers and impact waves were sent to Canvas even when completely offscreen.

## Changes

- Memoize deterministic obstacles per scene/grid cell, with a 1,024-cell FIFO eviction bound; retain all collision and hazard rules.
- Reuse world cells between overlapping queries, skip per-query square roots where a squared comparison suffices.
- Filter offscreen/dead mobs before depth sorting; do **not** disable offscreen AI or boss persistence.
- Cache the vignette gradient per rendering context and viewport dimensions.
- Prepaint the magic-bolt glow to one high-DPI 168×168 canvas and reuse it per projectile, keeping its visual position and fallback behavior.
- Skip fully offscreen damage numbers and impact waves, and skip trigonometry for offscreen player projectiles.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run src/game/crowd-performance.test.ts src/game/render/gradient-performance.test.ts
pnpm exec vitest run src/game/crowd-benchmark.test.ts
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

## Measurements

Diagnostic benchmark: 130 living mobs, 240 simulation ticks and 60 draws to a mocked Canvas 2D context in GitHub Actions.

| CI build | Simulation, 240 ticks | Mocked canvas, 60 frames |
| --- | ---: | ---: |
| Before optimization (`6f1ee37`) | 143.93 ms | 29.79 ms |
| Terrain cache and visible sorting (`9c26af7`) | 96.57 ms | 27.57 ms |
| Texture/effects optimization (`caf437a`) | 75.59 ms | 22.74 ms |

GitHub-hosted runner workloads vary; these numbers are single-run diagnostic evidence, **not** statistically controlled measurements or actual browser/mobile frame times. Browser/GPU profiling, mobile thermal soak, p95/p99 frame times and multi-run comparison are still required before guaranteeing a target FPS. Benchmark timings do not gate CI to avoid flaky failures.

## Gameplay safeguards

All 130 mobs still receive AI and simulation updates. Boss lifetime, hit detection, enemy drops, skills, movement and victory rules remain unchanged. Rendering only omits objects completely outside the visible viewport.
