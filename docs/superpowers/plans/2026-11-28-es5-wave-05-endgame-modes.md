# ES5 Wave 05 — Endgame Modes & Apex Trials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend existing objectives and introduce independent standardized challenges without modifying real progression.

**Architecture:** Reuse objective evaluator/director, shared mode UI and immutable RunConfig; Apex snapshots isolated from Hall and wallet.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, existing Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

**Branch:** active Stage branch in [release stages](../../es5/release-stages.md); legacy Wave branch names are superseded for execution.

**Dependencies:** G0 and only the prerequisites of the assigned Release Stage; task-specific interfaces apply when that feature is actually delivered. See release-stages.md. W00 paired evidence precedes tuning.

## Global Constraints

- **Release-stage authority:** follow [release stages](../../es5/release-stages.md) for branch ownership, scope, prerequisite and independent delivery. Wave tasks are technical work packages; execute only the portion assigned to the active Stage. No future-stage scaffolding or unpublished content dependency.
- **Balance authority:** read `CLAUDE.md` and [existing balance rule](../../../.claude/rules/game-balance-config.md) before any numeric CRUD. Reuse existing `src/game/balance/*.json` domains first, register genuinely distinct new domains in `balance/index.ts`, extend `config.ts` typed validation and `balance.test.ts`; runtime reads typed `BALANCE`. Preserve existing Hall catalog ownership, public keys and save compatibility; any touched legacy tunable literal is migrated without changing value unless separately approved. No duplicated numeric owners, hot-path JSON parsing or unrelated extraction.
- **Evidence:** use paired seeds, legal fresh/legacy/early/mid/mature builds, same policy/mode/settings; record every changed JSON path/key, old/new/unit/percent (N/A for new or zero baseline), reason, actual measured result, RED/GREEN, exact SHA CI and manual QA under `docs/es5/evidence/stage-NN/`. Root TODO is the status authority; check only verified subtasks; release-ready, merged, published and production verified are separate. Follow actual `docs/release-process.md` and scoped CLAUDE rules; no automatic deploy.
- **Numeric scope:** Stage 06 hero trials + Build Lab, Stage 08 endgame modes, Stage 09 Apex/daily. modes.json owns shared mode defaults, meta.json rewards, events.json event weights, encounters.json only if admitted. hero-trials.json and apex-trials.json are conditional candidates: separate only for genuinely distinct lifecycle and rule sets, otherwise extend modes.json. No paid Lab progression or unverified public ranking.

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Trial loadout with foreign or illegal ranks (T3).
- Untrusted client scores or offline clocks (T4).
- Boss overlap, endless repeat claims (T2).
- Trial/build lab writes to actual wallet/profile (T3,T4).
- Role event farming and impossible timer (T1).

---

### Task 1: M01 Hero Trials

**Files:** Modify `src/game/content/modes/definitions.ts`, `src/game/content/objectives/runtime.ts`, `evaluator.ts`; new `src/game/content/objectives/es5-hero-trials.test.ts`

**Interfaces:** `HeroTrialId` stable hero+tier; `evaluateTrial(event,state):TrialStars` three independent clear/role/time predicates.

- [ ] **Step 1 — RED: add named tests in `src/game/content/objectives/es5-hero-trials.test.ts`**
  - `six_first_trials`: 6 hero-specific Tier1; eventual 18, no foreign hero start
  - `stars_independent`: clear/role/time stars separately recorded; 180s initial timer candidate
  - `role_event_genuine`: 15 candidate real counters/weakpoint/area/ambush/summon/absorb, no idle farming
  - `receipt_once`: failed/duplicate run cannot reissue first clear

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/objectives/es5-hero-trials.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Use actual telemetry events and objective system, define role goal per hero based on W01 results; ship first six, then II/III after measurements; rewards use W07, no combat-power exclusive prize.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/objectives/es5-hero-trials.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add hero-specific trial objectives"`. No unrelated files.

### Task 2: M02 Mythic Rush and M03 Endless Abyss

**Files:** Modify `src/game/content/modes/definitions.ts`, `src/game/content/director/index.ts`, `src/game/content/objectives/runtime.ts`, `src/game/balance/modes.json`; new `src/game/content/objectives/es5-endgame.test.ts`

**Interfaces:** Explicit new variant objective IDs; `describeEndlessEpoch(seconds):EpochRule`; milestone receipt stable ID.

