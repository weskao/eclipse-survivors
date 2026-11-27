# Eclipse Survivors — Repository Development Rules

Stack: **Vue 3, TypeScript, Vite, pnpm, Vitest, Canvas 2D**, Node 24. PixiJS 8 draws boss projectile and release VFX only, composited into the Canvas frame (`docs/boss-pixijs-vfx.md`); warnings, hazards, other combat effects and UI stay Canvas-owned. Preserve the stack, existing game art, combat mechanics, accessibility and mobile support, and follow the existing architecture.

**Branches:** work on a dedicated `feature/**` or `fix/**` branch and commit there. `develop` is the integration branch (`--no-ff` merges); a push to `main` deploys GitHub Pages and tags a release. Do not create a PR, merge, or modify `develop` or `main` unless asked.

**No personal paths in files.** This repo is public: never write a user-specific absolute path (`/Users/<name>/…`, `/home/<name>/…`, `C:\Users\<name>\…`) into any committed file (code, docs, specs, configs, tests, logs). Use repo-relative paths, `$HOME`/`~`, or a placeholder such as `<repo>`.

## Mandatory rules — read the owning file before you start

Each requirement lives in exactly one file, never a copy here and in a rule. Rules without `paths:` frontmatter load automatically; open the others, and the skills, when the situation applies: work often starts before a scoped file is open.

| Situation | Read and follow |
|-----------|-----------------|
| Any player-facing UI on every device (desktop, mobile portrait/landscape, tablet, foldable, safe-area, no occlusion, player-perspective review) | `.claude/rules/ui-responsive-layout.md` |
| Combat HUD, information drawer, touch controls | `.claude/rules/hud-layout.md` |
| Settings, menus, dropdowns, dialogs, pickers (no native browser UI) | `.claude/rules/no-native-ui.md` |
| Visible text, ARIA/`alt` labels, reward names (`en` / `zh-TW`) | `.claude/rules/bilingual-copy.md` |
| UI interaction, flow, music transition, hero active skill SFX | `.claude/rules/ui-audio.md` |
| Any gameplay number, including 「永久強化」/暮光餘燼 | `.claude/rules/game-balance-config.md` |
| Game logic, AI, combat, collisions, world, rendering, VFX, perf-critical UI | `.claude/rules/realtime-performance.md` |
| Any effect, projectile, particle, skill card, HUD treatment, character/BOSS visual (§8 VFX gate, §9 single-owner rendering) | `.claude/rules/rendering-budget.md` |
| Character CRUD: heroes, enemies, bosses, NPCs, summons, portraits, animations | `.claude/rules/character-art-3x.md` (§5 CRUD gate) |
| Directional or animated character art: facings, mirror reuse, atlases (§3, §4) | `.claude/rules/character-directions-atlas.md` |
| Knight/ranger/wizard sprites, rigid weapons, held projectiles, body atlas | `.claude/rules/hero-weapon-rendering.md` |
| Raster image generation or delivery (Polytool `towebp`, WebP only) | `.claude/rules/webp-assets.md` |
| Images: commit real asset files first, code consumer second | `.claude/rules/asset-workflow.md` |
| BOSS CRUD: original score, phase music, per-attack cinematic SFX | `.claude/rules/boss-music-production.md` |
| BOSS arrival countdown UI, BOSS phase body size | `.claude/rules/boss-visuals.md` |
| Combat feedback, skill growth, encounters, reward experience and game-feel acceptance | `.claude/rules/game-feel.md` |
| Lobby, Adventurer Hall, hero selection panels, last expedition selection, hero cosmetic cards (every new or updated hero) | `.claude/rules/hero-lobby.md` |
| Unlocked playtest (`make *-unlocked`, `VITE_ES2_UNLOCKED`), anything that could ship a test unlock | `.claude/rules/unlock-separation.md` |
| Version bump, `CHANGELOG.md`, release, GitHub Pages deploy, DEV-only QA surfaces | `docs/release-process.md` |
| Skill CRUD, ability option, projectile, enemy bullet, damage feedback, attack animation — read **before** implementation | `es2-combat-visual-fidelity` skill |
| Content pack or shared runtime integration | `es-content-integration` skill |
| Browser-facing change (menus, touch, a11y, Canvas art, audio, perf) | `es-browser-qa` skill |
| Adding or replacing sprites, animation, scenery, icons, VFX | `es-asset-runtime` skill |

## Feature acceptance

