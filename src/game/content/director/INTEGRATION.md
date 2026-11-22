# Wave Director runtime integration handoff

This branch changes only `src/game/content/director/**`. It delivers a deterministic encounter planner and typed adapter. **It does not activate the system in the production engine.** Shared `step.ts`, `engine.ts`, `spawn.ts`, boss controller, mode registry and pack index are integration-owned and unchanged. A metadata pack alone cannot spawn any wave.

## Integration owner's obligations

1. Construct one `createWaveEngineAdapter({mode, seed, spawn, onEvent, onWaveCleared})` **per run**, with a deterministic run seed. Reset on restart and discard when the run ends.
2. **Exactly one spawn owner:** disable the legacy `tickSpawning` path when this adapter controls encounters. Do not run both spawn loops.
3. During actual gameplay, call `adapter.advance(state, {canSpawnAt, pendingActors, completedRelics})`. Terrain/hazard vetoes must match the existing engine, pending reservations share the actor budget and Relic Hunt's four pickups must be real.
4. The injected `spawn` callback must create and insert exactly one real living enemy into `state.mobs`, using canonical legacy or boss-controller setup. Preserve specified coordinates, type, elite flag, encounter attribution and `telegraphSeconds`; do not permit attack damage before the warning completes. Reject atomically with `null` if placement fails. Do not substitute a random legacy spawn.
5. Call `adapter.killed(mob)` only after genuine applied damage and the finalized death, rewards and XP path. Never report a living actor, despawn, offscreen culling or artificial cleanup.
6. Forward `onWaveCleared(index)` to the objective reducer as `{type:'wave-cleared',index}` only after all accepted wave actors died. Report `{type:'boss-defeated',stage}` after genuine tagged boss kills; reconcile each request's `encounterIndex`. Time or an empty mob array is not evidence.
7. Forward `onEvent` to HUD and telegraph announcements. Failed spawn callbacks do not announce phantom boss/wave encounters.
8. Preserve old modes when the adapter is not selected. Endless Eclipse does not auto-win. Chaos Arena's final boss requires eight evidenced clears; Boss Rush requires five sequential boss kills; Relic Hunt guardian requires four real pickups.

## Runtime guarantees and limits

- All legacy mobs, new enemies and bosses share the 130-actor cap; ordinary pulses request at most 10 enemies, terrain placement has at most 8 attempts each.
- Mode schedules are immutable and precomputed. Position selection is deterministic by seed, cycle, pulse and spawn index; the adapter has bounded run-scoped tracking.
- Engine retains control over AI, collision, boss invulnerability, damage, experience and rewards. A typed adapter cannot safely activate itself without the integration owner's shared-file changes.

## Required verification

Run frozen install, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, and game-integration E2E for real spawns, telegraphs, boss controller, objectives, pause/resume and mobile browsers on the integration branch. Until that integration and CI are verified, this is a **standalone integration-ready component, not production-enabled gameplay**.
