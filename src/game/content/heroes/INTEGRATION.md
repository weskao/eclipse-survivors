# ES2 hero roster remediation — integration contract

## Scope and hard boundary

This branch owns only `src/game/content/heroes/**` and `src/components/es2/hero-roster/**`. It intentionally does **not** modify `JobId`, `App.vue`, `combat.ts`, `state.ts`, `step.ts`, shared spawn/AI, the registered content pack list, or the existing three hero assets. The three new hero IDs are distinct from the fallback **art/attack** JobId; the fallback is not the authoritative hero identity.

Available exports:
- `HERO_DEFINITIONS`, `SpecializationId`, `isSpecializationId`, `HERO_SPECIALIZATIONS_PACK`
- `createHeroRosterAdapter(state, selectedId, hooks, seededRandom)` returns `null` for the original three or unknown IDs; returns a per-run specialization for the new IDs
- `adapter.reset()`, `tick(dt)`, `activate()`, `snapshot()`, `canBeTargeted()`, `dealDamage(mob, raw)`, `receiveDamage(raw)`
- `HeroRoster.vue` (props `selectedId`, `disabled`; emit `select(id)`)
- `HeroSpecialAction.vue` (props `heroId`, `active`, `snapshot`; emit `activate`). The visible Q shortcut is mounted/unmounted with the component, checks active/cooldown and ignores text entry/repeats. Touch users use the button. The game must update snapshot in its existing HUD refresh, not by duplicating timers.

## Required engine/UI wiring — integration-owned work (NOT performed here)

1. Store a **real selected hero ID**, typed as `JobId | SpecializationId`, in the integration-owned app/session selection and persistence paths. Do not serialize a new hero as `knight` or `wizard`. Preserve old saves and behavior when id is `knight`, `ranger`, `wizard`. Only use `legacyArtJob` when an existing renderer/attack path still requires `JobId`; plan separate new-hero 8-direction sprite and unique attack integration.
2. Render `HeroRoster` alongside the **unchanged** original three selection choices, with their real selected ID and an `@select` handler. When starting a run, derive `state.choice = def.legacyArtJob` for pre-existing engine art, then `resetRun(state)`, then create exactly one adapter with `createHeroRosterAdapter(state, selectedHeroId, hooks, engineSeededRng)` and call `adapter?.reset()`. Apply permanent upgrades afterwards. For built-in/unknown IDs, use their old start flow with no adapter. Register `HERO_SPECIALIZATIONS_PACK` in the integration-owned packs manifest.
3. For EACH actual incoming damage source (enemy melee, projectile, hazard, boss), replace **only the call site** to `damageHero(state, amount, hooks)` with `adapter ? adapter.receiveDamage(amount) : damageHero(state, amount, hooks)`. This checks mode, life, invulnerability and dash before barrier consumption; applies Paladin reduction, calls legacy damage (and its stats/events/knockback), and counters only when HP was actually lost. **Never** call both paths for the same hit. For fully absorbed hits, legacy damage is not invoked.
4. For EACH direct hit damage path, use `adapter ? adapter.dealDamage(mob, rawDamage) : hit(state, mob, rawDamage, hooks)`. This calls the original `hit` exactly once and preserves kill/XP, boss flags, attribution and ContentEvent hooks. For projectile attacks, apply the modifier **once per actual hit** and never once at fire time AND again on impact. Existing damage and early exits remain authoritative. Passive companion/active-special hits already call legacy `hit` and **must not be replayed** by the integration adapter.
5. At each live simulation tick, call `adapter?.tick(dt)` exactly once, using the **actual simulation dt** (not render delta) and no duplicate tick from Vue. Paused, level-up and result modes are already guarded. At enemy acquisition/retarget points, suppress chasing Shadowblade only while `adapter?.canBeTargeted() === false` (maintain AI, timed hazards and other agents). `canBeTargeted` does not alter invulnerability or kill enemies.
6. Render `HeroSpecialAction` only for a new hero; pass current `adapter.snapshot()` after each HUD refresh and active = `state.mode === 'play'`. Bind `@activate="adapter.activate()"`. Existing Q keyboard control must not be wired again in App/engine, or it will fire twice. Cooldown is engine-owned; new Vue UI performs no simulation.
7. On retry, repeat `resetRun` then `adapter.reset` and update its view. On return to menu, end of run, unmount, or changing hero, discard the per-run adapter reference, stop its tick and unmount the skill button. Do not carry barrier, companion progress, RNG, or cooldown between runs.

## Known integration limitations

The new heroes are **not live-selectable from the existing main menu in this branch** because `App.vue`, `JobId`, the shared engine and existing menu are explicitly unowned. New-hero fighting sprites, true dual-dagger/guardian artwork/animations, and app-level action routing require a subsequent integration change. The starting equipment and mechanics are represented by real per-run content IDs, specialized hit/defense actions and usable metadata, but the original combat renderer/weapon animations continue using their legacy fallback until that change is made. Do not claim end-to-end playability based on these isolated adapter tests alone.

## Merge gate

From the integration branch run `pnpm install --frozen-lockfile && pnpm test && pnpm typecheck && pnpm build && pnpm check-release`, check gameplay/viewport/touch visuals and confirm the seven wiring points above. Verify all three new IDs plus each built-in hero, damage and XP attribution, stealth AI target suppression, bounded companions, barrier/invulnerability ordering, cooldown button, restart and long Endless gameplay. Do not deploy or merge based only on branch-local code inspection.
