# Advanced enemy AI and boss integration

Branch: `feature/advanced-enemies-bosses` (forked from `main`).

## Scope and contracts
- `src/game/enemies/ai.ts` runs deterministic per-mob state machines: approach, telegraph/windup, strike, recovery; separate hostile magic projectiles use swept collision tests.
- `src/game/bosses/phases.ts` changes behavior at 2/3 and 1/3 HP, cancels pending attacks on phase changes and limits living summoned mobs to six.
- `src/game/spawn.ts` adds warlocks after 28 seconds and rare elites after 42 seconds, without changing existing early-wave spawn expectations.
- `src/game/step.ts` replaces universal chase/contact damage with `tickEnemies` and `tickEnemyProjectiles`. Player attack, damage, progression, and game-mode behavior remain in the original modules.
- `src/game/types.ts` adds optional mob AI/elite/phase fields and `GameState.enemyShots`. `src/game/state.ts` initializes and resets hostile shots.
- `src/game/render/enemy-attacks.ts` draws world-space warnings, enemy projectiles, and a screen-safe boss phase banner. `render/characters.ts` reuses the existing wizard sprite for warlocks and retains the original boss artwork.

## Branch integration dependencies
- If `main` updates `step.ts`, carry across the two enemy tick calls while retaining changes to hero combat and victory rules from the newer base.
- If `GameState` construction or `resetRun` changes, preserve `enemyShots: []` and its reset. Test fixtures created with `createState()` remain compatible.
- A separate combat-rules branch may modify death rewards and the 150-second win condition. **Do not overwrite those rules while integrating this branch.** The AI itself does not award kills, XP, or decide victory.
- `GameHooks` remains unchanged. On boss phase transitions, existing `hooks.message` is used for warnings.
- Enemy movement, lock-on targets and telegraph size are in world units and do not depend on viewport resolution. Spawn distance still uses the current viewport dimensions, as before.

## Checks and media
The branch-only workflow `.github/workflows/advanced-enemies-ci.yml` runs `pnpm typecheck`, `pnpm test` and `pnpm build`, then launches the built game in Chromium to capture real boss-stage screenshots, a mobile screenshot and `boss-showcase.mp4`. It uploads them as the `advanced-enemies-gameplay` artifact without committing media to `main`.

The `window.__test.showcaseBoss(phase)` hook is for deterministic browser capture only. It does not change normal start, combat, game modes or user-facing components. Browser capture tooling and ffmpeg are CI-only dependencies, not runtime dependencies.

## Testing
`src/game/enemies/ai.test.ts` covers attack timing, AI state changes, locked aiming, mobility, elite casts, projectile collision/lifetime, boss phase thresholds, summon caps, and death interruption. Existing movement assertions in `step.test.ts` now require a visible windup before contact damage.
