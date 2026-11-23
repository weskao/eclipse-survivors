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

**Mandatory character CRUD gate:** Before any Create, Read/review, Update/replace, or Delete/retire operation on heroes, enemies, bosses, NPCs, summons, companions, portraits, animations or their code consumers, consult [`.claude/rules/character-art-3x.md`](.claude/rules/character-art-3x.md) §5. For changes, follow its asset-first ordering, complete visual-identity/directional coverage and TDD/QA sign-off; never turn an unverified enlarged frame into an approved native 3× asset.

## Mandatory bilingual player-facing copy

- All visible game text, ARIA labels, tooltips, dialogs, notices, achievement/reward names, and content descriptions must support `en` and `zh-TW` through the existing `src/i18n.ts` catalog. Do not create another translation system or display internal IDs as reward names.
- Use `t()` at the display boundary so the player can switch languages without reloading. For messages with dynamic numbers/names, prefer a named-parameter template (`t('…{value}…', { value })`) over concatenating already-localized fragments. Never translate user-provided parameter values implicitly.
- Preserve intentional game jargon, keyboard hints, technical abbreviations and branding (e.g. HP, XP, Lv., WASD, ECLIPSE SURVIVORS) when a translation would reduce clarity.
- Verify both locales on mobile portrait, mobile landscape, tablet and desktop. Text must wrap inside its own card/dialog/HUD region without forcing page-wide horizontal scrolling or clipping essential art and actions; keep the existing internal dialog scrolling for genuinely long content.
- Add bilingual regression tests for new copy, including runtime strings and reward names, and extend browser viewport checks when UI geometry changes.

## In-game selectors and dialogs

Follow [`.claude/rules/no-native-ui.md`](.claude/rules/no-native-ui.md) when editing settings, menus, dropdowns, dialogs, or picker controls. Do not use native browser select popups; reuse the shared ES2 selector with responsive, keyboard-accessible listbox styling.

## Mandatory player-centric cross-device UX/UI — EVERY feature

**Creating, modifying or reviewing ANY player-facing UI requires device-wide design and verification, not just CSS that avoids overflow.** This includes home and selection screens, heroes, skills, modes, HUD, controls, dialogs, shops, collections, rewards, menus, notices, overlays and future features. **Always read [`.claude/rules/ui-responsive-layout.md`](.claude/rules/ui-responsive-layout.md) before implementing UI.**

1. **All device types:** Support desktop (large/compact), mobile **portrait and landscape** (including short landscape), **foldable phones** folded and unfolded (hinge/seam when present), and **tablets** in both orientations. Test intermediate viewport sizes, safe-area notches/home indicators, browser zoom, keyboard, touch, and `en`/`zh-TW`. Respond to *actual available height and width*, not only screen width.
2. **Human visual perspective:** Evaluate the *real rendered game screen* as a player would. Follow high-quality, familiar UI patterns of established games of the same genre: clear focal points, hierarchy, obvious selected states and primary actions, sufficient contrast, legible typography, balanced composition, consistent interactive feedback and spacing. Design for normal handheld viewing distance, thumbs, touch and keyboard. Do not prioritize decorative density over comprehension.
3. **Use unused space naturally:** If space is available, enlarge the **meaningful hero/skill/item images and card contents** instead of leaving large blank regions with tiny thumbnails. Use flexible grid/flex sizing and bounded min/max constraints. Maintain full-art proportions (normally `object-fit: contain`); never stretch, crop essential character art, shrink text excessively, hide key content or make buttons tiny solely to claim everything fits.
4. **Prevent occlusion:** At every supported size/orientation, essential images, text, controls and dialogs must never overlap each other, clip, sit under another component or be obstructed by safe areas, onscreen keyboard, foldable hinge, browser chrome, toasts, overlays or control hit zones. Protect the gameplay focal point and HP, boss health, timers and input buttons. Keep primary actions visible without scrolling wherever reasonably achievable; for genuinely long content, offer an obvious internal scroll area with accessible title/actions.
5. **Consistent usable controls:** Keep primary touch targets at least **44 × 44 CSS px**; preserve accessible focus/keyboard behavior, aria labels, reduced-motion settings, interfaceScale, high-contrast states and bilingual wrapping. Prefer shared components, classes and CSS tokens to duplicated device-specific UI implementations.
6. **Evidence is mandatory:** Add relevant RED → GREEN → REFACTOR tests and real-browser layout measurements/screenshots covering representative desktop, portrait and landscape mobile, both foldable states, and tablet portrait/landscape. Check no horizontal overflow, intersections, occluded/clipped text and art, readability, surplus-space use, primary action visibility without forced scroll, bilingual UI and safe-area/hinge clearance. Review actual screenshots visually. Do not claim full QA/CI passed without evidence.

The above applies **even when the user does not explicitly request RWD**. A viewport-safe screen with unreadably small art/text is not acceptable. During combat, keep the center battlefield, HP, boss health, timer and controls unobstructed by secondary information.

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
