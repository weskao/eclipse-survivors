# Eclipse Survivors — Repository Development Rules

This project uses **Vue 3, TypeScript, Vite, pnpm, Vitest, and Canvas 2D**. Preserve this stack, existing game art, combat mechanics, accessibility, and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory high-fidelity VFX performance gate

Every new/modified skill card, combat animation, particle, projectile, shader-like Canvas effect or HUD treatment **must follow [`.claude/rules/realtime-performance.md`](.claude/rules/realtime-performance.md) §8**. Preserve approved art quality and effects while reducing redundant painting: preload/decode once, reuse bounded 3× sprite caches, cull purely cosmetic offscreen content before draw/state work, keep motion/accessibility modes, and validate dense 130-enemy battles. Record comparable draw operations and real-device frame/memory evidence; Canvas drawImage is not equivalent to a GPU draw call. Do not add PixiJS solely for aesthetics or migrate partially without measured justification.

## Mandatory skill and combat visual fidelity

For any skill CRUD, ability option, projectile, enemy bullet, damage feedback, or attack animation, **read [`.claude/skills/es2-combat-visual-fidelity/SKILL.md`](.claude/skills/es2-combat-visual-fidelity/SKILL.md) before implementation**. Every skill (built-in, ES2 weapon, evolution and future pack) must use the same high-quality image-first card treatment and animated/static accessibility fallback. Avoid bare circles, lines or emojis when an authored sprite exists. Keep actual collision and danger telegraphs independent of decorative art, preserve dense-combat readability and run TDD plus real-browser mobile QA. Reuse the existing Canvas 2D renderer unless measured evidence justifies a full PixiJS migration.

## Mandatory data-driven numerical balancing — EVERY gameplay feature

**Read and follow [`.claude/rules/game-balance-config.md`](.claude/rules/game-balance-config.md) whenever adding, changing, reviewing, or deleting numerical gameplay values.** Canonical designer-editable files live in `src/game/balance/<domain>.json` (one per gameplay domain). `src/game/balance/index.ts` combines them; `src/game/config.ts` retains the typed public `BALANCE` API.

- This applies to **all** heroes (classic and special), HP/attack/speed, XP curves, skills and level caps, AoE reach/targets, weapons, enemy health/damage/spawning, treasure and healing event weights, boss difficulty, relic modifiers and future gameplay systems. Reuse domain defaults, add only named overrides per hero/skill/item, and keep the runtime algorithms shared.

- **Choose an existing JSON before creating one:** Every time a gameplay number is created or changed, identify its owner, existing shared formula and lifecycle. If it belongs to an existing domain (e.g. skill radius → `skills.json`, permanent research cost → `meta.json`, chest chance → `events.json`), extend that file and reuse shared defaults; never create a second source. **Only if the feature is genuinely a distinct gameplay domain with its own responsibilities** should you add a clearly named `<domain>.json`, register it in `src/game/balance/index.ts`, extend `src/game/config.ts`'s typed validation and add tests. Do **not** create a file per hero, skill, boss or individual knob without a concrete ownership reason.
- **Backward compatibility:** Preserve the existing `BALANCE.heroes`, `BALANCE.progression`, `BALANCE.meta`, etc. access paths and the exact numerical values in a file-only split. Do not touch save schemas, RNG, formulas or runtime algorithms merely to reorganize JSON; never parse JSON in a game frame.
- **Permanent upgrades and currencies:** The **「永久強化」v3** research tree, costs, caps, per-rank effects, achievements, milestones, starting equipment/bonuses and **暮光餘燼** payout formulas all live under `BALANCE.meta`. Use the single `researchCost()` function for both UI and purchase; preserve v2 → v3 migration, atomic storage, replay protection, preexisting ranks and the no-double-reward rule. Apply starting bonuses **once** per new run, never per tick. Do not add an artificial currency cap when the v3 safe-integer wallet already supports the required range.
- **No duplicated balance literals:** Never hard-code the same coefficient in components, scripts or tests. All player-facing stats and upgrade descriptions must reflect the source of truth; keep the existing `en` / `zh-TW` translations correct.
- Keep probabilities normalized, thresholds finite, build/rarity choices fair, endgame challenge intact, mob/projectile counts bounded, and formulas deterministic. Move gameplay-tunable numeric constants out of touched legacy modules; do not mistakenly move non-gameplay coordinates, art geometry or mathematical constants.
- Mandatory TDD and CI: cover config schema and complete enum keys, hero creation/HUD/menu, XP progression, pickups/chests, skill effects and capped levels, weapon damage and mobile performance. Refer to `src/game/balance.test.ts` and the more specific gameplay tests. Run the standard `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` gates.

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

