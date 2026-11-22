# Weapon Arsenal Implementation Plan — 2026-11-22

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans, test-driven-development, requesting-code-review, and verification-before-completion. Each step below must be evidenced by an actual command result; authored files alone are not proof of passing tests.

**Goal:** Introduce twelve independently functioning, upgradeable weapons to the optional Eclipse Survivors content-pack registry.

**Architecture:** One immutable `WEAPONS_PACK` exporting twelve continuous-tick abilities. One per-run, weakly keyed runtime owns all active projectiles, zones, summons and timed visuals; `hit` is the sole damage/reward entry point. The integration-owned manifest remains untouched.

**Tech Stack:** Vue 3, TypeScript, Canvas 2D, pnpm 11, Vitest.

**Spec:** `docs/weapon-arsenal.md`; user-provided 12-weapon specification and Foundation contract at SHA `9fd59c85e355909a6973cf93c116b8de5f9ca0df`.

## Global Constraints

- Branch only from exact Foundation SHA, not moving `main`.
- No modifications to ContentPack, ContentRegistry, GameState, combat or integration-owned manifest.
- No dependencies, no new global gameplay state, no uncontrolled arrays.
- Five levels per weapon and compatibility with knight, ranger and wizard.
- No `Math.random` in the pack; rely on injected `context.random`.
- No PR, deployment or merge.

## Review Focus

- Projectile tunneling and multi-pierce on long frames.
- Once-only kill/XP rewards for simultaneous attacks.
- Reset releases all references and timers, including companions.
- No drop in boss combat readability or existing winning rules.
- Stable resources with all twelve weapons and 130 monsters active.

### Task 1 — RED: Capture behavior first

**Files:** `src/game/content/weapons/weapons.test.ts`.

- [x] Write test cases for all 12 weapon behaviors, registration, levels, multi-hero, effects, overlaps, 130-mob boss and resets before implementing the pack.
- [x] Commit test-first source (`5bc2941`) on the feature branch.
- [ ] Execute targeted Vitest and observe *expected failures*; local environment lacks pnpm and project dependency installation, and Foundation GitHub workflow is restricted to another branch.

### Task 2 — GREEN: Real combat mechanics

**Files:** `src/game/content/weapons/runtime.ts`, `abilities.ts`, `src/game/content/packs/weapons.ts`.

- [x] Create bounded state keyed to `GameState.content`.
- [x] Implement swept-circle hit resolution, targeting, homing, piercing, retargeting, zones, orbit, heal and chains.
- [x] Route all damage through the existing `hit` function.
- [x] Register all twelve upgradable abilities; no integration manifest changes.
- [ ] Run `pnpm test` and confirm actual behavioral outcomes.

### Task 3 — VFX, sound and REFACTOR

**Files:** `src/game/content/weapons/render.ts`, `abilities.ts`, `runtime.ts`, `docs/weapon-arsenal.md`.

- [x] Add bounded Canvas 2D visual representations for projectiles, zones, wolf companions, chains, scythe, beam, gravity.
- [x] Match existing SFX cues to weapon metadata and attacks without changing the shared `SfxCue` contract.
- [x] Replace per-frame nearest-target sorting/arrays with single-result squared-distance scans.
- [x] Share only a single active content-effect renderer and cull offscreen graphics, not gameplay.
- [ ] Execute regression suite after refactor and perform independent visual QA.

### Task 4 — Validation and handoff

- [ ] `pnpm install --frozen-lockfile`.
- [ ] `pnpm test`.
- [ ] `pnpm typecheck`.
- [ ] `pnpm build`.
- [ ] `pnpm check-release`.
- [ ] Capture verified full command output and any CI runner status.
- [ ] Review test results, resolve any failures in owned code and rerun all checks.
- [ ] Mark validation complete only when all five commands exit 0.

## Execution limitations

The remote GitHub connector can create branch commits but cannot run shell commands. The available container cannot resolve `github.com` or `registry.npmjs.org`, and it has no checkout or pnpm package cache. The Foundation workflow triggers only on `feature/es-content-foundation` and is not valid evidence for this feature branch. The code and tests can be submitted without a PR; their status must remain **not verified** until a compatible runner executes the full commands.
