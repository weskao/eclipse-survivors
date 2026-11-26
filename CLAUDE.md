# Eclipse Survivors — Repository Development Rules

Stack: **Vue 3, TypeScript, Vite, pnpm, Vitest, Canvas 2D**. Preserve the stack, existing game art, combat mechanics, accessibility and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Mandatory rules — read the owning file before you start

Each requirement lives in exactly one file. Rules without `paths:` frontmatter load automatically; open the others, and the skills, when the situation applies.

| Situation | Read and follow |
|-----------|-----------------|
| Any player-facing UI on every device (desktop, mobile portrait/landscape, tablet, foldable, safe-area, no occlusion, player-perspective review); hero selection panels | `.claude/rules/ui-responsive-layout.md` |
| Settings, menus, dropdowns, dialogs, pickers (no native browser UI) | `.claude/rules/no-native-ui.md` |
| Visible text, ARIA/`alt` labels, reward names (`en` / `zh-TW`) | `.claude/rules/bilingual-copy.md` |
| UI interaction, flow, music transition, hero active skill SFX | `.claude/rules/ui-audio.md` |
| Any gameplay number, including 「永久強化」/暮光餘燼 | `.claude/rules/game-balance-config.md` |
| Game logic, AI, combat, collisions, world, rendering, VFX, perf-critical UI | `.claude/rules/realtime-performance.md` (§8 VFX gate, §9 single-owner rendering) |
| Character CRUD: heroes, enemies, bosses, NPCs, summons, portraits, animations | `.claude/rules/character-art-3x.md` (§5 CRUD gate) |
| Knight/ranger/wizard sprites, rigid weapons, held projectiles, body atlas | `.claude/rules/hero-weapon-rendering.md` |
| Raster image generation or delivery (Polytool `towebp`, WebP only) | `.claude/rules/webp-assets.md` |
| Images: commit real asset files first, code consumer second | `.claude/rules/asset-workflow.md` |
| BOSS CRUD: original score, phase music, per-attack cinematic SFX | `.claude/rules/boss-music-production.md` |
| BOSS arrival countdown UI, BOSS phase body size | `.claude/rules/boss-visuals.md` |
| Last expedition selection, hero cosmetic cards (every new or updated hero) | `.claude/rules/hero-lobby.md` |
| Skill CRUD, ability option, projectile, enemy bullet, damage feedback, attack animation — read **before** implementation | `es2-combat-visual-fidelity` skill |
| Content pack or shared runtime integration | `es-content-integration` skill |
| Browser-facing change (menus, touch, a11y, Canvas art, audio, perf) | `es-browser-qa` skill |
| Adding or replacing sprites, animation, scenery, icons, VFX | `es-asset-runtime` skill |

## Feature acceptance

Verify new behavior from the real player entry point through the engine to the resulting state and visible feedback. Generated mockups and mocked Canvas timings are not runtime evidence; never claim QA/CI success without actual outputs.

## Mandatory TDD and measurable verification

Every gameplay or performance change follows **RED → GREEN → REFACTOR**: reproduce with a deterministic test that fails for the expected reason, make the smallest fix, rerun. Keep regression tests for boundaries, the boss, hitboxes, skills, offscreen objects, viewport resize, biome changes and long-running cache bounds. Benchmark and device-profiling rules: `.claude/rules/realtime-performance.md` §6.

Before claiming completion:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```
