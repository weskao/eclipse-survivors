# Meta progression and game modes

Base: main @ fe6161fa9deea23d4447b39b2085689744f531fe
Branch: feature/meta-progression-game-modes

## Intent
Replayable, fully offline progression and four distinct selectable modes while preserving the existing Vue/Canvas engine and result IDs.

## Decisions
- Use a small versioned localStorage JSON schema; validate all loaded fields and keep saves on device only.
- Define per-mode explicit duration, boss spawn time, modifiers, and victory policy in src/meta/modes.ts. Timed wins require the boss to have actually been defeated. Endless has no automatic victory.
- Grant resources and achievements in an idempotent end-of-run transaction. Cosmetic unlocks derive from achievements, never require a backend.
- Keep combat changes minimal: track run metrics at authoritative damage/death sites, use configurable spawn timing, and isolate menus in new components.
- Preserve existing CSS/menu, HUD, and App tests; offer a new mode selector and progress dashboard without rewriting character selection.

## TDD Tasks
1. RED: tests for mode rules, safe loading/migrations, deduplication, achievements, records, reset, and game restart.
2. GREEN: src/meta/types.ts, modes.ts, achievements.ts, profile.ts, compendium.ts and associated tests.
3. GREEN: hook explicit victory into step.ts, configurable boss spawning into spawn.ts, track monster/attack statistics; integrate persistent bonuses and end-of-run writing into engine.ts.
4. GREEN: build separate game-mode and progression UI, update result overlay with a polished responsive summary, minimally wire App.vue.
5. REFACTOR: remove duplication; run pnpm typecheck, pnpm test, pnpm build, and capture actual screenshots using browser automation.

## Integration Contract
Other feature branches should use s.runMode and getMode(s.runMode), and set s.bossDefeated at the authoritative boss death event. Do not replace boss victory rules with a global timeout. Engine.selectRunMode(mode) selects a mode only; engine.start() resets the run but retains the selection. When merging a combat branch, preserve its one-time boss death/reward protection and call hooks.end only once per run.

## Verification
No successful build is claimed until all three commands have executed. Only this feature branch may be pushed. Never merge main into feature or feature into main.
