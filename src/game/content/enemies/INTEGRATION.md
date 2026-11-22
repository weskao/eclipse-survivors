# Enemy Factions — Integration Contract

Feature branch: `feature/es2-enemy-factions` (based on immutable foundation
`9fd59c85e355909a6973cf93c116b8de5f9ca0df`).

This branch intentionally does **not** change `src/game/content/packs/index.ts`,
`src/game/enemies/ai.ts`, `src/game/spawn.ts`, `src/game/step.ts`,
`src/game/combat.ts`, `src/game/types.ts` or the existing save schema.

## Registration and runtime (separate integration-owned actions)

1. Import and append `ENEMY_FACTIONS_PACK` from `content/packs/enemies` to the
   integration-owned `CONTENT_PACKS` manifest. The registry validates ten
   `factions:<slug>` metadata IDs. **This does not enable gameplay.**
2. Create one `createFactionRuntime()` **per run**. Do not keep runtime arrays in a
   module singleton or persist them in the existing Profile v2 save.
3. In the integration-owned spawn scheduler, select one of the ten `FactionKind`
   values using the game's injected, seedable RNG (not `Math.random`).
   Set `runtime.legacyMobCount` to current living legacy mob count before
   calling `spawnFactionEnemy(runtime, kind, x, y, { affix? })`.
   Coordinate base stats with world scaling. Use `ELITE_AFFIXES` for one
   deterministic elite roll. The faction scheduler must not replace boss
   spawns or lower legacy spawn budgets without a deliberate balance change.
4. Within the **existing fixed simulation tick**, and only in play mode, call:
   
   ```ts
   tickFactionEnemies({
     runtime,
     hero: { x: state.hero.x, y: state.hero.y },
     width: state.W, height: state.H,
     legacyMobCount: state.mobs.filter(m => m.hp > 0).length,
     lineOfSight: worldHasLineOfSight, // Integration must supply its own world raycast.
     onHeroDamage: (amount, hit) => {
       // Apply status (poison/freeze/burn) through integration-owned hero state.
       // Existing damageHero() returns void; compare HP before/after and
       // return true only when damage was actually applied.
       const before = state.hero!.hp
       damageHero(state, amount, hooks)
       return state.hero!.hp < before
     },
     onTelegraph: enemy => { /* optional audiovisual warning dispatch */ },
   }, dt)
   cleanupFactionEnemies(runtime)
   ```

   The current game does not expose a shared LOS raycast nor an enemy-status
   pipeline. The integration owner must implement/choose authoritative
   obstacle visibility and reversible status duration handling before enabling
   faction attacks; do **not** leave `lineOfSight` unset on obstructed maps.
   Pausing must freeze both AI and hazard/projectile timers.
5. Extend the **integration-owned hero targeting, projectile collision, AoE,
   hit attribution and render pipelines** to include `runtime.enemies`.
   Existing `MobType` cannot directly represent these ten enemies; do not
   cast faction enemies into `Mob` or push them into `GameState.mobs`.
   For a faction hit, call:
   
   ```ts
   damageFactionEnemy(runtime, target, damage, sourceX, sourceY, reward => {
     // Increment kill/defeated stats exactly once; award XP via the existing
     // XP drop/collection flow. Do NOT cast this to the legacy ContentEvent.kill.
     // Callers own game hooks and audiovisual effects.
   })
   ```

   This is the damage **origin**, not the hero's current location if a
   projectile was launched earlier. The legacy `ContentEvent` union accepts
   `Mob` for hit/kill, not `FactionEnemy`: to publish faction kill events,
   the integration owner must explicitly extend the shared event contract or
   use a separate typed faction event, not force-cast it to `Mob`. Use the same first-contact ordering,
   broad phase and collision correctness as legacy shots. Passive effects,
   lightning, melee cones and all hero attack classes also need to consider
   faction targets.
6. Draw each actor using `ENEMY_DEFINITIONS[kind].spriteKey` and metadata;
   windup/phase/attack/recover and `aimX/aimY` provide stable animation and
   telegraph cues, including the **locked beam** for Crystal Sentinel.
   Display zone circles and their `delay` countdown before damage.
   Use `attackCue` and `deathCue` as audio lookup keys; they are **metadata**,
   not bundled audio files. Map these to existing or separately authored art
   and sound assets without runtime canvas gradient generation.
7. On run reset, discard the old runtime and create a fresh one; remove any
   integration-owned poison/freeze/burn statuses. Keep Profile v2 untouched.

## Invariants and constraints

- **130 total live actors**, including legacy enemies: both schedulers must
  share the same budget. Faction-only cap is 130; `legacyMobCount` reserves
  slots for the rest. Faction summons have a per-necromancer cap of four
  simultaneously living and eight total lifetime, and never recursively summon.
- At most 100 faction projectiles and 64 faction zones. No global A*,
  no random calls inside faction AI, and only bounded, short-lived hazards.
- Hit/kill accounting, XP award, actor removal, elite affixes and audio/visual
  side effects require explicit integration. Registration alone is insufficient.
- `onHeroDamage` must reflect the existing invulnerability/dash handling to
  avoid false Vampiric healing. Immobilization/freeze must expire deterministically.
- For very large frame gaps, **use the engine's bounded fixed-step simulation**,
  not one giant variable-time step. Draw culling must never cull simulation,
  collision, warning, reward or cleanup.
- Do not auto-spawn faction mobs when no feature pack is installed. Preserve
  original enemies, boss defeat, saves, UI and achievements.

## Tests owned by this branch

`runtime.test.ts` covers metadata, all ten behaviors, six affix interfaces,
sight/offscreen fairness, phase vulnerability, laser locking, lifetime and
crowd caps, determinism, loot callbacks and cleanup.

## Verification gate

From the full checked-out repository, run:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

No assertion of a passing check is valid without the command's actual output.