- [ ] **Step 1 — RED: add named tests in `src/game/content/objectives/es5-endgame.test.ts`**
  - `original_rush`: original five boss readiness gates unchanged
  - `mythic_rush`: four named mythic bosses in order, actual kills advance, no overlap, candidate480s
  - `intermission`: one choice heal20% missing HP or upgrade or relic, not all
  - `endless_epochs`: 0/180/360/540/720/900 boundaries select correct stages, no exponential unbounded escalation
  - `milestone_once`: repeat/retry cannot award twice; capped actors and cleanup

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/objectives/es5-endgame.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Extend director with explicit readiness/kill state; preserve existing objective semantics and retry; use W03 mechanics/W02 budget, deterministic compatible rules and recovery.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/objectives/es5-endgame.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: extend boss rush and endless objectives"`. No unrelated files.

### Task 3: M05 Apex standardized loadout and M07 Build Lab

**Files:** New `src/game/content/difficulty/apex.ts`, `apex.test.ts`; modify `src/game/content/meta/hall-state.ts` only if reusable validator needed; `src/game/engine.ts` composition, shared Hall UI

**Interfaces:** `validateApexLoadout(hero,ranks,attunement,budget):Validation`; `createApexSnapshot(rule,loadout):HallRunSnapshot`; virtual point=rank, 15/30/50 candidate, fixed preset option; `RunKind=normal|hero-trial|apex|lab`.

- [ ] **Step 1 — RED: add named tests in `src/game/content/difficulty/apex.test.ts`**
  - `budget`: reject >15/30/50, negative/fraction/unknown ranks; legal unused allowed
  - `prerequisites`: DAG, legacy points/preset, only matching hero, slots2+1+1 and resonance match
  - `equal_access`: same preset/budget available to fresh and mature without purchases
  - `immutability`: owned Hall and actual wallet unchanged before/after; lab no XP/mastery/discovery/embers
  - `fixed_trial`: AT02/03 fixed preset cannot be mutated during battle

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/difficulty/apex.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Build isolated immutable snapshot using catalog validation not wallet purchases; AT01 fair flexible, AT02 hero, AT03 mythic fixed, AT04 daily fixed. Build Lab separate local sandbox and target controls; no actual settlement, no public leaderboard claim.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/difficulty/apex.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: isolate apex and build-lab loadouts"`. No unrelated files.

### Task 4: M04 Daily / M06 Chaos Rotation / records UI

**Files:** New `src/game/content/difficulty/trials.ts`, `trials.test.ts`; existing mode chooser, result, i18n; W07 record store

**Interfaces:** `dailyRules(utcDate,ruleVersion):TrialRules`; `trialRecordKey(rule,hero,loadoutHash,buildVersion):string`; `describeChaosRotation(time,seed)` candidate60s.

- [ ] **Step 1 — RED: add named tests in `src/game/content/difficulty/trials.test.ts`**
  - `utc_boundary`: same UTC date/version deterministic, next day distinct; local TZ not key
  - `record_partition`: different rules/build/hero categories not compared
  - `chaos_preview`: compatible changes announced before 60s boundary; no loadout mutation
  - `no_client_global`: no trusted global leaderboard from client scores
  - `menu_access`: locked/incompatible explanation and touch/keyboard controls

- [ ] **Step 2 — Run focused RED**: `pnpm exec vitest run src/game/content/difficulty/trials.test.ts`. Record exact failing assertions; an already-passing regression case is retained but not represented as RED. Establish a meaningful failing case for new behavior before implementation.
- [ ] **Step 3 — Minimal implementation:** Keep daily challenge offline-capable personal record; public ranking only after backend trust design approval. Separate AT categories and reward policies, display seed/rule/version and UTC reset. Provide mode result UI and browser QA.
- [ ] **Step 4 — GREEN / REFACTOR:** `pnpm exec vitest run src/game/content/difficulty/trials.test.ts`; require exit 0 and all named cases passing. Refactor only within the owning module; rerun focused tests, then `pnpm typecheck` (exit 0). Capture logs and any QA artifact in the evidence ledger.
- [ ] **Step 5 — Commit:** `git add -- <reviewed task files>` (substitute exact paths listed above; inspect `git diff --cached`), then `git commit -m "feat: add deterministic trial rotations and personal records"`. No unrelated files.

## Wave acceptance / handoff

- [ ] Core M01/02/03/07 accepted first; AT01–04/M04/05/06 staged and validated. Apex is genuinely isolated, fairness scope disclosed; public leaderboard not shipped without trust gate.
- [ ] Run `make verify`; record exact command status and latest-SHA CI if authorized to push. Capture unresolved manual, asset, data or runtime gates; do not mark the Wave complete unless required gates pass.
- [ ] Update ES5 section of TODO.md only for evidenced tasks; include baseline and candidate SHA, paired results, flags and open issues. Review spec coverage, named tests, type consistency and dependency contracts before requesting integration.
