# Meta progression branch integration

Source: `feature/meta-progression-game-modes` (base: `main`).

## Start and game modes
`engine.selectRunMode('quick' | 'standard' | 'endless' | 'challenge')` updates the menu selection.
`engine.start()` retains the chosen mode and resets only the run state.
`src/meta/modes.ts` is the sole source for duration, boss spawn time, challenge modifiers and victory requirements.

| Mode | Duration | Boss appearance | Rule |
| --- | ---: | ---: | --- |
| Quick | 150 s | 92 s | Survive duration and defeat boss |
| Standard | 480 s | 300 s | Survive duration and defeat boss |
| Endless | None | 180 s | Continue until defeat/exit |
| Challenge | 210 s | 130 s | Survive duration, defeat boss, tougher mobs |

A boss is **not** treated as defeated merely because it disappeared from the live mob list; the authoritative combat death event sets `s.bossDefeated` and `s.defeatedTypes.boss`.

## Persistent progression
Only the browser's `localStorage` is used, key: `eclipse-survivors.profile.v2`. Saved JSON is validated on load. Known v1 values migrate to version 2. Invalid, inaccessible or corrupted data falls back to in-memory defaults; reset deletes the save key.
Rewards use a bounded recent-run-ID ledger for idempotence and an achievement set for permanent unlocks. This is a **local game save**, not a tamper-proof economy.

## Combat-branch integration
- Preserve duplicate-death guards in `src/game/combat.ts`; every death is counted once.
- Retain all mode victory checks in `hasWonRun` instead of hardcoding `DURATION` in `step.ts`.
- If a future boss can enter multiple phases, only set `bossDefeated` after the final phase dies.
- Add any new `MobType` to the encyclopedia and save validator.
- Permanent power/vitality bonuses are applied at the beginning of the run, not after an upgrade purchase mid-run.
- Mode modifiers apply at spawn time to HP/damage and to enemy spawn interval.
- If a combat branch changes its arena/boss encounter rules, reconcile `bossAt`, `hasWonRun`, and the boss death hook in one place.

## Tests & screenshots
`pnpm typecheck && pnpm test && pnpm build` in the branch-only Actions workflow.
When verification passes, its screenshot job runs the real Vite preview, captures browser UI, and uploads a ZIP. The screenshot-only example saved profile is illustrative; no real user save is touched.
