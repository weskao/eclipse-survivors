# ES5 — Eclipse Ascension Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver dual-track play with full permanent growth, separate standardized Apex Trials and semi-open chapters, in staged testable releases.

**Architecture:** Keep one engine and authoritative balance/receipt/director pipeline. Wave 04 supplies immutable run configuration only when a Stage actually introduces difficulty; Wave 00 supplies measured evidence and Wave 08 continuously checks integration. Split work by file ownership and merge only on approval.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

## Global Constraints

- **Release-stage authority:** follow [release stages](../../es5/release-stages.md) for branch ownership, scope, prerequisite and independent delivery. Wave tasks are technical work packages; execute only the portion assigned to the active Stage. No future-stage scaffolding or unpublished content dependency.
- **Balance authority:** read `CLAUDE.md` and [existing balance rule](../../../.claude/rules/game-balance-config.md) before any numeric CRUD. Reuse existing `src/game/balance/*.json` domains first, register genuinely distinct new domains in `balance/index.ts`, extend `config.ts` typed validation and `balance.test.ts`; runtime reads typed `BALANCE`. Preserve existing Hall catalog ownership, public keys and save compatibility; any touched legacy tunable literal is migrated without changing value unless separately approved. No duplicated numeric owners, hot-path JSON parsing or unrelated extraction.
- **Evidence:** use paired seeds, legal fresh/legacy/early/mid/mature builds, same policy/mode/settings; record every changed JSON path/key, old/new/unit/percent (N/A for new or zero baseline), reason, actual measured result, RED/GREEN, exact SHA CI and manual QA under `docs/es5/evidence/stage-NN/`. Root TODO is the status authority; check only verified subtasks; release-ready, merged, published and production verified are separate. Follow actual `docs/release-process.md` and scoped CLAUDE rules; no automatic deploy.

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Re-fetch ES4 HEAD and verify scope acceptance; do not silently use stale snapshot.
- Build W04/W07 contracts only in the Stage that needs them; no conflicting parallel edits to engine/combat/profile.
- Candidate values must have paired evidence and approval; no balance regressions hidden by average.
- Standardized trials must not mutate actual player state or wallet; no untrusted global ranking.
- Manual art/audio/thermal and exact SHA CI remain separate gates.

---

## Phase 0 — preflight (G0)

- [ ] Owner reviews spec and plans, including proposed unlock rules, caps, point budgets, rewards, branch names and new world gates; record approval. Existing C/C/semi-open decisions already confirmed.
- [ ] Verify ES4 skill-tree runtime, migration, production rollout, current TODO and exact CI evidence. If unavailable, stop implementation (design allowed). `git fetch origin`; inspect `git rev-parse origin/feature/es4-adventurer-hall-skill-ecosystem`; record source SHA and any differences from `e561550c3473d175661d5c7d4552020c830a282f`.
- [ ] Obtain explicit authorization for ES5 branch. Then use superpowers:using-git-worktrees and create the active Stage branch from accepted origin/develop after authorized ES4 integration; no ES5 umbrella branch required. No PR, force push, merge into develop/main or write ES4. Use `git status --short` and `make verify`; record baseline and known art gates without weakening tests.
- [ ] Use existing root TODO.md Stage and Wave IDs; the proposed checklist is historical. Never append duplicates or mark planning as implementation.

## Release-stage execution order

The [release stage roadmap](../../es5/release-stages.md) supersedes the old A/B/C batch and long-lived ES5 integration branch strategy. Keep Wave 00–08 detailed technical tasks, but slice them by Stage 01–11. Every stage is independently releasable against accepted, authorized `develop`; only real prerequisites required. W08 continuous, W07 receipt/reward work only when a stage needs it. No mandatory W04 skeleton before Stage 01. Build the first playable slice before expanding new content. Stage 01 plan: [combat balance](2026-11-28-es5-stage-01-combat-balance.md).

- [ ] G0 ES4 runtime, migration, CI, manual gates and owner-authorized integration/rollout satisfied.
- [ ] Each applicable Stage meets the release-ready gate in the roadmap.
- [ ] Integration and publication only after separate authorization and exact-SHA verification.
- [ ] W00–08 aggregate checks are marked complete only once every required slice and gate has evidence.

## Evidence and handoff

Every task uses RED→GREEN→REFACTOR and scoped commit. Evidence row `ID | SHA | RED | GREEN | paired report | CI | device/art/audio | blocker/status`. A named test assertion in these plans is a contract for Vitest, not prewritten working code. Executor uses existing fixtures/harness and records real RED; no implementation or test runs occurred during plan creation.

Review focus covered in W00 T1/T2, W04 T1/T2/T3, W07 T1/T2/T4, W05 T3/T4 and W08 T1–T4. All spec requirements mapped to a Wave; W06 new world detailed geometry/values/art, numerical approvals and public ranking trust are deliberately gated and not implementation-ready. Review exact paths and interfaces against execution HEAD before editing. If drift changes a contract, revise plan with owner approval instead of guessing.
