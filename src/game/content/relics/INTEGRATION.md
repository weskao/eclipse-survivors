# ES2 Relic Combat Remediation — Integration Handoff

Base: `7d7517752466d0a835525d53cebb1b915c5f10bc`  
Branch: `feature/es2-remediate-relic-combat`  
Owned surface: `src/game/content/relics/**`, `src/components/es2/relic-rewards/**`.

## What this branch owns

- Existing catalogue: **24 standard + 8 cursed** relics, each with a bounded, typed numerical modifier. Existing `relics/runtime.ts` owns deterministic inventory, chest serials, weighted choices, 10-slot cap, stack limits, reroll/banishment budgets and combat calculations.
- `createRelicCombatHooks(state, seededRng, emit)` in `combat-hooks.ts` adds one-shot receipts for host damage application. Both incoming and outgoing **hit serials must be strictly increasing positive safe integers, per direction, per run**. The adapter limits outstanding receipts to 130 per direction, drops oldest unresolved receipts, and rejects old/duplicate serials. Call `confirmHit` / `confirmIncoming` as soon as the real hit resolves; do not queue hundreds of unresolved attacks.
- `RelicRewardOverlay.vue` uses the shared ES2 focus-trapping modal; shows actual rarity, exact curse tradeoffs, capacity, reroll and banish budgets; supports mouse, touch, Tab, Esc and keyboard 1–3. Its emits are requests, **not award confirmations**. Host must synchronously validate and refresh the snapshot even when an action is rejected.
- `remediation.test.ts` includes 32 parameterized catalogue/stack cases, exact-once attribution, dodges, reflection, execute, invalid receipts, reset and chest RNG replay. UI tests cover choice locking and rejected-action recovery.

## Required shared-host wiring (integration owner; intentionally NOT changed here)

1. **Registration.** Confirm `RELICS_PACK` is present exactly once in `src/game/content/packs/index.ts`. Never call `onRelicEvent` directly if a registered `RELICS_PACK.onEvent` already consumes the event.
2. **Chest world events.** Call `openTreasure(state, event.id, seededRandom, optionalFeedback)` **exactly once** when the real chest is activated. Use the positive, monotonically increasing world-event serial. A bad RNG sample throws *without consuming* that chest ID. The same chest must never grant a second item or replay XP. Keep existing chest XP behavior unchanged; only the host handles it.
3. **Overlay.** Pause gameplay while an offer is active. Pass `inventorySnapshot(state).pending` and `inventorySnapshot(state)` to `RelicRewardOverlay.vue`; handle `claim` using `claimTreasure(state, chestId, id, feedback)`, `reroll` using `rerollTreasure`, `banish` using `banishTreasure`, and `decline` using `declineTreasure`. Update props after each action. Audio/VFX may map `RELIC_CUES` without modifying `SfxCue` in this feature branch.
4. **Outgoing combat.** Create one `createRelicCombatHooks` per engine/run, with the engine's deterministic RNG and an `emit` callback that invokes `ContentRegistry.emit` once. Call `attack(hitSerial, baseDamage, { element, source, moving, afterDash, boss, targetHpFraction, targetHp })` **after** existing base/skill damage modifiers and **before** applying target HP. Null means duplicate/invalid/stale and must not deal damage. Use returned `damage` as the final relic-adjusted damage, `critical` for VFX, `pierce` for projectile target budget and `extraProjectile` for one extra bounded projectile from the existing projectile builder. `targetHp` enables true execute lethality for eligible ordinary enemies. Do not duplicate the host's kill, damage or XP accounting.
5. **Hit confirmation.** After applying the real damage, call `confirmHit(hitSerial, targetMob, actualAppliedDamage, killed)`. `actualAppliedDamage` must be post-shield/HP-clamped actual target damage, no more than the adjusted attack; `killed` requires final target HP ≤ 0 and positive applied damage. This emits one `hit` and optionally one `kill` through the supplied registry callback; **do not also emit those two events elsewhere**. Host remains responsible for **exactly one** monster death, XP drop, loot and achievement credit.
6. **Incoming combat.** Call `incoming(contactSerial, amount)` before applying hero damage; null means duplicate/invalid/stale and must not hurt the hero. A dodge means damage 0. Resolve existing invulnerability, barriers and shields in the host; then call `confirmIncoming(contactSerial, actualHeroHpDamage)`. Its return is reflected damage derived only from actual HP damage, *never* attempted, dodged or shielded damage. Attribute reflection to the original hostile attacker and apply through host death/combat accounting **without running another reflection**. Confirmed damage emits one `damage` event.
7. **Movement and recovery.** Use `pickupRadius(baseRadius)` for actual world/XP collision radii; call `tick(dt)` on active gameplay ticks only. The underlying recovery function clamps each dt to 0.25 seconds and stops during pause. For stat bonuses to `hero.damage`, `hero.speed`, `hero.delay`, and `hero.max`, call `acquireRelic` once per valid reward only; never separately multiply the same bonus in shared combat.
8. **Reset.** Reinitialize the hero through the existing `resetRun()` first. Call `hooks.reset()` or `resetRelics(state)` on the associated run; ensure pending chest offers are dismissed and UI hides. Never mutate Profile v2, shared `JobId` or `GameState` schema.

**Important integration limitation:** This branch intentionally cannot wire shared `engine.ts`, `step.ts`, `combat.ts`, world event dispatchers, `App.vue`, or `packs/index.ts` under the assigned ownership constraint. The exported rule paths and UI are therefore **not yet live gameplay until integration owners connect them**.

## Verification commands / required release gate

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

Then exercise live 130-actor battles, crit and pierce target attribution, curse damage and healing, boss execute immunity, real incoming reflection with barriers, single XP awards, and chest overlay touch/keyboard accessibility on desktop/mobile. The dedicated original `es2-relics-loot-ci.yml` workflow listens only for `feature/es2-relics-loot`; it does **not** automatically run on this remediation branch. Full CI status must be taken from a fresh run on this branch, not inferred from prior runs.
