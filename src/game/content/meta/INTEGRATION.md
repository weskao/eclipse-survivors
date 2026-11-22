# ES2 permanent progression remediation — integration/cutover contract

This branch is intentionally isolated. Only `src/game/content/meta/**` and
`src/components/es2/progression/**` are changed. It **does not** replace
`src/meta/profile.ts`, the legacy `SAVE_KEY`, the engine's run completion
handler, `App.vue`, or the old menu.

## Implemented adapter

- `createMetaProgressionStore(storage?)` exports `get()`,
  `settle(receipt)`, `purchaseResearch(id)`, `purchaseEquipment(id)`,
  and `purchaseBonus(id)`. All v3 payouts and spending pass through the
  **same** synchronous, validated writer. No calls mutate their input state.
- `get()` reports `status: 'ready' | 'blocked'`, the cloned v3 `state`,
  the normalized `legacyProfile` snapshot, and `revision`. A corrupt
  committed envelope, invalid legacy profile or blocked storage is **blocked**,
  not silently reset to zero.
- `META_V3_HEAD_KEY` identifies the last committed revision and active slot.
  `META_V3_SLOT_KEYS.a/b` hold independently validated envelopes
  (`schema`, `revision`, `state`, `legacyProfile`). This never writes the
  v2 key. A transaction writes/reads back the inactive slot, atomically
  points the head to it, and reads back the committed head before acknowledging.
  Interrupted writes without a new head are ignored on reload: the previous
  revision remains authoritative. Unknown schema versions fail closed.
- A `setItem` implementation that throws **after** the head changed creates
  an uncertain acknowledgement. The operation reports failure; a reload reads
  the committed receipt from the new head and rejects resettlement. Callers
  must reconcile from `get()`, not blindly grant again.
- The run ledger rejects duplicates across reloads and refuses further
  payments at **20,000** IDs. Old v2 data had only the latest 128 receipts.
  Ancient historical receipts cannot be recovered; do **not** synthesize
  or reuse IDs from old saves.
- Existing catalog code continues to own research, mastery, achievements,
  discovery, equipment, milestones, and starter bonuses; v2 historical
  milestones are pre-claimed without back-pay.
- `ProgressionPanel.vue` consumes an externally supplied v3 state, shows
  hero mastery/research/unlocks/achievements, and **emits intents only**.
  Blocked/busy state disables spending. It never directly writes storage.

## Final integration cutover (mandatory; deliberately NOT done here)

1. **Choose the one authoritative writer.** In `src/game/engine.ts`,
   `createEngine()` currently initializes `createProfileStore()` around
   line 116 and `end()` calls `profileStore.recordRun(stats)` around
   line 240. Replace that reward path with one `store.settle(receipt)`
   call only. Do **not** call both writers or mirror v3 currency into v2.
   Gate victory/reward acknowledgement on `result.ok`, and report blocked
   or failed durable writes explicitly. A duplicate result never grants
   rewards, even if the end callback is repeated.
2. **Authenticate run receipts at the lifecycle boundary.** Generate a
   fresh unpredictable run/session ID on actual run start; use that same
   issued ID on the single terminal run event. Reject forged, stale,
   pre-cutover or unissued IDs in the host adapter before `settle`.
   Don't use `Math.random` or a predictable incrementing counter for
   receipt provenance. This branch cannot attest provenance because it
   does not own the game engine.
3. **Retire old currency writes at cutover.** `src/meta/profile.ts`
   deliberately still exposes `recordRun` and `buyUpgrade`, and the
   engine still uses it. The v3 store is not the active game writer
   **until this host replacement is merged and tested**. Decide how
   legacy profile cosmetics, encyclopaedia, per-mode bests, and
   `ui.profile` remain readable without continuing legacy settlement.
4. **Apply permanent start benefits once.** In `start()` around lines
   250–259, replace the old direct `power/vitality` application with
   `getStartingLoadout(state, hero)` interpreted exactly once after
   `resetRun`. Keep the v2 +4% damage/rank and +12 HP/rank unchanged;
   do not add these legacy ranks a second time. Apply new 1% research/
   starter perks and gear only at run creation, never on a live tick.
5. **Mount progression UI.** In the menu/dialog integration, pass a
   cloned state and `status` to `ProgressionPanel`, and route its
   `research`, `equipment`, `bonus` events to the single v3 store.
   Refresh the view only after durable success; display a recoverable
   storage warning otherwise. Preserve existing menu accessibility,
   selection, cosmetics, and v2 data presentation.
6. **Migrate and back out safely.** First successful v3 mutation commits
   the new slot/head without modifying the v2 key. Keep an independently
   validated legacy snapshot in every v3 envelope for a **pre-cutover**
   backout. If v3 has ever accepted a new run, reverting to v2 as a
   writable reward source would lose receipt proofs and can double-pay:
   **do not automatically fall back or roll back accepted v3 rewards**.
   On corrupt committed v3 data, stop reward writes and require explicit
   user-controlled recovery from a verified backup.
7. **Enforce single-tab ownership.** The commit-pointer protocol is
   crash-safe for one synchronous writer, but localStorage has no
   compare-and-swap across tabs. Establish one leader/writer (e.g. Web
   Locks at the engine boundary) before enabling parallel sessions.
   Detect and block split-brain sessions. Plan quota-safe ledger archival
   before 20k receipts; never evict history just to resume payments.

## Verification matrix

`src/game/content/meta/store.test.ts` covers v2 migration, unchanged
legacy key, duplicate receipts across reloads, two-slot commit, failed
stage/head writes, post-write exceptions, malformed/future data,
insufficient funds, research and bonus persistence, and ledger capacity.

`src/components/es2/progression/ProgressionPanel.test.ts` covers purchase
intents, read-only state, disabled/blocked operations, research prerequisites,
mastery, achievement states and hero equipment.

For final integration additionally test real engine victory/defeat/retry
sequences, authoritative receipt issuance, v2+v3 double-writer prohibition,
simultaneous tabs, reload after purchases, mobile pointer/keyboard,
run-start effect multiplicity, and real browser storage-quota failures.

Required release commands (run on the **merged integration candidate**):

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

No PR, default-branch changes or deployment are authorized by this handoff.
