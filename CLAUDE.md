# Eclipse Survivors — Repository Development Rules

Stack: **Vue 3, TypeScript, Vite, pnpm, Vitest, Canvas 2D**. Preserve the stack, existing game art, combat mechanics, accessibility and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory rules — read the owning file before you start

Each requirement lives in exactly one file below. Files under `.claude/rules/` without `paths:` frontmatter load automatically; the rest must be opened when the situation applies.

| Situation | Read and follow |
|-----------|-----------------|
| ANY player-facing UI — every device: desktop, mobile portrait/landscape, tablet, foldable (hinge), safe-area, no occlusion, player-perspective visual review, 11 px text floor, start action visible | [`.claude/rules/ui-responsive-layout.md`](.claude/rules/ui-responsive-layout.md) |
| Hero selection panels — any hero creation, update, replacement, new cosmetic or lobby UI change: one shared panel gradient, subdued hero-specific idle glow, gold selection only | [`.claude/rules/ui-responsive-layout.md`](.claude/rules/ui-responsive-layout.md#hero-selection-panel-contract) |
| Settings, menus, dropdowns, dialogs, pickers (no native browser UI) | [`.claude/rules/no-native-ui.md`](.claude/rules/no-native-ui.md) |
| Any visible text, ARIA/`alt` label, reward name (`en` / `zh-TW`) | [`.claude/rules/bilingual-copy.md`](.claude/rules/bilingual-copy.md) |
| Any UI interaction, flow, music transition, or hero active skill (mandatory cinematic cast SFX, Q/touch parity) | [`.claude/rules/ui-audio.md`](.claude/rules/ui-audio.md) |
| Any gameplay number: heroes, XP, skills, weapons, enemies, events, bosses, relics, 「永久強化」/暮光餘燼 | [`.claude/rules/game-balance-config.md`](.claude/rules/game-balance-config.md) |
| Combat feedback, skill growth, encounters, reward experience and game-feel acceptance | [`.claude/rules/game-feel.md`](.claude/rules/game-feel.md) |
| Game logic, AI, combat, collisions, world, rendering, VFX, perf-critical UI | [`.claude/rules/realtime-performance.md`](.claude/rules/realtime-performance.md) (§8 = VFX performance gate; §9 = single-owner rendering, duplicate-work and draw-operation budget) |
| Any character CRUD: heroes, enemies, bosses, NPCs, summons, portraits, animations (native 3× art at 1×; five authored facings first; independent asymmetric facings when required; verified mirror reuse, no redundant sheets) | [`.claude/rules/character-art-3x.md`](.claude/rules/character-art-3x.md) (§5 = CRUD gate) |
| Knight/ranger/wizard sprites, rigid weapons, held projectiles, body atlas | [`.claude/rules/hero-weapon-rendering.md`](.claude/rules/hero-weapon-rendering.md) |
| Any raster image generation or delivery — mandatory [Polytool](https://github.com/weskao/polytool) `towebp`, WebP-only assets and ZIPs, no redundant PNG | [`.claude/rules/webp-assets.md`](.claude/rules/webp-assets.md) |
| Images: commit real asset files first, code consumer second | [`.claude/rules/asset-workflow.md`](.claude/rules/asset-workflow.md) |
| Any BOSS create/read/update/delete (original orchestral score + phase music + every attack's synchronized cinematic SFX) | [`.claude/rules/boss-music-production.md`](.claude/rules/boss-music-production.md) |
| Skill CRUD, ability option, projectile, enemy bullet, damage feedback, attack animation | [es2-combat-visual-fidelity](.claude/skills/es2-combat-visual-fidelity/SKILL.md) skill (see below) |
| Content pack or shared runtime integration | [es-content-integration](.claude/skills/es-content-integration/SKILL.md) skill |
| Browser-facing change (menus, touch, a11y, Canvas art, audio, perf) | [es-browser-qa](.claude/skills/es-browser-qa/SKILL.md) skill |
| Adding or replacing sprites, animation, scenery, icons, VFX | [es-asset-runtime](.claude/skills/es-asset-runtime/SKILL.md) skill |

**Combat visual fidelity (mandatory):** read the es2-combat-visual-fidelity skill **before** implementation. Every skill (built-in, ES2 weapon, evolution, future pack) uses the same high-quality image-first card treatment with animated/static accessibility fallback. No bare circles, lines or emojis when an authored sprite exists. Keep collision and danger telegraphs independent of decorative art, preserve dense-combat readability, and run TDD plus real-browser mobile QA. Reuse the Canvas 2D renderer unless measured evidence justifies a full PixiJS migration. **One owner per visual event and layer:** before adding any new effect, trace existing emitters, render passes, sprite caches and fallbacks; remove redundant painting rather than stacking another implementation. Follow realtime-performance §9 for batching, overdraw, cache ownership and comparable operation budgets. Each hero and boss must have a recognizable silhouette, material, animation cadence and audio signature; no production debug geometry or generic beep substitutions. Boss attack changes also require the boss-music-production attack-level audiovisual gate.

**BOSS arrival countdown UI (mandatory for every current/future BOSS):** Use the authoritative upcoming encounter's `BossId` and its approved artwork-aligned `BOSS_DEFINITIONS.color` as the single palette source. The shared countdown panel must theme its background gradient, frame/ornaments, warning glyph, heading, boss name, numerals/unit, progress track/fill, and urgent glow from that same accent; no generic orange/red override or duplicate per-BOSS component. Keep readable contrast, the existing timing and spawn prerequisites, non-interactive compact responsive placement, localized names, and reduced-motion/flashing behavior. Unknown legacy encounters use the existing generic fallback; never guess the upcoming identity. Verify the warning matches the boss that actually spawns in every mode and visually review desktop/mobile before acceptance.

**BOSS phase body size (mandatory):** Use the visible solid-alpha body silhouette of P1 as the reference, not the transparent atlas cell size. P2/P3 must not appear smaller; preserve the source aspect ratio with one uniform scale, stable center/ground anchor and exact isolated source rect. Never stretch/squash width or height independently. Preserve current phase growth (112%/124% of P1 visible height), adjust the overhead health bar and renderer culling for the actual art, and never modify physics, hitboxes or combat balance for this correction. Precompute/cache geometry at image decode; no per-frame pixel readbacks. Assets needing more than the bounded 2x padding correction require art QA/re-authoring, not uncontrolled enlargement. Verify all three phases of every BOSS on real desktop/mobile; native-3x and actual browser evidence remain separate gates.

**Last expedition selection:** Keep the last explicit hero ID (not the legacy art job) and mode ID in browser localStorage independently of account progression. Restore silently on boot, Home, and account changes in the menu; do not alter a live run or completed result. Validate against the same current availability rules as explicit selection and fall back independently to the first selectable hero/mode (currently knight/quick). Future account-specific entitlement rules must be enforced by those same checks, not by separate storage-only logic. A storage failure keeps the latest in-memory choice and must not block play. Never overwrite or merge account saves to restore a UI preference.

## Feature acceptance

Verify new behavior from the real player entry point through the engine to the resulting state and visible feedback. Generated mockups and mocked Canvas timings are not runtime evidence; never claim QA/CI success without actual outputs.

For the ES3 combat/juice/pacing/rewards branch only, follow the owner-approved manual-acceptance exception in [game-feel.md](.claude/rules/game-feel.md#es3-owner-approved-acceptance-exception). It does not waive implementation, automated correctness, accessibility or performance work, or change other branches' release requirements.

## Mandatory TDD and measurable verification

Every gameplay or performance change follows **RED → GREEN → REFACTOR**: reproduce with a deterministic test that fails for the expected reason, make the smallest fix, rerun. Keep regression tests for boundaries, the boss, hitboxes, skills, offscreen objects, viewport resize, biome changes and long-running cache bounds. Benchmark and device-profiling rules: [`realtime-performance.md` §6](.claude/rules/realtime-performance.md#6-required-test-driven-workflow-and-performance-evidence).

Before claiming completion:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```