Verify new behavior from the real player entry point through the engine to the resulting state and visible feedback. Generated mockups and mocked Canvas timings are not runtime evidence; never claim QA/CI success without actual outputs. CI, manual visual confirmation and RED evidence are separate gates; one never proves another.

For the ES3 combat/juice/pacing/rewards branch only, follow the owner-approved manual-acceptance exception in `.claude/rules/game-feel.md` (ES3 owner-approved acceptance exception). It does not waive implementation, automated correctness, accessibility or performance work, or change other branches' release requirements.

## Mandatory TDD and measurable verification

Every gameplay or performance change follows **RED → GREEN → REFACTOR**: reproduce with a deterministic test that fails for the expected reason, make the smallest fix, rerun. Keep regression tests for boundaries, the boss, hitboxes, skills, offscreen objects, viewport resize, biome changes and long-running cache bounds. Benchmark and device-profiling rules: `.claude/rules/realtime-performance.md` §6.

- A bug fix ships with its prevention: the scoped rule that names the trap, the mechanism that removes it, and a guard test that is RED on the old code.
- Never delete or weaken tests to pass CI; report any check you could not run.
- Never commit RED tests (yours or another session's staged files) without the implementation that turns them green.
- Bug seen only on a phone → reproduce on that device class and orientation (`make phone`); a desktop viewport of the same size is not a reproduction.

Before claiming completion:

```sh
make verify   # pnpm test, pnpm typecheck, pnpm build, pnpm check-release, on the locked dependencies
```

`make help` lists every target; the `##` annotation on each Makefile target is the single source, so describe a new target there, not here.

## Mandatory active skill for every playable hero

Every current or newly added playable hero must define one distinct active skill from day one. Reuse `getHeroActiveDefinition`, engine `activateHeroSpecial`, shared hero selection card, detail surface and `HeroSpecialAction` (Q / touch / cooldown / ready and cast transitions). Keep identity and save compatibility; externalize balance values; validate normal and faction enemies via authoritative hit paths. Require a dedicated role-specific 3× WebP icon, bounded GPU choreography and Canvas fallback, reduced motion/flashing, one original reproducible cinematic SFX via the shared audio owner, bilingual descriptions, success/rejection/cooldown/pause/reset tests, and desktop/mobile gameplay visual/audio QA. Never mark art or audio QA complete without actual inspection. Do not duplicate UI or introduce a new audio/rendering loop.

## CI concurrency

Latest branch commit wins: `.github/workflows/ci.yml` cancels unfinished push/dispatch CI runs from older SHAs on the same branch across workflow files. Keep all current-SHA sibling workflows independent; use workflow + ref concurrency with cancellation enabled for new CI workflows (never a shared branch-only group across different workflows). Preserve other branches, PR refs, completed evidence, and the serialized release/deployment workflow. Capture evidence must identify its exact SHA; cancelled runs are not passing evidence.

## Shared character and monster dossiers

Hero, monster and boss information surfaces must use `Es2DetailSurface`, `Es2StatStrip` and `Es2SkillSummary` rather than duplicate their markup or styles. Keep desktop hover and the explicit info button on touch content-equivalent. Read monster and boss stats/attack phases from authoritative balance and encounter definitions; retain existing discovery semantics, identify unscaled values, and use the matching authored skill image (an SVG is acceptable until dedicated production art exists). Preserve bilingual content and add a regression test for both interaction modes and distinct boss attack artwork.

### Monster / Boss encyclopedia completeness (mandatory)
- Every playable combat enemy and Boss must be registered automatically from the authoritative legacy, faction and boss definitions. New IDs must ship with localized dossier text, real combat artwork/atlas frame, base stats, attacks, skill art and discovery regression coverage; no separate hand-maintained roster of expanded actors.
- Keep each identity locked (generic unknown placeholder, no image/name/stats/Info or hover) until its own recorded defeat. Use exact faction and Boss counters through the existing idempotent run settlement, profile migration and account-scoped storage. Do not infer specific Boss discoveries from historical aggregate counts. Preserve existing saves and isolated unlocked DEV testing.
- Reuse actual runtime artwork and first authored frame, not a full atlas or unrelated portrait. Warlock uses the same tinted wizard artwork as combat until a dedicated runtime asset is approved. Legacy boss.webp remains a combat fallback and is not an orphan; delete any superseded art only after all references are migrated. Center achievements and monster art in the shared archive slot.
