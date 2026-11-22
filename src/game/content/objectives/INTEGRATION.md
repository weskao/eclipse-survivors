# Expansion mode integration handoff

This branch is deliberately isolated. It does **not** activate a game mode, spawn an encounter,
award profile currency, mutate ContentPack contracts, or modify any existing mode. The exported
API is pure TypeScript:

- `getObjectiveMode(id)`, `objectiveModeIds`, `OBJECTIVE_MODES`: menu previews, deadlines,
  schedules, pre-run modifier descriptions, reward/achievement identifiers.
- `createObjectiveState(id)`: new state for every run and restart (do not persist across runs).
- `advanceObjective(state, event)`: pure and deterministic event reducer.
- `evaluateObjective(state)`: terminal state, explicit defeat reason, objective progress,
  and *proposed* rewards/achievement IDs. Pay only once when the engine ends the run.
- `getObjectiveDifficulty(state)`: difficulty snapshot (apply only on encounter/phase changes,
  never allocate a new one for every mob or Canvas draw).

## Required integration-owned wiring

1. Extend `RunModeId`, the selector, `src/meta/modes.ts` and the profile/achievement
   registration and migration where appropriate. Preserve the four legacy modes and existing
   saves; old `hasWonRun` behavior must remain unchanged for those modes.
2. Instantiate an objective state on run start and reset; never reuse a finished state.
   Only process `tick` while gameplay is actively advancing (not during pause/level/settings).
3. Add actual boss scheduling, relic pickups/protection, world events, and wave spawning in
   integration-owned runtime. The definitions are *readiness thresholds*, NOT automatic spawns.
   Dispatch `boss-defeated` exactly once per real boss, using its scheduled stage number only
   after the finalized boss kill event; ignore ordinary kills and summoned mob deaths.
4. Emit `relic-collected` only on a genuine collected item, `relic-damaged` on actual relic
   integrity loss, `wave-cleared` only when a spawned wave's completion condition is met, and
   `major-event-cleared` only when a real periodic event is completed. Each stage/index
   must match the next expected number. Avoid issuing synthetic completion events on scene
   changes or just because no mobs remain.
5. Report hero death as `player-defeated` and voluntary withdrawal as `abandon`.
   Check `evaluateObjective` after each accepted event. Only `victory` may call
   `hooks.end(true)`; only `defeat` may call `hooks.end(false)`. Keep existing
   engine result idempotency and do not emit another objective event after terminal status.
6. Integrate the `rewards` field with versioned profile awards only once on result entry;
   migrate/store new achievements safely, and show the mode-specific progress in the HUD.
   Any missing boss/stage/artifact implementations should be treated as blocked content,
   not fulfilled objectives.
7. Add integration E2E tests for the actual game-mode selection, encounter staging,
   visual modifiers, boss kill bridge, saves and payouts, pause/resume and replay reset.
   No renderer, audio, shared engine, save or mode files were edited here.

## Explicit mode behavior

- Boss Rush: 5 staged boss kills, readiness at 25/70/125/185/250 s, 480 s hard limit.
- Endless Eclipse: no victory state, no timeout; a major event may be completed every 180 s.
  Survival + completed events award bounded Embers when the run ends.
- Relic Hunt: collect 4 sequential artifacts, protect a shared integrity pool > 0,
  then kill final boss; 480 s hard limit.
- Cursed Expedition: defeat both wardens and survive at least 360 s (420 s deadline);
  60 s rotating curse schedule.
- Chaos Arena: clear 8 ordered waves, then kill final boss; 330 s hard limit and
  rotating encounter modifier.

These schedules do not bypass required boss spawning or kill confirmation. No implicit
global timer can end Endless Eclipse or grant a finite-mode victory.
