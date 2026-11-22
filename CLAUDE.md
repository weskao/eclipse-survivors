# Eclipse Survivors — Repository Development Rules

This project uses **Vue 3, TypeScript, Vite, pnpm, Vitest, and Canvas 2D**. Preserve this stack, existing game art, combat mechanics, accessibility, and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Feature acceptance

- Verify new behavior from the real player entry point through the engine to the resulting state and visible feedback. Use [es-content-integration](.claude/skills/es-content-integration/SKILL.md) for pack or shared runtime integration and [es-browser-qa](.claude/skills/es-browser-qa/SKILL.md) for browser-facing changes.
- Put approved local source-derived or original assets in the project before implementing their consumers. Preserve the established hero identities and visual style, then verify the assets in their actual Vue or Canvas surface. Use [es-asset-runtime](.claude/skills/es-asset-runtime/SKILL.md).

## Mandatory real-time performance rules

**Always read and follow [`.claude/rules/realtime-performance.md`](.claude/rules/realtime-performance.md)** when modifying game simulation, mob AI, combat, skills, collisions, procedural environments, rendering, effects, or performance-critical UI.

The order of preference is **eliminate unnecessary work → precompute immutable data → reuse bounded/valid caches → reject out-of-range work cheaply → optimize only measured bottlenecks**. Never trade off combat correctness, deterministic simulation, mobile compatibility, visual readability, or player fairness for speed.

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
