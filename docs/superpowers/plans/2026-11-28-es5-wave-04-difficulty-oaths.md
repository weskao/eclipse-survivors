# ES5 Wave 04 — Difficulty & Oaths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce immutable six-tier difficulty and twelve optional oaths with compatible UI and unlocks.

**Architecture:** One run-config resolver composes existing mode modifiers and approved difficulty/oaths, with centralized flag. Existing combat consumers read resolved config.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch (proposed):** `feature/es5-04-difficulty-oaths`

**Dependencies:** Contract task T1 can follow W00 before W02/W03; complete after their integration; W07 receipt gate before persistent rewards.

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- D1/off parity including all nine modes (T1).
- NaN, unknown, duplicated or incompatible config (T1,T2).
- Cap makes oath no-op or reward exploit (T2).
- Unlock and save tampering, trial receipts (T3).
- Mobile landscape/safe-area/CTA and bilingual (T4).

---

### Task 1: Run configuration and flag contract

**Files:** New `src/game/content/difficulty/run-config.ts`, `run-config.test.ts`, `src/game/balance/difficulties.json`; modify `src/game/engine.ts`, `src/game/balance/index.ts`, `.env.example` (and tracked .env only approved)

**Interfaces:** `DifficultyId = d0|d1|d2|d3|d4|d5`; `resolveRunConfig(input):Readonly<RunConfig>`; `resolveRunModifiers(config):Readonly<RunModifiers>`; config chapter/mode/tier/oaths/seed/ruleVersion/track, snapshot at run start; `VITE_ES5_ASCENSION` centralized.

- [ ] **Step 1 — RED: add named tests in `src/game/content/difficulty/run-config.test.ts`**
  - `d1_identity`: all nine modes preserve original modifiers
  - `cursed_d5`: HP2.17 ATK1.84 spawn1.61 before oath
  - `caps`: candidate ceilings2.30/2.00/1.75/1.20; finite valid input
  - `off_legacy`: flag off returns legacy policy, ES4 flag unchanged
  - `immutable`: mutating menu selections cannot alter active run

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/difficulty/run-config.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Write exact table in spec; additive increments once, no player power input, mythic eligibility by mode/chapter. Reject invalid values; preserve type compatibility with existing getMode. Export skeleton early; tune only after approval.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/difficulty/run-config.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: centralize difficulty run configuration"`. No unrelated files.

### Task 2: A01–A12 oath registry and compatibility

**Files:** New `src/game/balance/oaths.json`, `src/game/content/difficulty/oaths.ts`, `oaths.test.ts`; existing healing, chest, event and boss consumers

**Interfaces:** `validateOaths(ids,config):{ok:boolean;points:number;reason?:string}`; `resolveEffectiveOaths(config):Readonly<...>`; unique IDs, no-op policy.

- [ ] **Step 1 — RED: add named tests in `src/game/content/difficulty/oaths.test.ts`**
  - `budget_and_duplicates`: points≤12; duplicates unknown IDs and D0–2 rejected
  - `dependencies`: A12 without A09 rejected; A07+A10 rejected
  - `heal_once`: positive heal12 ×.8=9.6, self-cost unchanged
  - `no_free_points`: cap-saturated or duplicate active mechanic gives no reward or reject
  - `all_twelve_rules`: each ID activates only its own effect; A08 share≤.5; A06 rerolls≥0

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/difficulty/oaths.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Implement exact candidate IDs/table and compatibility from spec. Apply only once via authoritative effects and event budget; no-op/conflict explanation in UI; snapshot validated.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/difficulty/oaths.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: validate and apply bounded eclipse oaths"`. No unrelated files.

### Task 3: Difficulty unlock and persistence

**Files:** Modify existing `src/game/content/meta/state.ts`, `progression.ts`, `src/meta/profile.ts` after schema inventory; new `src/game/content/difficulty/unlocks.ts`, `unlocks.test.ts`

**Interfaces:** `resolveDifficultyUnlocks(profile,acceptedReceipt):readonly DifficultyId[]`; no mutation until receipt accepted; reuse migration/receipt owner.

- [ ] **Step 1 — RED: add named tests in `src/game/content/difficulty/unlocks.test.ts`**
  - `default_unlock`: D0/D1 available; no automatic locked selection
  - `sequential_clear`: D1 designated clear unlocks D2 then next, D5 needs D4 and mythic
  - `invalid_receipt`: loss, trial, dev, duplicate or unknown objective cannot unlock
  - `migration_no_loss`: old unlocked progress preserved; account isolation

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/difficulty/unlocks.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Define stable clear qualification and validate existing chapter/mode compatibility; do not change cloud schema without review, fail safely with explicit reason.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/difficulty/unlocks.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: persist legitimate difficulty unlocks"`. No unrelated files.

### Task 4: Mode/difficulty/oath UI

**Files:** Modify `src/components/es2/modes/ModeChooser.vue`, `src/components/es2/menu/Es2MainMenu.vue`, existing CSS/i18n; new `src/components/es2/modes/Es5Difficulty.test.ts`

**Interfaces:** Controlled validated menu state, derived track from tier; final resolved modifiers and lock reasons displayed.

- [ ] **Step 1 — RED: add named tests in `src/components/es2/modes/Es5Difficulty.test.ts`**
  - `default_d1`: existing default and old modes retained when off
  - `locked_and_incompatible`: start disabled with reason; no silent fallback
  - `points_and_preview`: effective point and capped multiplier text match resolver
  - `touch_keyboard`: selection, focus, reachable CTA and consistent button size

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/components/es2/modes/Es5Difficulty.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Reuse shared menu/detail components; compact portrait and landscape, sticky reachable CTA, no hot badge layout growth; i18n all names, read-only during run, real browser matrix.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/components/es2/modes/Es5Difficulty.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add ascension difficulty and oath selection"`. No unrelated files.

## Wave acceptance / handoff

- [ ] Six tiers and twelve oaths verified with D1 parity, compatibility, unlocks, snapshot and RWD; final numerical table approved and W07 receipt settlement gate complete before rewards enabled.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
