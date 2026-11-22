# Enemy factions: runtime bridge handoff

This directory supplies **integration-ready adapters** for all ten factions, but it does not install them into the production engine. The shared engine, spawn scheduler, projectile resolver, renderer, and content manifest are owned by the final integration branch. Do not enable this runtime merely by registering `ENEMY_FACTIONS_PACK`.

## Owned APIs

- `createFactionBridge({ random, onReward?, onHit?, onTelegraph?, lineOfSight? })`: create once per run with the same deterministic random source as the engine. Do not share across game runs or persist in Profile v2.
- `bridge.spawn(state, kind, x, y, { affix? })` and `bridge.spawnRandom(state, x, y, elite?)`: explicitly spawn an actor. Both reserve the current **living** legacy count. The legacy scheduler must also check `bridge.availableSpawnSlots(state)` before adding a legacy actor or boss.
- `bridge.tick(state, fixedDt, hooks)`: call exactly once from the existing **fixed** play-mode simulation tick. Paused/menu/result modes do not advance the faction AI, warnings, projectile lifetimes, zones, or status timers. Obstacle LOS defaults to the repository's `clearApproach`, and movement uses the existing obstacle resolver.
- `bridge.nearestTarget(state, x, y, range)`, `nearestFaction(x, y, range)` and `factionsInRadius(x, y, radius)`: targeting adapters for hero melee, aimed weapons, beams and area effects. The shared skill logic must consider these in addition to legacy mobs.
- `bridge.shotContact(state, shot)`: swept first-contact query across **both** pools. `bridge.resolveShot(state, shot, hooks, launchOrigin)` is an optional shared projectile replacement. Do not run it and the legacy collision resolver on the same shot. Preserve the actual projectile **launch origin** for frontal shields; a last-frame position is not equivalent.
- `bridge.hitFaction(state, target, amount, sourceX, sourceY, hooks)`: damage through the faction FSM, record dealt damage, increment kills once, emit one collectible XP star, and report the typed faction reward. Do not cast a faction actor to legacy `Mob` or forge a legacy kill event.
- `bridge.statuses` and `bridge.movementMultiplier`: bounded burn/poison and temporary freeze information. Damage is routed through legacy `damageHero`; invulnerability remains authoritative. The integration-owned movement step must apply the multiplier without mutating base speed.
- `bridge.reset()`: discard actor/projectile/zone arrays, status durations and defeated counters when the engine starts a fresh run.
- `drawFactionTelegraphs(ctx, bridge.runtime, offsetX, offsetY)` from `telegraphs.ts`: read-only Canvas 2D overlay for locked assassin/sentinel warnings and bounded hazard circles, without gradients.

## Rules for the final integration owner

1. Register `ENEMY_FACTIONS_PACK` only in the integration-owned manifest and explicitly create one bridge per run.
2. Integrate all ten faction archetypes into the **existing** spawn cadence without displacing bosses, then make both faction and legacy schedulers share `availableSpawnSlots`.
3. Replace legacy-only target, contact, projectile and skill damage selection with mixed-pool handling. Preserve first-hit ordering, line-of-sight requirements and original hero skill behavior.
4. Call `bridge.tick` inside the fixed simulation step, `bridge.reset` on reset, and apply `bridge.movementMultiplier` in the movement integration.
5. Draw faction sprites from `ENEMY_DEFINITIONS[kind].spriteKey`, animate states, map audio cue keys to real assets, and render the separate telegraph overlay. Culling must affect rendering **only**.
6. Run the full pnpm verification suite and live-browser/mobile combat tests after shared wiring. The bridge unit tests alone cannot prove production gameplay integration.

Never edit `src/game/step.ts`, `spawn.ts`, `combat.ts`, `types.ts`, `engine.ts`, `content/packs/index.ts` or the legacy save schema in this remediation branch.