## Mandatory BOSS orchestration and adaptive soundtrack — EVERY BOSS

**Before creating, editing, reviewing or removing any BOSS, read [`.claude/rules/boss-music-production.md`](.claude/rules/boss-music-production.md).** This is a release blocker for existing and future bosses, not an optional visual enhancement.

- Each boss must have **its own original cinematic orchestral identity** in `scripts/compose-boss-ost.mjs`, three perfectly phase-aligned MP3 variations in `public/audio/boss/`, the 15-second gameplay-clock warning path, localization and distinct intro/transition/defeat cues.
- Sampled orchestration replaces simple synthesized boss beeps during real battles. Route playback through the existing shared Web Audio owner: phase crossfades preserve beat offset, boss defeat restores standard combat music, pause/mute/interruption and user volume remain correct on all devices. Keep synth as an explicitly tested asset-load fallback only.
- Update tests, locally owned file/score manifest, sample provenance and soundfont license receipt. Require desktop, portrait/landscape phone, tablet/foldable UI evidence and audio playback/mix listening review before marking `APPROVED`. Never silently substitute another boss's soundtrack.

## Mandatory UI sound and music review

**When creating, modifying or removing ANY player-facing UI, interaction, dialog, button, menu, selector, HUD control, reward, onboarding step or gameplay flow, explicitly consider audio feedback as part of the UI/UX acceptance criteria.**

- Review whether the action warrants sound, silence or a music transition. Reuse existing cues/tracks first (`src/game/audio/sfx.ts`, `src/game/audio/engine.ts`); add a distinct cue or locally owned audio asset only when a new event genuinely needs a recognizably different sound. Do not generate a new sound for every button.
- Standard buttons receive one restrained `ui` cue and desktop mouse-entry hover may play `hover`. Use `data-ui-sfx="select"` for a meaningful local selection, `data-ui-sfx="scene"` for a major navigation, and `data-ui-sfx="managed"` for a button whose validated action already plays its own semantic sound. Use `data-ui-sfx="silent"` when feedback would be intrusive. The central delegated click handler also covers keyboard and touch; **never manually add the generic cue at an individual component**.
- Gameplay transactions play their unique sound **only after success**: `start`, `pause`/`resume`, `level`, `upgrade`, `victory`/`defeat`, etc. An invalid/denied action may use the quiet `deny` cue. Do not layer a generic click over those cues or replay effects when the action is rejected.
- Do not beep continuously while dragging sliders, scrolling, moving a joystick, hovering descendants, holding a key, or for each enemy in a crowd. Respect cooldown and polyphony caps; prioritize gameplay readability over constant interface noise.
- Reuse **one shared audio owner** with the existing 0–100 independent music/SFX volumes, mute preferences, mobile trusted-gesture unlock, visibility interruption and teardown. Never create a separate AudioContext per component or layer both legacy and ES2 scores on one scene. Music switches only at deliberate screen/game phase transitions, with no automatic autoplay before user gesture.
- Test mouse, touch, Enter/Space keyboard activation, role=listbox options, enabled/disabled states, settings, menu, modal, overlay, home/return, purchases, success/failure and mute, on desktop and mobile. Every meaningful UI change should document its chosen cue (or reason to stay silent), and TDD should assert that one action produces **at most one intended UI sound**.

See [`docs/es2/ui-audio-cue-matrix.md`](docs/es2/ui-audio-cue-matrix.md) for the shared cue taxonomy and coverage checklist.
