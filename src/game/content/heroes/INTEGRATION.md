# ES2 live hero integration — handoff and verification

**Integration branch:** `feature/es2-release-readiness-integration`  
**Source feature:** `feature/es2-remediate-hero-roster`  
**Feature-owned files imported:** `src/game/content/heroes/**` and `src/components/es2/hero-roster/**`  
**Integrated on:** 2026-11-22

## Runtime identity and compatibility

- The authoritative selected identity is `GameState.heroId` / `UiState.heroId`, typed `HeroId = JobId | SpecializationId`. New IDs are **shadowblade**, **spirit-summoner**, **crimson-paladin**; original IDs remain **knight**, **ranger**, **wizard**.
- `GameState.choice` and `UiState.choice` deliberately remain **legacy JobId-only** as an interim Canvas/attack/skin fallback (`knight` for Shadowblade and Paladin; `wizard` for Summoner). They must **not** be used to determine the real new-hero selection. `selectHero(id)` changes both identity and art fallback; `selectJob(id)` preserves the original API for the original three.
- The run result carries `specializationId` when relevant; `RunStats.hero` stays legacy-compatible for the persisted version 2 profile. `Profile.heroesPlayed` and available cosmetics still reflect the legacy fallback. Full persistent specialization statistics belong to the meta-progression cutover, **not** this hero integration.
- The three new starting weapons are registered in `HERO_SPECIALIZATIONS_PACK` in the central content manifest; `adapter.reset()` sets the relevant starting weapon level to 1. Only the selected hero's progression path is eligible.

## Gameplay wiring

1. `Es2MainMenu.vue` shows the existing 3 cards plus `HeroRoster.vue`; `Es2MenuSystem.vue` forwards new hero selection through `selectHero`, while original cards use `selectJob`. `App.vue` forwards both to the engine. Original selection stays visually unselected when a new hero is active.
2. On `start()`, the engine calls `resetRun`, creates one per-run `createHeroRosterAdapter(state, heroId, heroHooks, random)`, resets it, then applies permanent upgrades and enters live gameplay. No duplicate simulation loop or global mutable hero adapter.
3. All standard direct hits and projectile/skill hits pass through **one** legacy `combat.hit` and its optional `GameHooks.modifyOutgoingDamage` intercept. This owns damage dealt, kill credit, XP and content hooks exactly once. The hero adapter uses `heroHooks` without the modifier for its own companion, shadow-strike and counter hit calls: no double critical roll.
4. All ordinary incoming-damage sources still use the existing `damageHero` path, with `mitigateIncomingDamage` after legacy invulnerability/dash guards. Fully absorbed hits do not add phantom HP damage or invulnerability. `afterDamage` applies counterattack based on actual HP lost.
5. `tickEnemies` consults `canTargetHero` once per live tick: stealth suppresses new target acquisition and cancels existing windups, while enemy status and recovery timers still advance. Already-fired projectiles are not retroactively erased.
6. `engine.advance(dt)` ticks the specialization once per live simulation step. The 8 Hz existing `hud()` refresh provides cooldown, barrier and companion counts to the UI; no Vue-side timers. `HeroSpecialAction.vue` supports keyboard Q and pointer/touch. Avoid additionally binding KeyQ in the engine; the component owns its keyboard event listener and removes it on unmount.
7. Returning to menu discards the adapter and UI snapshot; restarting calls `resetRun` and `adapter.reset()`, clearing cooldowns, barrier, companion levels and hero-specific upgrade levels. Paused/level/result screens never tick abilities.

## Remaining art/product work

**Playability:** NEW HEROES cards and the live upper-left Combat HUD now share each selected hero's real 900×900 transparent 3× WebP portrait through the single HeroPortrait component. The old SVG is an explicit image-error fallback only; the original three heroes and their character rigs are untouched. Run/cast/attack previews use each hero's distinct 8×448px production action strip, and existing active ability icons have been replaced with matching 3× WebPs.

**Visual scale:** The existing eight-direction sprite occupies only about 50 of each 128-pixel atlas cell's vertical pixels, while the newly rendered right-facing strip uses a separate 448px cell and 1.3× width / 1.25× height Canvas destination scaling. The 8-direction live Canvas path now enlarges the visible silhouette by 2.5× relative to its previous atlas-cell rendering and anchors the feet consistently to the legacy three heroes' ground point. Crop rectangles remain confined to the authored 128×128 cell, and collision/gameplay geometry does not change.

**Remaining visual limitation:** The newly committed 3× action strips genuinely contain eight sequential 448px right-facing run/attack/cast cells, not eight different facing directions. In live gameplay, the new strip is drawn for **right/east-facing** motion or attack; the existing correct-facing eight-direction atlas is retained for the other seven octants, and for reduced-motion or undecoded action images. This does **not** qualify as full new 3× eight-direction combat animation or as approved portrait-to-motion identity continuity. The artwork must be redrawn for remaining directions and visually signed off before declaring complete. The original three heroes' animation atlases remain unchanged.

**Persistence limitation:** Profile v2 still records legacy fallback in `heroesPlayed`, while live `heroId` and `RunStats.specializationId` are correct. Do not claim v3 save migration or specialized permanent mastery from this branch.

## Evidence and release gate

GitHub Actions run [45009387473](https://github.com/weskao/eclipse-survivors/actions/runs/45009387473) on commit `9793b533cd542be45e15a96f687a3a38686bdc63`:
- `pnpm install --frozen-lockfile`: **PASS**
- `pnpm typecheck`: **PASS**
- `pnpm build`: **PASS**
- `pnpm check-release`: **PASS**
- `pnpm test`: **696 PASS / 5 FAIL** (701 total)

All hero-specific runtime and UI tests passed. The five remaining failures are the independent, still-unintegrated run modes in `tests/es2/integration/release-readiness.test.ts`: Boss Rush, Endless Eclipse, Relic Hunt, Cursed Expedition, Chaos Arena. Their implementations belong to run-mode integration, not this hero branch. No PR, deployment, or merge to `main`/`develop` performed. Full project release readiness is **blocked** until those independent gates (and outstanding art) are resolved.

After any later shared-engine merge, rerun the full suite and browser/mobile visual checks. Never describe the source hero roster alone as end-to-end production-ready without the host integration and visual evidence.
