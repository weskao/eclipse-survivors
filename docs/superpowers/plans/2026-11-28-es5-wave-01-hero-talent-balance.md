# ES5 Wave 01 — Hero & Talent Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make six heroes and every permanent node mechanically coherent without flattening strengths.

**Architecture:** Use existing hero adapters, source-aware hall-runtime and authoritative combat. Change only measured candidates; no mass buff.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch (proposed):** `feature/es5-01-hero-talent-balance`

**Dependencies:** W00 paired baseline; W04 snapshot interface skeleton if needed; ES4 release/runtime approved.

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Classic Q vs specialist and faction hits (T1,T3).
- Recursive proc, doubled critical and conditional caps (T2).
- Full health heal, low HP paladin cost and immunity (T4).
- Foreign, unequipped and disabled ranks (T2).
- Ranger mark resets and wizard secondary targets (T3).

---

### Task 1: Six hero Q contract and baseline (H01–06)

**Files:** Modify `src/game/content/heroes/classic-active.ts`, `index.ts` only for proven parity; new `src/game/content/heroes/es5-active.test.ts`

**Interfaces:** Reuse `getHeroActiveDefinition`, `activateHeroSpecial` and shared source hook; no new input loop.

- [ ] **Step 1 — RED: add named tests in `src/game/content/heroes/es5-active.test.ts`**
  - `six_cooldowns`: 11,9,13,9.5,12,14 exactly baseline
  - `distinct_target_caps`: Knight8 Ranger3 Wizard6 Shadow3 Spirit3; no duplicate target across pools
  - `paused_dead_reset`: reject invalid casts and reset only on real run reset
  - `legacy_vs_faction`: same authoritative damage semantics for identical target stats

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/heroes/es5-active.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Measure current Q output and hooks; fix only reproducible parity bugs; preserve animation/SFX/cooldown/ready cues and touch/Q.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/heroes/es5-active.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: verify six hero active contracts"`. No unrelated files.

### Task 2: All 77 nodes and stacking (BAL-03/04/05)

**Files:** Modify `src/game/content/meta/hall-runtime.ts`, `hall-state.ts`, `src/game/combat.ts`, `src/game/content/enemies/integration.ts`; new `src/game/content/meta/es5-talent-balance.test.ts`

**Interfaces:** Reuse `resolveHallRunSnapshot`, `hallOutgoing`, `hallIncoming`, `hallExtraHit`, `withHallSource`; catalog-driven test table per ID.

- [ ] **Step 1 — RED: add named tests in `src/game/content/meta/es5-talent-balance.test.ts`**
  - `all_77_ids`: 77 IDs, each rank boundary and effect positive/negative, source/trigger and tooltip parity
  - `initial_growth`: legacy+edge => ×1.26 and HP+80 before other effects
  - `legal_attunement`: only owned matching nodes; 2+1+1 and prerequisites, disabled snapshot empty
  - `no_recursive_proc`: proc cannot retrigger itself, critical once per hit; common cap .75 and specialist path audited
  - `defense_order`: shield/mitigation/self-cost order verified; no permanent invulnerability; DR>70% reported

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/meta/es5-talent-balance.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Generate test cases from existing catalog with explicit expected effects per spec/source, not mere existence; audit every cap across call sites. Only approved corrections, use source tags and current hooks.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/meta/es5-talent-balance.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "test: enforce hall source and stacking contracts"`. No unrelated files.

### Task 3: Knight, Ranger, Wizard candidates (H01–03)

**Files:** Modify `src/game/balance/heroes.json`, `src/game/content/heroes/classic-active.ts`, `src/game/content/meta/hall-runtime.ts`, `src/game/content/bosses/controller.ts` only with coordinated owner; new `src/game/content/heroes/es5-classic-q.test.ts`

**Interfaces:** Candidate `HeroQPolicy` in existing active module, resolved from immutable run config; existing target selection; poise uses boss controller.

- [ ] **Step 1 — RED: add named tests in `src/game/content/heroes/es5-classic-q.test.ts`**
  - `knight_poise`: eligible recovery/defending hit ×1.2 poise, HP damage unchanged, no routine windup cancellation
  - `ranger_mark`: marked target ×3.6 vs unmarked ×3, mark invalidates on target change/death
  - `wizard_chain`: ≤3 distinct secondary at .35 Q damage, excludes primary, no recursion
  - `off_parity`: disabled or unapproved rules retain baseline

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/heroes/es5-classic-q.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Run candidate A/B after W00 approval; select only beneficial changes. Keep original Q CD and core hit limits; use existing enemy and boss damage paths, no global ATK change.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/heroes/es5-classic-q.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add measured classic hero tactical candidates"`. No unrelated files.

### Task 4: Shadowblade, Spirit, Paladin (H04–06)

**Files:** Modify `src/game/content/heroes/index.ts`, `src/game/content/meta/hall-runtime.ts`, `src/game/balance/heroes.json`; new `src/game/content/heroes/es5-specialist-q.test.ts`

**Interfaces:** Use existing adapter activate/tick/reset/snapshot and existing companion actors.

- [ ] **Step 1 — RED: add named tests in `src/game/content/heroes/es5-specialist-q.test.ts`**
  - `ambush_once`: first eligible post-stealth hit only, no duplicate proc; stealth .95 and inv .7 baseline
  - `spirit_focus`: candidate 4s focus valid target, dead/out-of-range fallback, max3 companions, max rank heal13.8
  - `paladin_cost`: 8% maxHP rounded by current rule, cannot kill; absorption counted once; 3.5s barrier
  - `low_hp_and_pause`: low HP bonus condition, timers pause and reset; no free healing by self-cost

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/heroes/es5-specialist-q.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Preserve costs/crit/stealth; candidate ambush +10% only once with existing modifiers, Spirit priority focus, Paladin feedback via shared event/SFX. Tune only measured approval.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/heroes/es5-specialist-q.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: deepen specialist hero combat loops"`. No unrelated files.

### Task 5: Build synergy and comparative report

**Files:** New `src/game/balance-simulation/hero-comparison.test.ts`, `docs/es5/hero-talent-balance.md`; consume W00 runner

**Interfaces:** Paired `BalanceReport` grouped by hero, investment, role build, mode, policy and seed.

- [ ] **Step 1 — RED: add named tests in `src/game/balance-simulation/hero-comparison.test.ts`**
  - `paired_no_scope_drift`: same seeds/flags/policy/gear across before-after
  - `viability_not_equal_dps`: report six hero win/TTK/survival by build, no equal DPS mandate
  - `every_role_has_build`: at least one legal build per hero and intended difficulty under expert policy

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/balance-simulation/hero-comparison.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Report ES3 Wave3 synergy and Wave5 identity coverage; run targeted ≥50 seeds for outliers; human playtests; explicit approval for final parameters.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/balance-simulation/hero-comparison.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "docs: record hero and talent balance evidence"`. No unrelated files.

## Wave acceptance / handoff

- [ ] All six heroes viable and all 77 nodes individually tested; source/trigger parity and actual approved A/B report. No automatic nerf if aspirational metrics differ.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
