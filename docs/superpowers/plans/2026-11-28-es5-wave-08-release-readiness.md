# ES5 Wave 08 — Integration & Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continuously verify ES5 compatibility, numerical tuning, player flow, performance and release gates.

**Architecture:** Reuse current test suite, release workflow, browser harness and existing VFX/audio profiling; evidence ledger records actual SHA and explicit open gates.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch:** active Stage branch in [release stages](../../es5/release-stages.md); legacy Wave branch names are superseded for execution.

**Dependencies:** G0 and only the prerequisites of the assigned Release Stage; task-specific interfaces apply when that feature is actually delivered. See release-stages.md. W00 paired evidence precedes tuning.

## Global Constraints

- **Release-stage authority:** follow [release stages](../../es5/release-stages.md) for branch ownership, scope, prerequisite and independent delivery. Wave tasks are technical work packages; execute only the portion assigned to the active Stage. No future-stage scaffolding or unpublished content dependency.
- **Balance authority:** read `CLAUDE.md` and [existing balance rule](../../../.claude/rules/game-balance-config.md) before any numeric CRUD. Reuse existing `src/game/balance/*.json` domains first, register genuinely distinct new domains in `balance/index.ts`, extend `config.ts` typed validation and `balance.test.ts`; runtime reads typed `BALANCE`. Preserve existing Hall catalog ownership, public keys and save compatibility; any touched legacy tunable literal is migrated without changing value unless separately approved. No duplicated numeric owners, hot-path JSON parsing or unrelated extraction.
- **Evidence:** use paired seeds, legal fresh/legacy/early/mid/mature builds, same policy/mode/settings; record every changed JSON path/key, old/new/unit/percent (N/A for new or zero baseline), reason, actual measured result, RED/GREEN, exact SHA CI and manual QA under `docs/es5/evidence/stage-NN/`. Root TODO is the status authority; check only verified subtasks; release-ready, merged, published and production verified are separate. Follow actual `docs/release-process.md` and scoped CLAUDE rules; no automatic deploy.
- **Numeric scope:** Every Stage: verify registered domain equality, keys, finite ranges, probability sums, caps, same-seed results, actual runtime and bilingual UI parity; verify all applicable CLAUDE gates, 130 actors, no hidden scaling, no device-dependent balance. Stage gate independent; only mark W08 complete when all its required gates across stages are accepted.

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Flag off and mixed ES4/ES5 settings (T1).
- Headless green vs actual player flow (T2).
- Physical devices/thermal missing (T3).
- CI stale/cancelled or art gates bypassed (T4).
- Release scope or unfinished chapter enabled (T4).

---

### Task 1: QA01–10 compatibility regression suite

**Files:** New `tests/es2/integration/es5-compatibility.test.ts` (or new `tests/es5/` if Vitest includes it), existing targeted suites and env scripts; modify only proven failing integration surfaces

**Interfaces:** Full flag matrix ES4 off/on × ES5 off/on × normal/unlocked DEV; use authoritative engine and profile.

- [ ] **Step 1 — RED: add named tests in `tests/es2/integration/es5-compatibility.test.ts`**
  - `flag_matrix`: off legacy behavior, ES5 never turns on ES4 production purchases, dev wallet isolated
  - `d1_all_modes`: nine original modes retain objectives/scaling except approved fixes
  - `six_heroes_77_talents`: all hero/attunement/source/receipt gates covered
  - `boss_and_enemies`: 25 legacy+12 mythic, affix/actor cap and phase/reward once
  - `unlock_and_oaths`: compatibility, persistence and account switch, no hidden scaling

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run tests/es2/integration/es5-compatibility.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Wire actual integrated flow; keep original tests and art gate, add named cross-wave cases. Run all targeted suites and make verify; document known issues rather than waivers.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run tests/es2/integration/es5-compatibility.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: cover es5 compatibility and integrated objectives"`. No unrelated files.

### Task 2: QA11/12 browser, touch, audio and actual UI

**Files:** Modify existing browser scripts under `scripts/` and shared UI only if regression; new `tests/es2/mobile/es5-player-flow.test.ts`, `docs/es5/browser-qa.md`

**Interfaces:** Player flow hero→chapter→mode→start→Q/touch→choice→boss→result→home; add tier/oath only once the active Stage exposes them.

- [ ] **Step 1 — RED: add named tests in `tests/es2/mobile/es5-player-flow.test.ts`**
  - `start_reachable`: portrait/landscape/foldable/tablet safe-area and no occluded CTA
  - `inputs`: keyboard/touch and reduced-motion parity; no text selection/scrollbar regressions
  - `music_continuity`: hero card/tab click and choice overlay do not interrupt active track; result correct
  - `discovery_details`: desktop hover/touch info same source and actual matching art

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run tests/es2/mobile/es5-player-flow.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Run actual browser harness for desktop Chromium/WebKit, mobile portrait/landscape, tablets and foldables; capture screenshots and clips; manually verify sound and new asset identity. Fix only actual regressions.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run tests/es2/mobile/es5-player-flow.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: verify es5 player flow and audio continuity"`. No unrelated files.

### Task 3: QA13/15 load and device evidence

**Files:** Extend existing `src/game/performance/es2/`, `tests/es2/performance/` harness; new `tests/es2/performance/es5-budget.test.ts`, `docs/es5/device-performance.md`

**Interfaces:** Benchmark matched device/quality/seed, separate simulation from render, frame p50/p95, memory and thermal trend.

- [ ] **Step 1 — RED: add named tests in `tests/es2/performance/es5-budget.test.ts`**
  - `actor_budget`: 130 slots including pending and summons, bounded projectile/VFX/zone counts
  - `quality_same_rules`: collision and outcome identical for quality setting
  - `repeat_cycles`: bounded caches and cleanup over multiple runs/menu returns
  - `unmeasured_not_pass`: missing real device evidence represented pending

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run tests/es2/performance/es5-budget.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Use automated benchmark to identify regressions; actual iPhone/Android and desktop 15–30min thermal/memory and FPS target60 normal/≥30 high load. Do not infer hardware performance from emulation; record blockers.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run tests/es2/performance/es5-budget.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: guard es5 performance budgets"`. No unrelated files.

### Task 4: QA14 release and evidence gate

**Files:** Modify `TODO.md`, `CHANGELOG.md`, release version files only as approved for release, `docs/es5/release-evidence.md`; existing workflows and `docs/release-process.md`; new `tests/es2/integration/es5-release-gate.test.ts`

**Interfaces:** Evidence row taskId/SHA/RED/GREEN/CI/device/asset/data/status; active Stage scope allowlist.

- [ ] **Step 1 — RED: add named tests in `tests/es2/integration/es5-release-gate.test.ts`**
  - `feature_scope`: active Stage excludes all unapproved later content; disabled features not exposed
  - `exact_sha`: stale/cancelled/skipped evidence not counted passing
  - `art_gate`: existing manual/art acceptance not weakened
  - `version_rule`: +0.0.1 with 99 carry per existing release process

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run tests/es2/integration/es5-release-gate.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Run `make verify`, both flag builds when a rollout flag actually exists, exact HEAD CI only if authorized; update TODO per evidence, get owner release signoff; no automatic merge or deploy. Remove rollout switch only in separate approved migration after rollback readiness.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run tests/es2/integration/es5-release-gate.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "docs: record es5 release readiness evidence"`. No unrelated files.

## Wave acceptance / handoff

- [ ] For each independent Stage, all applicable QA01–15 pass, actual human/physical/asset gates accepted, full CI at exact HEAD. Record remaining blockers; never claim a release complete on partial or stale evidence.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
