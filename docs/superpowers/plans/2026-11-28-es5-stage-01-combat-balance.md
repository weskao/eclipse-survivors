# ES5 Stage 01 — Combat Balance & Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone existing-content combat-quality update, measuring ES4 permanent growth and fixing reproduced defects without future ES5 features.

**Architecture:** Reuse the existing engine, seeded director, combat telemetry, Hall runtime and typed BALANCE. Reuse domain JSON and current test harness; no new runtime config domain or general framework for Stage 01.

**Tech Stack:** Vue 3, TypeScript, Vite, Node 24, pnpm, Vitest, Canvas 2D, existing PixiJS/audio owners.

**Spec:** [ES5 design](../specs/2026-11-28-es5-eclipse-ascension-design.md); [release stages](../../es5/release-stages.md).

**Branch:** `feature/es5-stage-01-combat-balance` from accepted origin/develop only after G0.

## Global Constraints

- **Release-stage authority:** follow [release stages](../../es5/release-stages.md) for branch ownership, scope, prerequisite and independent delivery. Wave tasks are technical work packages; execute only the portion assigned to the active Stage. No future-stage scaffolding or unpublished content dependency.
- **Balance authority:** read `CLAUDE.md` and [existing balance rule](../../../.claude/rules/game-balance-config.md) before any numeric CRUD. Reuse existing `src/game/balance/*.json` domains first, register genuinely distinct new domains in `balance/index.ts`, extend `config.ts` typed validation and `balance.test.ts`; runtime reads typed `BALANCE`. Preserve existing Hall catalog ownership, public keys and save compatibility; any touched legacy tunable literal is migrated without changing value unless separately approved. No duplicated numeric owners, hot-path JSON parsing or unrelated extraction.
- **Evidence:** use paired seeds, legal fresh/legacy/early/mid/mature builds, same policy/mode/settings; record every changed JSON path/key, old/new/unit/percent (N/A for new or zero baseline), reason, actual measured result, RED/GREEN, exact SHA CI and manual QA under `docs/es5/evidence/stage-NN/`. Root TODO is the status authority; check only verified subtasks; release-ready, merged, published and production verified are separate. Follow actual `docs/release-process.md` and scoped CLAUDE rules; no automatic deploy.
- Scope: existing six heroes, 77 nodes/289 ranks, nine modes, existing enemies and legacy/four ES2 bosses; no future variants, new difficulty or mode, Mythic or new art. Preserve all legal permanent effects, original save contracts and ordinary boss burst skips. Numerical candidates require paired evidence and owner approval; verified defects may be corrected.
- Read CLAUDE.md and owning rules before work, including game-balance-config, game-feel, realtime-performance, rendering-budget, ui-audio, ui-responsive-layout, bilingual-copy, unlock-separation and relevant skills. No new assets required; if a real regression needs one follow original asset/QA rules or leave gate open.
- Follow release-process.md; version/changelog coordinated with actual release, no auto merge/deploy. Record exact HEAD and all manual blockers. No future-stage dependency.

## Review Focus

- S01-04: wrong-hero, unattuned, disabled or migrated Hall effects.
- S01-05: proc recursion, duplicate crit/scaling, heal at full HP, self-cost nonlethal, shield/DR order.
- S01-08: same mode damage once across all attack paths, ordinary burst phase skips and cleanup.
- S01-10: config JSON equality, enum keys, finite ranges/weights/caps and bilingual display parity; extraction-only value parity.
- S01-12/14: actual phone orientation, audio continuity, stale/cancelled CI, inaccessible hardware.

### S01-00 — Preflight

