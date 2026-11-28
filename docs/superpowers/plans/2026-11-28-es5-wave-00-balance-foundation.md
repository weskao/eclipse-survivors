# ES5 Wave 00 — Balance Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish reproducible baseline and identify balance gaps without altering gameplay.

**Architecture:** Extend existing telemetry and real engine step path; introduce small seeded simulation fixtures and offline report, not a second combat engine.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch (proposed):** `feature/es5-00-balance-foundation`

**Dependencies:** ES4 accepted; source baseline pinned; unlocked DEV fixture isolated.

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Seed repeatability across quality and wall clock (T1).
- Illegal/foreign Hall ranks and account leakage (T2).
- Endless runs are censored, not wins (T3).
- Overkill, healing, shields and multiple sources accounted separately (T4).
- Slow/hung simulation and unmeasured browser thermal evidence (T5).

---

### Task 1: Pin baseline and deterministic RNG (W00-01)

**Files:** Modify `src/game/engine.ts`, `src/game/step.ts` only if needed; new `src/game/balance-simulation/seed.ts`, `src/game/balance-simulation/seed.test.ts`

**Interfaces:** `createSeededRandom(seed:number):()=>number`; injectable RNG/clock through actual engine adapter, default runtime behavior unchanged.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/seed.test.ts`**
  - `same_seed_same_digest`: two identical seeds/inputs produce equal event digest
  - `different_seed_changes_draw`: different seed changes draws
  - `invalid_seed_rejected`: NaN and noninteger rejected
  - `quality_independent`: same replay gives equal combat events at low/high quality

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/seed.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Inventory all random draws and wall time in actual engine; inject deterministic RNG only at existing boundaries; use simulation clock and stable event ordering. Preserve default random source.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/seed.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: establish deterministic combat simulation"`. No unrelated files.

### Task 2: Legal hero and investment fixtures (W00-02/03/05)

**Files:** New `src/game/balance-simulation/fixtures.ts`, `fixtures.test.ts`; consume `src/game/content/meta/hall-state.ts`, `hall-talents.ts` and balance JSON

**Interfaces:** `makeFixture(heroId:HeroId, stage:InvestmentStage):RunFixture`; `InvestmentStage = fresh|legacy|early|mid|mature` (string union); fixture owns local state and legal snapshot.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/fixtures.test.ts`**
  - `all_thirty_profiles`: 6×5 legal fixtures; fresh zero, legacy five rank5, mature legal ranks and 2+1+1 slots
  - `foreign_nodes_inactive`: other hero ranks cannot appear
  - `sandbox_no_wallet`: no real save/wallet and fresh fixture independent
  - `build_policy_legal`: all choice picks from actual offered IDs

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/fixtures.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Use current purchase/eligibility contracts; explicit legal early/mid presets with costs; document chosen IDs per hero, not auto-fill illegal max. Include defensive, precision, area, stealth, summon, blood-oath builds and current relic/evolution selection.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/fixtures.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: add representative hero investment fixtures"`. No unrelated files.

### Task 3: Engine runner and policies (W00-01/02/06)

**Files:** New `src/game/balance-simulation/run.ts`, `run.test.ts`; read `src/game/engine.ts`, `src/game/content/objectives/runtime.ts`

**Interfaces:** `runSimulation(input:SimulationInput):SimulationResult`; input hero/stage/mode/policy/seed/horizon; policies casual/experienced/expert; result outcome win/loss/censored, actual event digest and metrics.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/run.test.ts`**
  - `nine_mode_smoke`: all nine modes run using live engine path
  - `endless_censored`: alive at 900s => censored, not win
  - `objectives_real`: kill or elapsed time alone not a win unless existing objective accepts it
  - `policy_fixed`: same action and upgrade choice schedule for matched run

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/run.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Drive actual fixed simulation steps without rendering, policy decisions via actual input, select among offered choices; bounded time and max steps, explicit failure result on stalls. Never monkeypatch away combat or objectives.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/run.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: run deterministic headless balance scenarios"`. No unrelated files.

### Task 4: Telemetry and source attribution (W00-04/06/07/08)

**Files:** Modify `src/game/combat-telemetry.ts`, `src/game/combat.ts`, `src/game/content/enemies/integration.ts`, `src/game/content/heroes/`; new `src/game/balance-simulation/telemetry.test.ts`

**Interfaces:** Add optional bounded aggregate observer to existing telemetry; `CombatMetricEvent` discriminated by damage/heal/shield/cast/phase/kill/upgrade/receipt; no per-frame unbounded log.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/telemetry.test.ts`**
  - `effective_damage`: hit 100 on 30HP counts 30 effective and 70 overkill
  - `heal_and_absorb`: heal 12 with 5 missing records 5 actual; fully absorbed hit records no HP loss
  - `q_once`: one successful Q counts once independent of targets
  - `boss_phase_dwell`: actual phase entry timestamps and kill/death outcome
  - `bounded_telemetry`: samples stay bounded, 130 actor slots tracked including pending

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/telemetry.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Instrument authoritative events once; distinguish hero/weapon/basic/persistent/summon/proc, faction vs legacy, self-cost vs incoming, boss TTK, cooldown, first upgrade, XP/KPM/embers. Keep rendering timing separate.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/telemetry.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: extend combat telemetry for balance attribution"`. No unrelated files.

### Task 5: Matrix report and CI smoke (W00-09/10)

**Files:** New `scripts/balance-simulation/README.md`, `src/game/balance-simulation/report.ts`, `report.test.ts`; proposed script `scripts/balance-simulation/run.mjs` (use existing TS runner pattern after package inspection); docs `docs/es5/balance-baseline.md`

**Interfaces:** `buildMatrix(seeds:number[]):SimulationInput[]`, `summarize(results):BalanceReport` with CSV/JSON SHA flags seeds median/p90 outcome counts.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/report.test.ts`**
  - `matrix_count`: 6*5*9*3*10 =8100 unique inputs
  - `paired_comparison`: different seed sets or policy versions rejected
  - `failures_visible`: failed runs not dropped; censored separate
  - `no_fake_device`: missing hardware metrics marked not measured

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/report.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Provide small deterministic smoke in existing CI and full 8100 offline/nightly only after runtime budget measured; ≥50 paired seeds for anomalies. Generate report with costs and telemetry; capture browser device metrics separately; no gameplay changes.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/report.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: report reproducible balance matrix"`. No unrelated files.

## Wave acceptance / handoff

- [ ] Produce measured baseline, identify BAL-01–05 and flag confidence limits; owner approves only selected numeric changes. No actual simulation results are assumed in this plan.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
