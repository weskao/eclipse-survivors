# ES5 — Eclipse Ascension Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver dual-track play with full permanent growth, separate standardized Apex Trials and semi-open chapters, in staged testable releases.

**Architecture:** Keep one engine and authoritative balance/receipt/director pipeline. Wave 04 supplies immutable run configuration to the other waves; Wave 00 supplies measured evidence and Wave 08 continuously checks integration. Split work by file ownership and merge only on approval.

**Tech Stack:** Node 24, pnpm 11.22.0, Vue 3, TypeScript, Vite, Vitest, Canvas 2D/PixiJS 8.

**Spec:** [../specs/2026-11-28-es5-eclipse-ascension-design.md](../specs/2026-11-28-es5-eclipse-ascension-design.md)

## Global Constraints

- Read the linked spec, current `CLAUDE.md`, `TODO.md`, `docs/es4/deferred-endgame-scope.md` and applicable `.claude/rules`; re-fetch source HEAD and reconcile drift. Paths marked new are proposals, existing paths verified against the reviewed tree or to be confirmed before edit.
- ES4 acceptance and explicit ES5 branch authorization precede implementation. Do not change ES4, develop/main, merge, deploy, open PR or force push without authorization. No personal paths or secrets.
- Dual tracks apply legitimate owned ranks and attuned keystones; standardized Apex uses an isolated snapshot. No hidden power scaling, mandatory build, or quality-dependent mechanics.
- Numeric candidates in spec are not approved balance. Establish paired baseline and owner approval before tuning; do not infer human win rates from bots. Keep source/receipt/actor budgets and original rules with feature off.
- Node 24, pnpm 11.22.0, TypeScript/Vue 3/Vite/Vitest; reuse engine/Canvas and existing PixiJS/audio owners; no new dependencies without justification. Use stable IDs, zh-TW/en, mobile/desktop a11y, 3× WebP and existing asset contracts.
- Observe RED, GREEN, REFACTOR and targeted test output for each task, then `make verify`; record exact SHA, CI status, visual/audio/physical device gates separately. Never weaken tests or claim unrun tests passed. Commit each task with scoped files; do not push without authorization.

## Review Focus

- Re-fetch ES4 HEAD and verify scope acceptance; do not silently use stale snapshot.
- W04 T1 and W07 T1/T2 contracts precede dependent integration; no conflicting parallel edits to engine/combat/profile.
- Candidate values must have paired evidence and approval; no balance regressions hidden by average.
- Standardized trials must not mutate actual player state or wallet; no untrusted global ranking.
- Manual art/audio/thermal and exact SHA CI remain separate gates.

---

## Phase 0 — preflight (G0)

- [ ] Owner reviews spec and plans, including proposed unlock rules, caps, point budgets, rewards, branch names and new world gates; record approval. Existing C/C/semi-open decisions already confirmed.
- [ ] Verify ES4 skill-tree runtime, migration, production rollout, current TODO and exact CI evidence. If unavailable, stop implementation (design allowed). `git fetch origin`; inspect `git rev-parse origin/feature/es4-adventurer-hall-skill-ecosystem`; record source SHA and any differences from `e561550c3473d175661d5c7d4552020c830a282f`.
- [ ] Obtain explicit authorization for ES5 branch. Then use superpowers:using-git-worktrees, create isolated branch `feature/es5-world-balance-endgame` from accepted ES4 commit. No PR, force push, merge into develop/main or write ES4. Use `git status --short` and `make verify`; record baseline and known art gates without weakening tests.
- [ ] Append candidate `docs/es5/TODO-es5-proposed.md` to existing TODO.md only after approval; never replace existing TODO or mark planning as implemented. Commit docs only if requested.

## Dependency and delivery sequence

| Order | Wave | Branch (proposed) | Deliverable | Dependency |
|---|---|---|---|---|
| 1 | [00](2026-11-28-es5-wave-00-balance-foundation.md) | `feature/es5-00-balance-foundation` | Baseline and reports | G0 |
| 2 | [01](2026-11-28-es5-wave-01-hero-talent-balance.md) | `feature/es5-01-hero-talent-balance` | Six heroes, 77 nodes, Q | 00 |
| 3 | [02](2026-11-28-es5-wave-02-monster-ecology.md) | `feature/es5-02-monster-ecology` | E01–10, EL01–08, EN01–08 | 00, 04 T1 |
| 4 | [03](2026-11-28-es5-wave-03-boss-evolution.md) | `feature/es5-03-boss-evolution` | BAL-01/02, B01–04 | 00, 04 T1, 02 contract |
| 5 | [04](2026-11-28-es5-wave-04-difficulty-oaths.md) | `feature/es5-04-difficulty-oaths` | D0–5, A01–12 | T1 early; full after 02/03, 07 receipt |
| 6 | [05](2026-11-28-es5-wave-05-endgame-modes.md) | `feature/es5-05-endgame-modes` | M01–07, AT01–04 | 03/04, 07 receipt |
| 7 | [06](2026-11-28-es5-wave-06-world-expansion.md) | `feature/es5-06-world-expansion` | Semi-open, III/IV, B05/06 | Release B, 07 receipt, owner art/mechanic specs |
| 8 | [07](2026-11-28-es5-wave-07-progression-economy.md) | `feature/es5-07-progression-economy` | Receipts, rewards, cosmetics/records | T1/T2 early after 00, T3/T4 after mode rules |
| 9 | [08](2026-11-28-es5-wave-08-release-readiness.md) | `feature/es5-08-release-readiness` | QA01–15, evidence | Continuous |

Execution order: W00 → W04 T1 config skeleton + W07 T1/T2 receipt contract (coordinate shared engine/profile changes) → W01/W02/W03 sequential where overlapping → W04 T2–T4 → A QA → W05/W07 rest → B QA → W06 III then IV → C QA. W08 runs continuously. Subagent-driven preferred due to shared engine and many independent review gates; use native serial if no subagent tool. No parallel edit of shared files without explicit ownership. Integrate into ES5 only after per-wave review and user-authorized merge strategy.

## Release gates

- [ ] A: W00–04, W07 receipt contract, W08 applicable gates; D1 baseline and dual-track playable. Oaths/tiers only with approved tuning.
- [ ] B: M01/M02/M03/M07 core, then Apex/daily/chaos staged, W07 economy/cosmetic/local record, W08. Public ranking independent trust gate.
- [ ] C: Chapter III and B05 accepted before IV/B06; W06 detailed design/asset approval and W08 per release. No placeholder release.
- [ ] Use `make verify`; `VITE_ES5_ASCENSION=0 make build` and approved enabled build. Exact SHA CI and actual device/art/audio evidence. Do not mark stale/cancelled or manual-unverified checks passed.

## Evidence and handoff

Every task uses RED→GREEN→REFACTOR and scoped commit. Evidence row `ID | SHA | RED | GREEN | paired report | CI | device/art/audio | blocker/status`. A named test assertion in these plans is a contract for Vitest, not prewritten working code. Executor uses existing fixtures/harness and records real RED; no implementation or test runs occurred during plan creation.

Review focus covered in W00 T1/T2, W04 T1/T2/T3, W07 T1/T2/T4, W05 T3/T4 and W08 T1–T4. All spec requirements mapped to a Wave; W06 new world detailed geometry/values/art, numerical approvals and public ranking trust are deliberately gated and not implementation-ready. Review exact paths and interfaces against execution HEAD before editing. If drift changes a contract, revise plan with owner approval instead of guessing.
