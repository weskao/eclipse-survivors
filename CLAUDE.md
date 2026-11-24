# Eclipse Survivors — Repository Development Rules

Stack: **Vue 3, TypeScript, Vite, pnpm, Vitest, Canvas 2D**. Preserve the stack, existing game art, combat mechanics, accessibility and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory rules — read the owning file before you start

Each requirement lives in exactly one file below. Files under `.claude/rules/` without `paths:` frontmatter load automatically; the rest must be opened when the situation applies.

| Situation | Read and follow |
|-----------|-----------------|
| ANY player-facing UI — every device: desktop, mobile portrait/landscape, tablet, foldable (hinge), safe-area, no occlusion, player-perspective visual review, 11 px text floor, start action visible | [`.claude/rules/ui-responsive-layout.md`](.claude/rules/ui-responsive-layout.md) |
| Settings, menus, dropdowns, dialogs, pickers (no native browser UI) | [`.claude/rules/no-native-ui.md`](.claude/rules/no-native-ui.md) |
| Any visible text, ARIA/`alt` label, reward name (`en` / `zh-TW`) | [`.claude/rules/bilingual-copy.md`](.claude/rules/bilingual-copy.md) |
| Any UI interaction, flow, music transition, or hero active skill (mandatory cinematic cast SFX, Q/touch parity) | [`.claude/rules/ui-audio.md`](.claude/rules/ui-audio.md) |
| Any gameplay number: heroes, XP, skills, weapons, enemies, events, bosses, relics, 「永久強化」/暮光餘燼 | [`.claude/rules/game-balance-config.md`](.claude/rules/game-balance-config.md) |
| Game logic, AI, combat, collisions, world, rendering, VFX, perf-critical UI | [`.claude/rules/realtime-performance.md`](.claude/rules/realtime-performance.md) (§8 = VFX performance gate) |
| Any character CRUD: heroes, enemies, bosses, NPCs, summons, portraits, animations (native 3× art at 1×; five authored facings first; independent asymmetric facings when required; verified mirror reuse, no redundant sheets) | [`.claude/rules/character-art-3x.md`](.claude/rules/character-art-3x.md) (§5 = CRUD gate) |
| Knight/ranger/wizard sprites, rigid weapons, held projectiles, body atlas | [`.claude/rules/hero-weapon-rendering.md`](.claude/rules/hero-weapon-rendering.md) |
| Any raster image generation or delivery — mandatory [Polytool](https://github.com/weskao/polytool) `towebp`, WebP-only assets and ZIPs, no redundant PNG | [`.claude/rules/webp-assets.md`](.claude/rules/webp-assets.md) |
| Images: commit real asset files first, code consumer second | [`.claude/rules/asset-workflow.md`](.claude/rules/asset-workflow.md) |
| Any BOSS create/read/update/delete (original orchestral score + phase music) | [`.claude/rules/boss-music-production.md`](.claude/rules/boss-music-production.md) |
| Skill CRUD, ability option, projectile, enemy bullet, damage feedback, attack animation | [es2-combat-visual-fidelity](.claude/skills/es2-combat-visual-fidelity/SKILL.md) skill (see below) |
| Content pack or shared runtime integration | [es-content-integration](.claude/skills/es-content-integration/SKILL.md) skill |
| Browser-facing change (menus, touch, a11y, Canvas art, audio, perf) | [es-browser-qa](.claude/skills/es-browser-qa/SKILL.md) skill |
| Adding or replacing sprites, animation, scenery, icons, VFX | [es-asset-runtime](.claude/skills/es-asset-runtime/SKILL.md) skill |

**Combat visual fidelity (mandatory):** read the es2-combat-visual-fidelity skill **before** implementation. Every skill (built-in, ES2 weapon, evolution, future pack) uses the same high-quality image-first card treatment with animated/static accessibility fallback. No bare circles, lines or emojis when an authored sprite exists. Keep collision and danger telegraphs independent of decorative art, preserve dense-combat readability, and run TDD plus real-browser mobile QA. Reuse the Canvas 2D renderer unless measured evidence justifies a full PixiJS migration.

## Feature acceptance

Verify new behavior from the real player entry point through the engine to the resulting state and visible feedback. Generated mockups and mocked Canvas timings are not runtime evidence; never claim QA/CI success without actual outputs.

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
