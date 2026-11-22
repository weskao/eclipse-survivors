# ES2 hero specializations — integration proposal

**Foundation:** `9fd59c85e355909a6973cf93c116b8de5f9ca0df`  
**Feature branch:** `feature/es2-hero-specializations`  
**Owner:** `src/game/content/heroes/` only

## Delivered in this isolated feature branch

- `HERO_DEFINITIONS`: three selectable records (localized label, strengths, weaknesses, balanced starting stats, unique static illustrated portrait, existing-audio fallback cues and animation cue identifiers).
- `HERO_SPECIALIZATIONS_PACK`: six namespaced ContentAbility definitions with three hero-locked upgrade tracks. The three starting abilities are granted at initialization and do not pollute random level-up rolls.
- `createHeroSpecializationAdapter(state, id, hooks, rng?)`: **per-run** combat mechanics for Shadowblade, Spirit Summoner and Crimson Paladin, with deterministic RNG injection and bounded companion/target work.
- `hero-specializations.test.ts`: initialization, progression isolation, damage, defense, cooldown, reset and lifecycle regression cases.
- Three distinct static selection portraits. The existing knight/ranger/wizard imagery and animation code are **not replaced**.

## What is deliberately not connected yet

The foundation's `JobId` union permits only `knight | ranger | wizard`; it is integration-owned. The existing `createHero` and `resetRun` paths, hero-selection menu, legacy attack, `damageHero`, AI threat targeting and sprite renderer cannot be extended safely in this parallel branch without modifying shared files.

Consequently **new heroes are not yet selectable from the live game's normal menu**. These adapters are independently callable and tested, but actual playable integration requires these integration-owned changes. For now, `reset()` sets `state.choice` to a legacy art job so the original illustrated sprites remain usable. New portraits are selection illustrations, **not** complete new 8-direction gameplay sprite sheets or finished motion animations. New audio metadata refers to currently supported SFX; new unique sound recordings and playback entries would require audio integration.

## Integration order (integration branch only)

1. Extend shared hero ID, save/result typing, UI choice/HUD metadata and art lookup for the three new IDs, retaining old `JobId` values and old save compatibility. Preserve knight/ranger/wizard untouched.
2. Register `HERO_SPECIALIZATIONS_PACK` with all other approved packs in the integration-owned `src/game/content/packs/index.ts`. Instantiate `createHeroSpecializationAdapter` **once per run**, with the engine's simulation RNG and `GameHooks`.
3. After `resetRun(state)` (and before permanent upgrade modifiers), call `adapter.reset()`. The adapter **does not** replace `resetRun`: the latter clears `state.content` and every legacy run-owned array. Only create an adapter for the three new IDs; keep existing jobs' start path unchanged.
4. Wire `adapter.tick(dt)` exactly once per live simulation tick. It already rejects paused, result, invalid and nonpositive dt. Wire `adapter.activate()` to a dedicated skill key/button with a visible cooldown display based on `snapshot().cooldown`.
5. Route **outgoing hit amounts** through `adapter.modifyOutgoingDamage(rawDamage)` before the actual legacy `hit` (including projectile hits and skill-specific damage paths). Apply once per damage occurrence; do not repeatedly reroll a single projectile's crit. The result is a damage value, not a replacement for `hit` or its kill/XP/content hooks.
6. Route incoming damage through a **pre-damage intercept** **after checking the same `mode`, invulnerability and dash guards** as `damageHero`. Pass `adapter.mitigateIncomingDamage(incoming)` to `damageHero` **only when the returned value is positive**, then call `adapter.afterDamage(actualHpLost)` where `actualHpLost = Math.max(0, beforeHp - afterHp)`. The adapter defensively avoids consuming barriers during invulnerability. Damage reduction from legacy shield upgrades remains additive in the normal damage path.
7. For true Shadowblade stealth, teach shared enemy acquisition/targeting logic to honor `adapter.snapshot().stealth > 0` while still updating enemy simulation and hazards. The adapter's temporary invulnerability already protects part of the window; **aggro suppression is not hooked up in this isolated branch**.
8. Implement proper realistic dark-fantasy character sprite sheets and run/cast/swing effects for all three *new* heroes, driven by their `animation` metadata. Keep existing three originals. The provided new portraits are SVG illustrations (not pixel art); replace or augment only new-hero assets if a stricter photorealistic look is desired.
9. Add / bind distinct audio samples for new-hero SFX if required; the present metadata intentionally uses `GameHooks.sfx` cues already allowed by `SfxCue`.

## Balance and runtime bounds

| Hero | HP | Speed | Damage | Delay | Range | Active CD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Shadowblade | 105 | 248 | 28 | 0.43 | 132 | 9.5s |
| Spirit Summoner | 118 | 194 | 24 | 0.66 | 355 | 12s |
| Crimson Paladin | 190 | 172 | 30 | 0.65 | 116 | 14s |

- **Shadowblade:** 24% critical hit chance, 1.70× critical damage plus 0.15× per specialized upgrade; 0.95s stealth, 0.70s invulnerability, up to three nearby shadow-strike targets.
- **Spirit Summoner:** 1/2/3 simultaneous virtual companions at level 1/3/5 (never more than three). One attack/support pulse at most every 1.8s; wisp attacks, guardian heals, reaver attacks and leeches. Special strikes up to three targets and heals 12 HP.
- **Crimson Paladin:** 14% baseline damage reduction, up to 6% additional reduction from specialization; 1.8s counterattack throttle; 3.5s temporary barrier with 14s special cooldown and an 8%-of-max-HP activation cost. Sub-40%-HP damage bonus is the risk/reward passive.
- **Performance:** no `Math.random` in this module; uses injected or existing seedable simulation RNG. No global mutable gameplay state, additional spawn entities, per-frame array sorting, unbounded timers or companion allocations. Nearby enemy scans happen only on special use (and one bounded summoner selection each 1.8s); virtual companions are metadata/state, not extra `Mob` objects. FX use the existing bounded emitters.

## Required integration verification

Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` on the integration branch after wiring. Include selection menu/E2E coverage for each new hero, full-hit and projectile crit paths, incoming barrier/interruption timing, pause/resume, death, restart, long Endless runs, save migration, old-hero visual regressions, and realistic frame/audio reviews.

**No shared engine/core type/manifest changes are made in this feature branch.**