# Eclipse Survivors — Repository Development Rules

This project uses **Vue 3, TypeScript, Vite, pnpm, Vitest, and Canvas 2D**. Preserve this stack, existing game art, combat mechanics, accessibility, and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory image-first asset workflow

**For every feature that needs images, create or generate the actual image files inside this repository before writing the code that uses them.** This applies to all game/UI features, including characters, enemies, bosses, scenes, props, skill icons, VFX, animations, and previews.

1. **Asset first:** Produce the images in their final owned project directory (normally `src/assets/<feature>/`; ES2 production uses `src/assets/es2/production/<category>/`). Preserve original source art where needed and commit the optimized runtime PNG/WebP files. Do not finish with a chat-only image, local-only export, external URL, placeholder, mock icon, or an unused asset manifest.
2. **Code second:** Import the committed local asset URL with Vite or a typed local asset map and connect it to the actual visible UI/Canvas/gameplay state. An image merely existing in a folder or an isolated gallery is **not** considered applied; keep an explicitly documented fallback for images that fail to load.
3. **Spritesheets:** Inspect the original at full resolution. Use verified per-frame source rectangles, direction/pose order and alpha boundaries. **Never guess the grid, cut into a neighboring frame, stretch a whole contact sheet as one sprite, or invent missing animation frames.** Repair or re-render bad source frames first. Preserve hitbox/telegraph geometry independently of the visual pixels.
4. **Acceptance:** Store the dimensions, frame geometry, source ID, transparency, SHA-256 and asset budget in a manifest where appropriate. Use RED → GREEN → REFACTOR tests for asset presence, mapping, source-rectangle bounds, atlas direction/state selection and fallback. Review contact sheets and real in-game screenshots, including mobile, reduced-motion and visual continuity, before calling art production-ready.
5. **Merge gate:** Include both the image files and their real code consumers in the same verified integration, run the repository-wide checks below, and do not merge incomplete art as if it were final.

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
