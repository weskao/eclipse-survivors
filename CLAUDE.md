# Eclipse Survivors — Repository Development Rules

This project uses **Vue 3, TypeScript, Vite, pnpm, Vitest, and Canvas 2D**. Preserve this stack, existing game art, combat mechanics, accessibility, and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory image-first asset workflow

**For every feature that needs images, create or generate the actual image files inside this repository before writing the code that uses them.** This applies to all game/UI features, including characters, enemies, bosses, scenes, props, skill icons, VFX, animations, and previews.

1. **Asset first:** Produce the images in their final owned project directory (normally `src/assets/<feature>/`; ES2 production uses `src/assets/es2/production/<category>/`). Preserve original source art where needed and commit the optimized runtime PNG/WebP files. Do not finish with a chat-only image, local-only export, external URL, placeholder, mock icon, or an unused asset manifest.
2. **Code second:** Import the committed local asset URL with Vite or a typed local asset map and connect it to the actual visible UI/Canvas/gameplay state. An image merely existing in a folder or an isolated gallery is **not** considered applied; keep an explicitly documented fallback for images that fail to load.
3. **Spritesheets:** Inspect the original at full resolution. Use verified per-frame source rectangles, direction/pose order and alpha boundaries. **Never guess the grid, cut into a neighboring frame, stretch a whole contact sheet as one sprite, or invent missing animation frames.** Repair or re-render bad source frames first. Preserve hitbox/telegraph geometry independently of the visual pixels.
4. **Acceptance:** Store the dimensions, frame geometry, source ID, transparency, SHA-256 and asset budget in a manifest where appropriate. Use RED → GREEN → REFACTOR tests for asset presence, mapping, source-rectangle bounds, atlas direction/state selection and fallback. Review contact sheets and real in-game screenshots, including mobile, reduced-motion and visual continuity, before calling art production-ready.
5. **Merge gate:** Include both the image files and their real code consumers in the same verified integration, run the repository-wide checks below, and do not merge incomplete art as if it were final.

## Mandatory character art: native 3× artwork rendered at 1×

**Every character, including the six playable heroes, future heroes, enemies, bosses, companions, summons, and NPCs, MUST follow [`.claude/rules/character-art-3x.md`](.claude/rules/character-art-3x.md).** This applies to newly generated sprites and every replacement of existing character art.

- **Real 3× source art:** For a character drawn at `W × H` game/world CSS pixels, author each complete frame at no less than `3W × 3H` *actual source-detail pixels*, and draw at `W × H` (1×) in Canvas. A 198px source enlarged to 384px and named `@3x` **does not** count as a native 3× master. Keep a manifest identifying the authentic source resolution, nominal output resolution, and any interpolation; never report interpolated art as 3× finished.
- **One identity across all uses:** Selection/home portrait, in-run top-left HUD portrait, rendered idle/movement, basic attack, cast, skill and victory must portray the **same** person and costume: face/hood/hair, silhouette, attire, colors, equipment and accessories. Preserve appropriate feminine traits for female characters, with the same realistic dark-fantasy art style and gameplay legibility as the original heroes. No generic fallback showing another job/hero.
- **Complete motion & directions:** Author and actually use the character's needed facing directions (`E, SE, S, SW, W, NW, N, NE`) and ordered, clearly distinct consecutive frames for each supported pose. A sideways eight-frame run strip is **not** an eight-direction run. Do not create missing animation by relabeling a single pose, mirroring a wrong handed/shield-bearing pose or cycling across unrelated frames. Keep equipment hand, ground contact, frame crop and visual scale stable.
- **Split if necessary:** When 3× source sheets exceed mobile texture limits or memory budgets, split into multiple local transparent WebP atlases by character/pose/direction. Record frame dimensions, grid, directions, frame timing, foot anchors, file hashes and fallback status in a manifest; lazy-load only the current hero's needed atlases, cache/evict within a bounded budget. Never shrink a 3× source just to pack every animation onto one image.
- **Asset-first integration & proof:** Commit all real assets to the repository **before** updating their Vite imports and the Canvas/HUD consumers. Test every index/rect, idle/run/attack/special/reduced-motion, switching heroes, all supported facings, mobile sizes, and actual on-screen 1× rendering. Capture contact sheets plus real-browser screenshots; unfinished directions, incomplete art, or fake-upscaled frames must stay explicitly `QA_PENDING`, never `approved`.

## In-game selectors and dialogs

Follow [`.claude/rules/no-native-ui.md`](.claude/rules/no-native-ui.md) when editing settings, menus, dropdowns, dialogs, or picker controls. Do not use native browser select popups; reuse the shared ES2 selector with responsive, keyboard-accessible listbox styling.

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