**Files/owners:** CLAUDE.md, TODO.md, docs/es4/deferred-endgame-scope.md, docs/release-process.md (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Verify accepted ES4 final SHA ancestry of develop, runtime/save/wallet/rollout and all gates. Read latest rules; record baseline; create target branch only after G0.
**Acceptance:** G0 accepted and ancestor check exits 0; no write before gate.

- [ ] Capture actual prerequisite/measurement/verification evidence; if a defect is found, write a focused failing regression first and follow RED → GREEN → REFACTOR before changing source.
- [ ] Record commands, results and limitations in evidence ledger; mark only verified task complete.

### S01-01 — Combat baseline

**Files/owners:** src/game/balance/*.json, src/game/balance/index.ts, src/game/config.ts, src/game/combat-telemetry.ts (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Inventory 15 JSON/catalog domains; measure six heroes × five legal investment states × existing modes; record baseline config SHA/hash and telemetry.
**Acceptance:** legal fixtures and repeatable baseline; no gameplay mutation.

- [ ] Capture actual prerequisite/measurement/verification evidence; if a defect is found, write a focused failing regression first and follow RED → GREEN → REFACTOR before changing source.
- [ ] Record commands, results and limitations in evidence ledger; mark only verified task complete.

### S01-02 — Deterministic simulation

**Files/owners:** existing seeded simulation/engine tests; Wave 00 harness and reports (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Reuse engine/harness; fixed seed/step/policy, smoke and 8,100 screening matrix (6×5×9×3×10), endless 15-min horizon; record actual coverage/censored runs; do not claim unrun matrix.
**Acceptance:** same seed/policy/config/step produces same simulation hash; horizon separate.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-03 — Hero active skills

**Files/owners:** src/game/content/heroes/classic-active.ts, src/game/content/heroes/index.ts, src/game/balance/heroes.json (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Verify six Q damage, CD, range, targets, hit parity, rejection/reset, animation/SFX; preserve original CD initially.
**Acceptance:** all six Q contracts; reject paused/dead; distinct target cap and hit parity.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-04 — Permanent talent audit

**Files/owners:** src/game/content/meta/hall-state.ts, hall-runtime.ts, hall-talents.ts; hall-talents.json, hall-effect-tuning.json, meta.json (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Audit 77 nodes/289 ranks, all effects and prerequisites, 2+1+1 attunement, actual UI/runtime parity, legacy/disabled path; preserve legitimate investment.
**Acceptance:** catalog 77/289; wrong hero/unowned/unattuned/disabled ineffective; all rank boundaries.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-05 — Combat calculation

**Files/owners:** src/game/combat.ts and existing source-aware owners; combat.json, skills.json, hall-effect-tuning.json (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Reproduce and fix source attribution, crit, DR, heal, shield, invulnerability, cooldown, proc recursion, summon interactions, duplicate multipliers.
**Acceptance:** proc no recursion; critical once; nonlethal cost; capped shield; no duplicate scale.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-06 — Existing build balance

**Files/owners:** weapons.json, skills.json, evolutions.json, relics.json and existing consumers (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Measure weapon, skill, evolution, relic, contract, hero role and interaction viability; maintain build choice.
**Acceptance:** approved matched seed comparison by role and rarity; no empty or invalid choices.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-07 — Existing monster balance

**Files/owners:** enemies.json, modes.json, spawn.ts, content/director/index.ts and faction owner (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Legacy and faction HP/ATK/speed/attack/recovery/telegraph/spawn/elite/wave pressure; no new identities, affixes or encounters.
**Acceptance:** finite stats, weight totals, cap 130, original IDs, seeded schedule/retry.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-08 — Existing boss balance

**Files/owners:** bosses.json, modes.json, content/bosses/controller.ts, combat.ts (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Audit BAL-01 exactly-once mode damage for contact/projectile/area/summon and BAL-02 phase correctness; preserve normal burst skip; legacy + four existing bosses, no mythic.
**Acceptance:** mode scaling exactly once across paths; ordinary burst can skip; dead boss settles once.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-09 — Progression and economy

**Files/owners:** progression.json, meta.json, hall-talents.json and existing receipt/cost owners (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Measure XP/first upgrade/curve, cost and embers/min including losses; no unapproved cost/reward/schema/currency changes.
**Acceptance:** actual positive healing/reward events; idempotent receipt and no save changes; measured embers/min.

- [ ] Capture actual prerequisite/measurement/verification evidence; if a defect is found, write a focused failing regression first and follow RED → GREEN → REFACTOR before changing source.
- [ ] Record commands, results and limitations in evidence ledger; mark only verified task complete.

### S01-10 — Balance configuration & reports

**Files/owners:** src/game/balance/index.ts, src/game/config.ts, src/game/balance.test.ts, affected domain JSON and UI consumers (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Identify owner per tunable field; existing JSON only as needed; register/typed validation for touched domains, guard tests, same-seed paired report; approved tuning only.
**Acceptance:** domain JSON equality with BALANCE, complete keys, finite bounds, extraction values equal, UI matches config; N/A for zero/new deltas.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-11 — Full regression

**Files/owners:** existing test suites, Makefile (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Run focused RED/GREEN/refactor per change, balance.test.ts, make verify and all applicable regressions. Record commands and actual results.
**Acceptance:** make verify exits 0; no weakening/skips to hide failures.

- [ ] Add focused Vitest guard(s) for the acceptance above using authoritative config and real engine paths; run `pnpm exec vitest run <focused-test-path>` (replace placeholder with actual existing/new test path) and record expected RED for a reproduced defect/new rule, not fabricated failure for an already-passing audit.
- [ ] Implement smallest proven fix or approved numeric change in owning source/JSON; no new domain for Stage 01. Preserve old values for extraction-only moves.
- [ ] Rerun focused tests, `pnpm exec vitest run src/game/balance.test.ts` where numeric, refactor, rerun and record exit 0.
- [ ] Commit green scoped changes and update linked evidence; retain audit-only result if no defect.

### S01-12 — Browser/device QA

**Files/owners:** existing browser QA skills/tests and actual hardware evidence (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Real player path, both locales, desktop/tablet/foldable/phone portrait+landscape, numeric UI parity, music continuity, performance and applicable art/device manual gates.
**Acceptance:** real player flow screenshots, audio uninterrupted, both locales and device classes; unavailable gate remains open.

- [ ] Capture actual prerequisite/measurement/verification evidence; if a defect is found, write a focused failing regression first and follow RED → GREEN → REFACTOR before changing source.
- [ ] Record commands, results and limitations in evidence ledger; mark only verified task complete.

### S01-13 — Documentation and changelog

**Files/owners:** TODO.md, matching Wave plans, docs/es5/evidence/stage-01/, CHANGELOG.md as applicable (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Update root TODO IDs, Wave steps and Master references with evidence, bilingual player-visible changelog per release-process; version only coordinated with actual authorized release.
**Acceptance:** all checked IDs have actual evidence, unchanged incomplete tasks, no release claim.

- [ ] Capture actual prerequisite/measurement/verification evidence; if a defect is found, write a focused failing regression first and follow RED → GREEN → REFACTOR before changing source.
- [ ] Record commands, results and limitations in evidence ledger; mark only verified task complete.

### S01-14 — Exact HEAD CI

**Files/owners:** GitHub Actions, evidence ledger (verify exact paths and existing tests at execution HEAD; no unrelated edits).
**Requirement:** Commit/push only target, check every applicable workflow at exact HEAD; canceled/stale not pass; record blockers and separate Release-ready/Published gates.
**Acceptance:** exact HEAD all applicable CI success, manual gates separately accepted.

- [ ] Capture actual prerequisite/measurement/verification evidence; if a defect is found, write a focused failing regression first and follow RED → GREEN → REFACTOR before changing source.
- [ ] Record commands, results and limitations in evidence ledger; mark only verified task complete.

## Release acceptance

- [ ] All S01 required tasks accepted; if an optional candidate Buff/Nerf is not approved, record it as deferred rather than implemented and do not block proven correctness fixes.
- [ ] Applicable full tests, typecheck, build, check-release, make verify and exact SHA CI, actual desktop/mobile QA and manual gates accepted.
- [ ] Release-ready independent of S02–11, existing saves safe and no future placeholders.
- [ ] Merged into develop (separate authorization).
- [ ] Published (separate authorization, latest published version rule).
- [ ] Production verification with actual deployed SHA, tag and public gameplay.

Keep status in root TODO; this plan's step evidence is detailed, not an alternative release tracker. No release or implementation occurred during planning.
