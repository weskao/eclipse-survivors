# ES5 Wave 06 — World Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce semi-open chapter progression, two new world concepts and distinct encounter objectives.

**Architecture:** Extend existing biome and chapter registries, profile migration, objectives and director; each new world is a separate content pack.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch (proposed):** `feature/es5-06-world-expansion`

**Dependencies:** Release A/B accepted; W02/W03/W04 and W07 accepted receipt contract. New art and detailed encounter numbers require additional owner design approval.

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Migration loses prior chapter unlocks (T1).
- Trial or dev receipt falsely unlocks chapter (T1).
- No reachable safe route for slowest hero (T2,T3).
- Incomplete new boss art/cues or reused wrong identity (T3,T4).
- Unsupported chapter/mode launch and RWD (T4).

---

### Task 1: Semi-open chapter unlock contract

**Files:** Inspect actual chapter mapping in `src/game/balance/world.json`, `src/game/content/biomes/index.ts`, `src/meta/profile.ts`; new `src/game/content/biomes/es5-chapter-unlocks.ts`, `es5-chapter-unlocks.test.ts`

**Interfaces:** `resolveChapterUnlocks(profile,acceptedReceipt):readonly ChapterId[]`; `canStartChapter(id,mode,difficulty,unlocks):Validation`; existing IDs preserved.

- [ ] **Step 1 — RED: add named tests in `src/game/content/biomes/es5-chapter-unlocks.test.ts`**
  - `migration_preserves`: all prior unlocks retained; no guessed chapter remap
  - `next_once`: designated Standard D1+ legitimate previous clear unlocks next once
  - `replay`: already unlocked chapter remains after defeat, replay any compatible tier/mode
  - `reject_bypass`: trial/lab/dev/invalid/duplicate receipt cannot unlock
  - `locked_start`: reject incompatible or locked with reason

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/biomes/es5-chapter-unlocks.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Document actual chapter-to-biome map before changes; use stable ID and existing receipt/migration, exact gate candidate reviewed by owner; do not replace existing names.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/biomes/es5-chapter-unlocks.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add semi-open chapter progression"`. No unrelated files.

### Task 2: Chapter III — Shattered Heaven design and WLD01–04

**Files:** New design `docs/es5/chapter-iii-design.md`, asset manifest; modify `src/game/content/biomes/index.ts`, `runtime.ts`, `src/game/content/objectives/runtime.ts`; new `src/game/content/biomes/es5-chapter-iii.test.ts`

**Interfaces:** Chapter III stable ID reserved after owner review, `WorldRule` and existing biome hazard/interaction contract; WLD01 inversion, WLD02 rift, WLD03 altar, WLD04 seals.

- [ ] **Step 1 — RED: add named tests in `src/game/content/biomes/es5-chapter-iii.test.ts`**
  - `deterministic_layout`: same seed gives same legal terrain/hazards
  - `telegraph_geometry`: hazard warning matches hit, reachable route at speed172
  - `altar_choice`: cost/benefit once, no wallet side effects
  - `seal_objective`: actual guardian/interaction completes only once
  - `legacy_unchanged`: old biomes not modified by new pack

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/biomes/es5-chapter-iii.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** First draft detailed geometry/timing/attack numeric spec and art briefs, obtain approval before implementing; then implement only approved values in existing biome runtime. Do not claim precise unapproved art counts.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/biomes/es5-chapter-iii.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add approved chapter iii world mechanics"`. No unrelated files.

### Task 3: Chapter IV — Total Eclipse design and WLD05–06

**Files:** New `docs/es5/chapter-iv-design.md` + asset manifest; modify biome runtime/director; new `src/game/content/biomes/es5-chapter-iv.test.ts`

**Interfaces:** WLD05 eclipse corruption, WLD06 faction invasion use existing budget and warning contract.

- [ ] **Step 1 — RED: add named tests in `src/game/content/biomes/es5-chapter-iv.test.ts`**
  - `chapter_iii_dependency`: chapter IV not available before genuine chapter III clear
  - `no_hazard_lockout`: combined rule retains reachable route; incompatible oaths rejected
  - `invasion_budget`: active+reserved≤130; deterministic phases
  - `reset`: hazard/event state clears when returning to menu

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/biomes/es5-chapter-iv.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** After III acceptance, create detailed design and approved parameters; use bounded rotating zones and mixed factions, reuse existing director; no exponential HP escalation.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/biomes/es5-chapter-iv.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add approved chapter iv world mechanics"`. No unrelated files.

### Task 4: B05/B06 original bosses and world presentation

**Files:** New `docs/es5/new-boss-design.md` and per-asset manifests; extend `src/game/content/bosses/definitions.ts`, `controller.ts`, art/audio/render and menu shared owners; new `src/game/content/bosses/es5-new-world-bosses.test.ts`

**Interfaces:** B05 celestial-archon and B06 eclipse-devourer distinct proposed IDs, each three phase contract with approved attack table.

- [ ] **Step 1 — RED: add named tests in `src/game/content/bosses/es5-new-world-bosses.test.ts`**
  - `unique_identity`: own art, phase attacks and sound/score; no tint-only old boss
  - `real_phase_order`: approved phase thresholds, telegraph/hit parity, no stale attacks
  - `objective_and_discovery`: genuine kill recorded once, locked dossier remains undiscovered until eligible
  - `chapter_mode_ui`: correct mapping, bilingual, locked reasons, mobile reachable CTA

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/bosses/es5-new-world-bosses.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Require separate detailed spec including full attack values, approved geometry, art/audio inventory before TDD; ship B05 with III then B06 with IV. No placeholder production release or false asset acceptance.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/bosses/es5-new-world-bosses.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: integrate approved new chapter bosses"`. No unrelated files.

## Wave acceptance / handoff

- [ ] III then IV accepted independently. New-world detailed design/asset approvals are explicit gates; these candidates are not immediately executable until approved.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
