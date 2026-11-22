# ES2 relics and loot — integration contract

**Base:** `9fd59c85e355909a6973cf93c116b8de5f9ca0df`  
**Feature branch:** `feature/es2-relics-loot`  
**Owned:** `src/game/content/packs/relics.ts`, `src/game/content/relics/*`  
**Untouched:** `src/game/content/packs/index.ts`, engine, combat, progression, store, save schema.

## Included

- 24 non-cursed relics and 8 cursed relics with independent gameplay modifiers from common to legendary. Every definition has a nonzero effect and curses disclose their numeric downsides.
- Per-run `WeakMap<GameState, RunRelics>` with 10 distinct slots and per-item `maxStacks` (1–3). No profile-save schema change; runtime state is GC-safe. `resetRelics` is called by the pack on the existing `reset` event.
- `openTreasure(state, chestId, rng)`: deterministic weighted draw without repeated options, accepting only strictly increasing `WorldEvent.id` serials, with one unresolved offer. `claimTreasure`, `rerollTreasure` (2 per run), `banishTreasure` (2 per run) reject replays or invalid selections.
- `TREASURE_UI` exports keyboard bindings (`Digit1`–`Digit3`), minimum 44px tap size, rarity colors and accessible labels. `RELIC_CUES` exports semantic audio/VFX IDs; optional callbacks on successful chest opening and reward claims emit these IDs exactly once.
- Standalone combat adapters: `calculateRelicAttack`, `calculateRelicIncoming`, `relicPickupRadius`, `tickRelicRecovery`. Snapshot modifiers are recomputed only when acquiring relics. No per-frame item scanning or `Math.random` inside rules.
- `RELICS_PACK.onEvent` connects post-hit lifesteal, kill healing, pickup healing, run reset and offer cleanup **once the integration owner registers the pack**. No fake content ability and no unsupported `ContentPack.relics` field.

## Required integration-owned wiring (NOT implemented in this feature branch)

These are **functional exported rules**, not currently active end-to-end game features. Integration must explicitly connect them before claiming in-game completion:

1. Register `RELICS_PACK` in the **integration branch only** inside `src/game/content/packs/index.ts`.
2. In `events.ts`, when an activated world event has `kind === 'chest'`, pass its numeric `event.id` to `openTreasure(state, event.id, rng)` before consuming it. The existing chest awards XP only and its event callback sends `pickup: world` without a chest ID. Never infer an ID from generic world pickups.
3. In `engine.ts`/Vue UI, pause for a selection overlay showing `pending.options`, descriptions and curse penalties; use buttons and 1–3 keyboard commands. Invoke `claimTreasure`, `rerollTreasure`, `banishTreasure`. Pass an optional cue callback to `openTreasure` and `claimTreasure` to receive one-shot feedback, and map those semantic IDs in `RELIC_CUES` to actual audio/VFX; they are not currently in the `GameHooks.sfx` union.
4. In `combat.ts`, projectile/skill/summon attacks must call `calculateRelicAttack` **before** applying hit damage, passing element, source, movement/dash state, boss flag and pre-hit HP fraction. Honor `execute`, `pierce`, `critical`, `extraProjectile` without double kill/XP. Use `calculateRelicIncoming` BEFORE shield/invulnerability processing, apply dodge and deal reflection to the actual attacker with no reflection loops.
5. In simulation `step.ts` call `tickRelicRecovery` at gameplay tick frequency, never while paused; use `relicPickupRadius` on actual XP/world collision checks. Maintain deterministic boss/crowd tests and observe the cached stat lookup.
6. In inventory UI, use `inventorySnapshot(state)` (copy-out) for capacity and stacks; handle no eligible rewards and full inventory with a safe close. Preserve the existing base chest XP award.
7. Emit `reset` after `resetRun()` (the foundation already does). Do not write relics into `state.content.levels`, Profile v2, or original XP progression.

## Anti-exploit, lifecycle and performance notes

- One unresolved treasure at a time, keyed by strictly increasing positive safe-integer chest ID. Claiming cannot pay twice, even if caller opens that chest again. Reroll charges only if new options exist.
- Inventory holds at most 10 **distinct** relics; additional stacks never consume new slots. Unique items max out at one. Banish cannot target an owned relic.
- The pre-hit adapters are deliberately pure calculations. Post-hit events cannot retroactively change incoming or outgoing damage. `onEvent` lifesteal consumes real applied damage.
- Recovery uses bounded `dt` (max 0.25 seconds per invocation), preserving pause semantics. No global item timers; per-run data is in `WeakMap` and cleared on reset. Keep mobile, offscreen and crowd performance tests.
- `epic` and curse metadata are **relic-specific UI values**, not unsupported additions to Foundation's `SkillRarity` union.

## Verification

Run on this branch: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`. Tests: `src/game/content/relics/relics.test.ts`. Report actual outputs, not presumed success; integration also needs browser/mobile overlay and real combat tests.
