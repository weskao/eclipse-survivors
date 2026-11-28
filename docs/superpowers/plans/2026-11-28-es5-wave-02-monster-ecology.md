# ES5 Wave 02 — Monster Ecology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide ten variants, eight elite affixes and eight deterministic encounter patterns.

**Architecture:** Reuse faction registry/AI and existing 130-slot director. Variants substitute eligible spawns; threat points govern composition without increasing actor cap.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch (proposed):** `feature/es5-02-monster-ecology`

**Dependencies:** W00 baseline; W04 immutable difficulty contract (skeleton); W01 role assumptions reviewed.

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Spawn reservations and boss summons share cap (T3).
- Support buffs stacking and no-op affix combos (T2).
- No safe route in combined hazards (T2,T3).
- Legacy modes/D1 variants absent (T1,T3).
- Faction damage, art/discovery and mobile tells (T1,T4).

---

### Task 1: E01–E10 variant definitions and runtime

**Files:** Modify `src/game/balance/enemies.json`, `src/game/content/enemies/definitions.ts`, `runtime.ts`, `integration.ts`; new `src/game/content/enemies/es5-variants.test.ts`

**Interfaces:** New stable variant ID union, `resolveVariant(baseId, seed, advancedShare)`; authoritative existing faction damage and lifecycle.

- [ ] **Step 1 — RED: add named tests in `src/game/content/enemies/es5-variants.test.ts`**
  - `ten_stats`: HP [82,120,68,105,200,58,52,78,150,190], ATK [18,7,14,8,22,15,16,12,22,26] per spec candidate
  - `no_variant_d1`: share0 returns base, seeded deterministic selection
  - `readable_tells`: each attack warning matches hit geometry and original/approved minimum tell
  - `counter_no_immunity`: shield frontal/recovery, supports bounded; all six heroes can damage
  - `death_cleanup`: no lingering invalid attack after actor death/teardown

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/enemies/es5-variants.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Implement each variant in existing behavior owner; first candidates preserve base speeds/ranges; shield3 targets, 10%/3s/8s, frontal DR25%/2s/6s, slow15%/2s, bomb1s tell. Remaining geometry per original and owner review.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/enemies/es5-variants.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add gated faction enemy variants"`. No unrelated files.

### Task 2: EL01–EL08 elite compatibility

**Files:** Modify `src/game/balance/enemies.json`, `src/game/content/enemies/runtime.ts`, `integration.ts`; new `src/game/content/enemies/es5-affixes.test.ts`

**Interfaces:** `selectEliteAffixes(seed, tier, baseId):readonly EliteAffixId[]`; validates compatible unique IDs and max count.

- [ ] **Step 1 — RED: add named tests in `src/game/content/enemies/es5-affixes.test.ts`**
  - `tier_caps`: D0/1=0 D2/3≤1 D4/5≤2
  - `base_multiplier_once`: legacy ×1.7 HP ×1.35 ATK exactly once
  - `no_stacked_control`: prohibited combos and shield overlap rejected
  - `revenge_once`: death burst once, no recursive death triggers
  - `affix_expiry`: reset on death/pause teardown, no permanent speed boost

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/enemies/es5-affixes.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Use existing elite definition/selection, add eight bounded affix effects and metadata, candidate speed +10%/2s/8s, fury +15% below40%, slow10%/2s, quake and revenge min1s warning.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/enemies/es5-affixes.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add bounded elite affixes"`. No unrelated files.

### Task 3: EN01–EN08 threat director

**Files:** Modify `src/game/content/director/index.ts`, `adapter.ts` (confirm exact file from tree), `src/game/spawn.ts`; new `src/game/content/director/es5-encounters.test.ts` and proposed `src/game/balance/encounters.json`

**Interfaces:** `allocateEncounter(seed, budget, availableSlots, tier):SpawnRequest[]`; existing retry/reservation contract unchanged.

- [ ] **Step 1 — RED: add named tests in `src/game/content/director/es5-encounters.test.ts`**
  - `budget_example`: 4 heavies×5+4 ranged×3+2 supports×4=40
  - `actor_cap`: active+pending+new ≤130 across faction/legacy/boss/summon
  - `repeat_seed`: same inputs same request sequence
  - `d1_director_parity`: legacy pattern, cadence and composition same with no ES5 changes
  - `safe_spawn_retry`: blocked reservation retried without duplicate encounter count

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/director/es5-encounters.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Encode eight patterns from spec and bounded per-pulse schedules; replace not append variants; alternate high-pressure and recovery, no impossible zone combination. Use existing director not parallel spawn loop.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/director/es5-encounters.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add deterministic threat-budget encounters"`. No unrelated files.

### Task 4: Variant visual/audio and dossier

**Files:** Modify existing `src/game/content/enemies/`, `src/game/render/es2/`, shared dossier owner; new `src/game/content/enemies/es5-variant-presentation.test.ts`, `docs/es5/monster-art-manifest.md`

**Interfaces:** Each variant stable ID maps to canonical art, cue and bilingual metadata; shared details surface.

- [ ] **Step 1 — RED: add named tests in `src/game/content/enemies/es5-variant-presentation.test.ts`**
  - `all_variants_resolve`: 10 IDs resolve art/cue/tell; no unrelated fallback
  - `discovery_isolated`: base discovery does not reveal unearned variant unless approved
  - `quality_collision_parity`: same collision/damage all quality levels
  - `reduce_motion`: reduced visual effect retains readable tells

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/enemies/es5-variant-presentation.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Reuse identity-preserving approved 3× assets; author distinct telegraph and impact, per-ID manifest, actual browser/device screenshots and audio; no color-only substitute when identity requires art.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/enemies/es5-variant-presentation.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: wire enemy variant presentation"`. No unrelated files.

## Wave acceptance / handoff

- [ ] Ten variants, eight affixes and eight patterns tested with actual visual evidence, bounded actor budgets, fair safe path for slowest hero; no new features in D1 baseline.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
