# ES5 Wave 07 — Progression & Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve legitimate progression, bound repeatable rewards and add non-power rewards/personal records.

**Architecture:** Extend existing verified run receipts and profile/wallet owners. No new currency; isolate sandbox and standardized trial records.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch:** active Stage branch in [release stages](../../es5/release-stages.md); legacy Wave branch names are superseded for execution.

**Dependencies:** G0 and only the prerequisites of the assigned Release Stage; task-specific interfaces apply when that feature is actually delivered. See release-stages.md. W00 paired evidence precedes tuning.

## Global Constraints

- **Release-stage authority:** follow [release stages](../../es5/release-stages.md) for branch ownership, scope, prerequisite and independent delivery. Wave tasks are technical work packages; execute only the portion assigned to the active Stage. No future-stage scaffolding or unpublished content dependency.
- **Balance authority:** read `CLAUDE.md` and [existing balance rule](../../../.claude/rules/game-balance-config.md) before any numeric CRUD. Reuse existing `src/game/balance/*.json` domains first, register genuinely distinct new domains in `balance/index.ts`, extend `config.ts` typed validation and `balance.test.ts`; runtime reads typed `BALANCE`. Preserve existing Hall catalog ownership, public keys and save compatibility; any touched legacy tunable literal is migrated without changing value unless separately approved. No duplicated numeric owners, hot-path JSON parsing or unrelated extraction.
- **Evidence:** use paired seeds, legal fresh/legacy/early/mid/mature builds, same policy/mode/settings; record every changed JSON path/key, old/new/unit/percent (N/A for new or zero baseline), reason, actual measured result, RED/GREEN, exact SHA CI and manual QA under `docs/es5/evidence/stage-NN/`. Root TODO is the status authority; check only verified subtasks; release-ready, merged, published and production verified are separate. Follow actual `docs/release-process.md` and scoped CLAUDE rules; no automatic deploy.
- **Numeric scope:** Stage 01 economy analysis only (meta.json, hall-talents.json, progression.json); Stage 02 eligible difficulty rewards and receipt safety when needed, Stage 06/08/09/10/11 only own feature rewards. No future receipt scaffolding, no price/currency changes without approval, one authoritative payout and idempotent receipt.

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Receipt replay, forged/overflow fields or account switch (T1,T2).
- Achievement or fixed objective reward double-multiplied (T2).
- Intentional quick death farming and lowest difficulty forced grind (T3).
- Unverified competitive scores marketed as fair (T4).
- Migration preserves old profile and wallet; lab/dev no credit (T1,T4).

---

### Task 1: Receipt and migration contract

**Files:** Modify `src/game/content/meta/progression.ts`, `state.ts`, `src/meta/profile.ts`, existing cloud wallet adapter only with approved migration; new `src/game/content/meta/es5-receipts.test.ts`

**Interfaces:** `Es5ReceiptContext` includes immutable run id/rules/seed/hero/mode/chapter/tier/effective oath IDs/RunKind/account; validate at existing settlement boundary.

- [ ] **Step 1 — RED: add named tests in `src/game/content/meta/es5-receipts.test.ts`**
  - `legacy_receipt_compatible`: existing V3/V4 receipt and profile semantics unchanged with flag off
  - `reject_invalid`: duplicate, unknown IDs, nonfinite or unsafe integers rejected
  - `account_scope`: old account receipt not applied to new wallet; no dev/lab credit
  - `trial_isolation`: Apex normal rewards/mastery/discovery not written; separate allowed one-time path
  - `migration_rollback`: old unlocks/balance retained, rollback and schema plan verified

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/meta/es5-receipts.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Inspect current trusted receipt path/cloud authority; version fields only after approval, no client-supplied arbitrary payout. Explicit account switch/receipt retry and ledger-full behavior.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/meta/es5-receipts.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: extend validated es5 receipt context"`. No unrelated files.

### Task 2: Difficulty/oath reward calculation

**Files:** Modify `src/game/content/meta/progression.ts`, `src/game/balance/meta.json`; new `src/game/content/meta/es5-rewards.test.ts`

**Interfaces:** `calculateEs5Bonus(baseEligible:number,tierBonus:number,effectiveOathPoints:number):number`; floor added bonus, cap.76; use accepted receipt only.

- [ ] **Step 1 — RED: add named tests in `src/game/content/meta/es5-rewards.test.ts`**
  - `d1_zero`: base150 +0 =>150 before legacy bonuses
  - `d4_six_points`: 150×(.25+.18)=64 floor extra; total214 before legacy
  - `d5_max`: 12 effective points +.40 =>.76 cap; 150→264
  - `no_fixed_multiplier`: achievement/milestone/fixed objective awards unchanged
  - `no_invalid_points`: duplicate/no-op oath, trial/lab/dev, invalid input no payout

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/meta/es5-rewards.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Apply eligible base add-on exactly once and preserve independent legacy/Hall bonus bases; integrate one receipt settlement, no new currency or direct UI wallet mutations.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/meta/es5-rewards.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: calculate bounded difficulty rewards"`. No unrelated files.

### Task 3: Economy measurement and cost audit

**Files:** New `src/game/balance-simulation/economy.test.ts`, `docs/es5/economy-report.md`; read `src/game/content/meta/hall-talents.ts`, `src/game/balance/hall-talents.json`

**Interfaces:** Use W00 reports; `expectedEmbersPerMinute` includes losses and measured selection time; cost computed from catalog authoritative function.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/economy.test.ts`**
  - `cost_baseline`: new72 nodes 44880 at reviewed HEAD, recalc on drift
  - `hour_estimate`: ceil(44880/150)=300 runs, ×8min=40h
  - `losses_included`: death and aborted/invalid receipts not silently excluded
  - `reward_ratio`: compare high-tier expected/min to normal target1.0–1.3×, report deviations

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/economy.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Measure each mode and stage including intentional death strategy; adjust only approved candidate costs/rewards with paired comparison; no mandatory highest-difficulty grind.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/economy.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "docs: audit es5 reward and progression economy"`. No unrelated files.

### Task 4: Cosmetics, achievements and record policy

**Files:** Modify existing `src/meta/achievements.ts`, `cosmetics.ts`, `profile.ts`, shared result UI; new `src/meta/es5-records.test.ts` and `docs/es5/ranking-trust.md`

**Interfaces:** Personal record keyed by ruleVersion/build/seed/hero/category; one-time rewards stable receipt IDs. Public leaderboard requires separate trusted backend design.

- [ ] **Step 1 — RED: add named tests in `src/meta/es5-records.test.ts`**
  - `cosmetic_only`: title/badge/skin/Q visuals do not modify stats
  - `first_clear_once`: daily reset, replay, account switch cannot repeat same qualifying reward
  - `record_partition`: Apex categories and versions never silently compared
  - `offline_safe`: local records clearly local; no fabricated global rank

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/meta/es5-records.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Use existing discovery/receipt rules, nonpower rewards and bilingual feedback; propose server replay validation, privacy/opt-in/rate limits only after approval; keep ordinary offline play.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/meta/es5-records.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add isolated challenge records and nonpower rewards"`. No unrelated files.

## Wave acceptance / handoff

- [ ] Evidence covers receipt validation, account isolation, cost/reward and exploit analysis. Public rankings remain deferred unless trusted architecture is approved and implemented.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
