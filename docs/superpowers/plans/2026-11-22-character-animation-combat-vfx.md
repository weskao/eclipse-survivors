# Character Animation & Combat VFX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task.

**Goal:** Eight readable hero action states across Knight, Ranger and Wizard, legible skill/combat effects, reduced-motion and mobile-safe Canvas 2D rendering.

**Architecture:** Keep gameplay simulation, AI and formulas untouched. Derive render-only animation samples from the existing Hero/GameState timers and use a continuous source-image deformation mesh, not disconnected body-part strips or whole-body scaling. Render short-lived overlays after y-sorted characters, draw ground shadows before bodies, and reuse existing bounded effects. Do not introduce a runtime dependency.

**Stack:** Vue 3, TypeScript, Vite, Canvas 2D, Vitest, pnpm 11.22.

**Spec:** User request (2026-11-22), branch feature/character-animation-combat-vfx.

## Global constraints

- Do not modify combat damage or AI behavior; no PR, merge or force push.
- Art identity and source WebP remain unchanged.
- Limit new per-frame allocations, glow and effects; reduced-motion is live, not read once.
- Camera kick remains bounded; no extra screen shake.
- Full checks: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Review focus

- Simultaneous dash/hurt/cast transition priority.
- Clocks paused in menu/level/result and reduced-motion live change.
- Missing/broken art fallback.
- Warping seamless seams and grounded feet at 60 fps on mobile.
- Y-sorting, telegraph honesty (must not suggest a non-existent boss attack).

### Task 1: Deterministic render-state sample (TDD)
- [ ] Add `animation.test.ts` for all eight states, per-hero cast selection, action frame bounds and reset, reduced motion.
- [ ] Verify tests fail without production implementation.
- [ ] Create `animation.ts`: `sampleHeroAnimation(state, hero, reducedMotion)`.
- [ ] Run Vitest and refactor.

### Task 2: Identity-safe animation drawing (TDD)
- [ ] Add tests for independent lower/upper deformation and fallback/reduced-motion.
- [ ] Replace rigid hero draw in `characters.ts` with continuous, overlapping Canvas strip warp; keep face/art geometry, preserve occlusion.
- [ ] Add pose-specific grounded contact, small attack and spell poses, realistic motion bounds.
- [ ] Verify tests and refactor.

### Task 3: Battle VFX contract (TDD)
- [ ] Test arrow/magic trails, bounded effects, reduced-motion.
- [ ] Improve existing effect painters without changing emitters or combat formulas.
- [ ] Show boss proximity danger rather than fake timed telegraph until the AI emits a genuine wind-up signal.
- [ ] Verify test and refactor.

### Task 4: Evidence and branch verification
- [ ] GitHub Actions on feature branch runs full checks and records output.
- [ ] Use actual browser captures from all three heroes; before/after actual gameplay with Playwright, WebM -> MP4 via ffmpeg.
- [ ] Save median frame time and workload in a text report.
- [ ] Link confirmed artifacts and run; keep main unchanged.
