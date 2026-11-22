# Content Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task; apply strict RED → GREEN → REFACTOR and review before completion.

**Goal:** Provide minimal, tested content extension points while preserving all current mechanics.

**Architecture:** One static content registry per Engine, immutable pack definitions and per-GameState mutable runtime; existing progression, combat, render and save flows remain the source of truth.
**Tech Stack:** Vue 3, TypeScript, Vite, pnpm, Vitest, Canvas 2D.
**Spec:** docs/superpowers/specs/2026-11-22-content-foundation-design.md

## Global Constraints
- Preserve 15 UP, 5 EVOLUTIONS, all old boss and victory rules, and Profile version 2.
- No new dependencies, frameworks, singleton mutable registry, rebuild-per-frame, or PR/merge.
- Namespace every ID and prevent duplicates across all pack categories.
- Every optional pack is independently importable/testable and safe to omit.
- Run all five verification commands; only claim success on observed exit code 0.

## Review Focus
- A previously killed mob struck twice must award experience/kill once; test via combat regression.
- A missing pack in a previously recorded save must preserve its namespaced discovered ability; test migration and reload.
- More than 96 FX or a nonfinite/long TTL must be rejected; test effect limits.
- A second run must have empty ability levels and cooldowns; test reset.
- No registered packs must preserve native upgrade flow and render safely; test empty registry and existing regression suite.

### Task 1 — Baseline and RED contracts
**Files:** src/game/content-foundation.test.ts, src/meta/content-profile.test.ts, .github/workflows/content-foundation.yml
**Interfaces:** createState(): GameState, resetRun(s), migrateProfile(raw).
- [x] Write tests first for per-run content runtime and namespaced v2 save.
- [x] Push the failing tests as the initial branch commit (a4e4489).
- [ ] Verify RED with the feature-only GitHub Actions workflow; investigate queued runner if needed.
- [ ] Verify original boss and legacy count assertions remain green.

### Task 2 — Content registration and isolation
**Files:** src/game/content/contracts.ts, registry.ts, packs/index.ts, registry.test.ts, src/game/types.ts, state.ts
**Interfaces:** createContentRegistry(packs?: readonly ContentPack[], rng?: () => number): ContentRegistry, isContentId(unknown): boolean.
- [x] Define typed registrable abilities/effects and optional enemy, stage, world-event metadata.
- [x] Copy/freeze pack definitions and validate globally unique namespace IDs.
- [x] Add per-run levels/cooldowns/FX; reset them on new run.
- [x] Add deterministic callbacks, cooldown tick and bounded effect drawing.
- [ ] Run new Vitest tests; review errors before next stage.

### Task 3 — Gameplay adapters, persistence and UI
**Files:** src/game/{progression,store,engine,step,combat,events,scene}.ts, src/game/render/index.ts, src/meta/profile.ts, src/game/content/integration.test.ts, src/App.vue, src/components/ContentShowcase.vue
**Interfaces:** pickUpgrades(hero,rng,registry,state), applyUpgrade(state,id,hooks,registry), equippedSkillHud(hero,registry,state), Engine.contentRegistry, Engine.showcaseGrant(id).
- [x] Extend rarity/eligibility only for registered optional content.
- [x] Route start/reset/scene/hit/kill/damage/pickup/completion events through existing hooks.
- [x] Preserve existing Hero skills, evolutions, combat and win rules.
- [x] Render optional short-lived Canvas FX and add development-only ?content-showcase=1.
- [x] Preserve namespaced IDs in existing v2 profile without requiring present packs.
- [ ] Run integration + entire regression suite; refactor any failing or redundant layers.

### Task 4 — Contract, verification and immutable handoff
**Files:** docs/content-pack-contract.md, this plan and spec.
- [x] Document exact public interfaces, ownership and ID rules.
- [ ] Execute pnpm install --frozen-lockfile; expected exit 0.
- [ ] Execute pnpm test; expected all tests pass.
- [ ] Execute pnpm typecheck; expected exit 0.
- [ ] Execute pnpm build; expected exit 0.
- [ ] Execute pnpm check-release; expected exit 0.
- [ ] Review full diff for correctness and unnecessary abstraction, then refactor and repeat checks.
- [ ] Commit final fixes, push ONLY feature/es-content-foundation; no PR or main merge.
- [ ] Record final SHA; parallel branches MUST all create branches from that exact SHA, not a moving branch.

## Review/verification ledger
Initial RED test commit: a4e4489225b6af3e35c6d662e332ac0bd59e264a.
Environment restriction: direct git clone and pnpm install are not possible in this chat's container; use the feature-only GitHub Actions runner as the authoritative full-check environment, and report queued/blocked checks accurately.
The checked boxes above indicate code/files authored, not a claim of passing tests. Mark validation complete only after reading CI output.
