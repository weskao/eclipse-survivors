# ES5 Wave 03 — Boss Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix authoritative damage/phase behavior and add four mythic forms with twelve mechanics.

**Architecture:** Extend existing boss definitions/controller, hit pipeline, objective and presentation; keep 25 existing attacks and original encounter IDs.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch (proposed):** `feature/es5-03-boss-evolution`

**Dependencies:** W00 and W04 snapshot skeleton; coordinate W02 summons and W01 poise.

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Damage multiplier missing or applied twice (T1).
- Burst skips or deletes phase damage (T2).
- Projectile/zone persists after phase, death or pause (T2,T3).
- Mythic variant double-scaled and no safe sector (T3).
- Reward duplication or stale audio (T4).

---

### Task 1: BAL-01 reproduce damage scaling

**Files:** Modify `src/game/content/bosses/controller.ts`, `src/game/combat.ts` only at authoritative boundary; new `src/game/content/bosses/es5-damage-scaling.test.ts`

**Interfaces:** `resolveRunModifiers` W04 contract; each raw damage source scaled once before central incoming crit/mitigation.

- [ ] **Step 1 — RED: add named tests in `src/game/content/bosses/es5-damage-scaling.test.ts`**
  - `d1_preserves_damage`: Standard raw 20 remains20 before mitigation
  - `mode_atk_once`: Cursed raw20 ×1.34=26.8 before rounding/mitigation
  - `all_paths`: burst/zone/projectile/contact/summon each exactly one multiplier
  - `incoming_order`: critical and mitigation apply after scaling, no duplicate

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/bosses/es5-damage-scaling.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Trace full path, reproduce raw attack.damage issue; scale at single authoritative boundary and add regression for legacy/faction paths. If already fixed at current HEAD, keep tests and document no code change.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/bosses/es5-damage-scaling.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "fix: ensure boss damage respects run modifiers once"`. No unrelated files.

### Task 2: BAL-02 sequential phase transition policy

**Files:** Modify `src/game/content/bosses/controller.ts`, `src/game/bosses/phases.ts`, `src/game/combat.ts`; new `src/game/content/bosses/es5-phase-overflow.test.ts`

**Interfaces:** Existing phaseFor and controller; hard-mode candidate phase queue preserves damage overflow; normal path unchanged.

- [ ] **Step 1 — RED: add named tests in `src/game/content/bosses/es5-phase-overflow.test.ts`**
  - `normal_burst`: D1 may skip phase; old death semantics remain
  - `hard_phase_order`: single burst crossing thresholds observes P2 then P3 once
  - `overflow_preserved`: total accepted damage is conserved, no double damage or reward
  - `death_pause_reset`: phase queue pauses and clears on death/new run; stale attack cancelled

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/bosses/es5-phase-overflow.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Agree precise bounded overflow policy before code (no prolonged immunity); serialize transitions and preserve actual damage; prevent callbacks from starting after teardown.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/bosses/es5-phase-overflow.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "fix: preserve boss phase transitions and burst damage"`. No unrelated files.

### Task 3: B01–B04 mythic definitions and attacks

**Files:** Modify `src/game/balance/bosses.json`, `src/game/content/bosses/definitions.ts`, `controller.ts`; new `src/game/content/bosses/es5-mythic.test.ts`

**Interfaces:** `BossForm = normal|mythic`; 12 attack IDs in spec, reuse controller shapes; form replaces base HP.

- [ ] **Step 1 — RED: add named tests in `src/game/content/bosses/es5-mythic.test.ts`**
  - `form_hp`: 3100,3300,4000,3600 before mode/tier; no double form multiplier
  - `twelve_mechanics`: 3 new IDs per boss; 25 old IDs remain
  - `safe_routes`: min simple1s/arena1.5s candidate; slowest base hero can reach safe route
  - `bounded_objects`: ≤2 altars/crystals, shields nonimmune; hazards/children clear on teardown
  - `oath_dependency`: A09 adds mechanics, A12 requires A09; no double enhancement

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/bosses/es5-mythic.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Implement per-boss mechanics from spec with original movement and actual geometry; phase recovery weakness candidate1.25–1.75s; use W02 actor budget. Validate remaining attack values via baseline and approval before shipping.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/bosses/es5-mythic.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add mythic boss encounter mechanics"`. No unrelated files.

### Task 4: BOSS presentation and end-to-end reward

**Files:** Modify `src/game/content/bosses/attack-presentation.ts`, `src/game/render/es2/`, `src/game/audio/boss-attacks.ts`, existing dossier and objective owner; new `src/game/content/bosses/es5-mythic-integration.test.ts`, `docs/es5/boss-art-manifest.md`

**Interfaces:** Each form/attack maps to original cue, authored art, warning/impact/collision; existing kill/receipt event.

- [ ] **Step 1 — RED: add named tests in `src/game/content/bosses/es5-mythic-integration.test.ts`**
  - `all_attack_presentations`: 25+12 IDs map warning and impact art/cue
  - `death_once`: one kill objective and reward; no lingering projectile or summon
  - `pause_and_resume`: phase music remains during skill selection; no stale cue on menu
  - `quality_parity`: same damage geometry at all quality levels and reduced motion

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/bosses/es5-mythic-integration.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Use approved original BOSS character identity and 3× WebP assets, existing PixiJS effects/audio owner; capture each attack and full battle in actual browser, physical mobile QA remains independent.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/bosses/es5-mythic-integration.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: integrate mythic boss presentation and settlement"`. No unrelated files.

## Wave acceptance / handoff

- [ ] All original 25 attacks regression-tested and 12 new mechanics validated; report phase TTK and fair geometry; no fake asset/CI approval.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
