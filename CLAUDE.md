# Eclipse Survivors — Repository Development Rules

This project uses **Vue 3, TypeScript, Vite, pnpm, Vitest, and Canvas 2D**. Preserve this stack, existing game art, combat mechanics, accessibility, and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory performance-first development

**Prefer eliminating computation over making repeated computation faster.** Inspect hot loops in `src/game/step.ts`, `src/game/enemies/`, `src/game/skills.ts`, `src/game/combat.ts`, `src/game/world.ts`, and `src/game/render/` before changing them.

1. **Move invariant work out of frames.** Precompute static spawn tables, deterministic world cells, environment particle seeds, image geometry, and reusable draw resources during initialization or first use. Never recalculate `hash()` or other fixed procedural positions per frame.
2. **Cache safely.** Use bounded caches for procedurally generated infinite-world cells. Include scene/biome and all relevant inputs in the cache key; preserve the original geometry, invalidation on changed dimensions/scenes, and deterministic re-generation after eviction. Never cache time-dependent collision, hazard activation, enemy state, or mutable damage values.
3. **Minimize hot-path math.** Prefer squared-distance comparisons and axis-aligned broad-phase rejection before `Math.hypot` / `Math.sqrt` for pure range checks. Only compute true distances when needed for normalization, falloff, ordering, or exact intersection.
4. **Avoid redundant crowd work.** Compute an actor's distance once per operation when sorting or selecting targets. Avoid unnecessary `sort()`, `filter()`, `map()`, object creation, repeated full-crowd scans, and closures inside per-enemy/per-frame loops. Reuse existing buffers and helpers when appropriate; do not introduce speculative complexity.
5. **Render only what is visible.** Cull dead and offscreen sprites and effects *before* expensive sorting, transforms, gradients or draw calls. Reuse Canvas gradients and prepainted sprites when equivalently positioned, preserving DPI quality and original effects. Keep render and simulation concerns separate.
6. **Do not sacrifice combat correctness to save CPU.** Never skip critical simulation solely because a mob is offscreen. Preserve boss persistence, AI telegraphs and attack cadence, hitboxes, skill and XP rewards, obstacle collision, event timing, damage, victory rules, and seeded reproducibility.
7. **Never let degraded FPS change rules.** Maintain correct frame-time handling, pause/resume behavior, and mobile inputs. Do not silently lower enemy counts, cooldown precision, visual quality or difficulty as a shortcut. Adaptive rendering or AI throttling requires independently measured evidence and explicit tests proving fairness.
8. **Prefer platform-native code.** Reuse browser APIs and existing dependencies; do not add a custom scheduler, worker, physics engine, spatial index or caching library unless profiling shows a concrete benefit.

## Mandatory TDD and measurable verification

For every gameplay or performance change: **RED → GREEN → REFACTOR**. First reproduce the issue with a deterministic test and verify it fails for the expected reason; then make the smallest change and run the tests again. Keep regression tests for boundary cases, the boss, hitboxes, skills, offscreen objects, viewport resize, biome changes, and long-running cache bounds.

Before claiming completion run:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

Use `src/game/crowd-benchmark.test.ts` as a **diagnostic** 130-mob benchmark (simulation and mocked Canvas); do not turn single-run timings into flaky pass/fail thresholds. Compare baselines and candidates under identical workloads with multiple runs, and separately profile real browser rendering and iOS/Android devices (median and p95/p99 frame time, allocations, memory, CPU, dropped frames, thermals, visual correctness). Never label simulated Canvas timings as actual FPS or claim a speedup without measurement.

Write concise notes about why any necessary real-time computation cannot be precomputed and what invalidates each new cache. Favor the simplest correct optimization over speculative abstractions.
