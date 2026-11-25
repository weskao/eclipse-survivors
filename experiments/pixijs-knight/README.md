# Knight hybrid renderer — isolated POC (QA_PENDING)

Base: feature/es2-release-readiness-integration at fd780bae09049f17d768e75d071d2a8f014993b2.
PixiJS stable: 8.23.0, released 2026-11-11 (https://github.com/pixijs/pixijs/releases/tag/v8.23.0).

## Scope and rationale

The owner requested the first hero as a hybrid experiment. Existing CLAUDE.md and realtime-performance.md prohibit introducing a second active renderer or an unmeasured partial production migration. This independent Vite dev page uses one active renderer at a time; the shipping game, dependencies, root lockfile, combat and input remain unchanged. Do not merge this as a production migration.

Reuses src/assets/knight.webp, createHero, sampleHeroAnimation, sampleWeaponRig, cached rigid-weapon layers, and the legacy drawRigSprite fallback. No new raster asset, no mirror, no generated animation sheets, no Spine license/dependency. The body-only MeshPlane uses 11 × 13 vertices and precomputed weights, a rigid sword Sprite uses uniform scaling with the existing grip. Only one animation clock; no steady-state texture creation, hidden/paused/Reduced Motion rendering is suspended. Visual poses: idle, run, basic attack, dash and hurt (one authored view, procedural candidates, not a complete locomotion or eight-direction rig). No shader/VFX migration, special/death/victory, shield rig or full game-world integration claimed. These are next gates, not completed features.

## Run from repository root

    pnpm install --frozen-lockfile
    npm install --prefix experiments/pixijs-knight
    node --test experiments/pixijs-knight/pose.test.mjs
    pnpm exec vite --host 127.0.0.1

Open http://127.0.0.1:5173/experiments/pixijs-knight/ (or port printed by Vite).
Use the pose, pause, reduced motion and Canvas fallback buttons. The POC dependency is deliberately isolated; npm must generate its package-lock.json on a network-enabled machine before reproducible POC browser QA. Do not commit changes to the root dependency graph until a measured integration is approved.

## Acceptance / next gates

- [x] Tests-first pure skinning and rigid sword math: 4 Node tests pass in isolated local execution (initial RED was missing module; full project Vitest RED/GREEN not executed).
- [ ] Install exact dependency, generate and commit experiment lockfile, validate actual WebGL and Canvas fallback.
- [ ] Inspect original asset alpha, source pixels, weapon cutout, grip alignment, mesh joints, foot anchor and actual 1× presentation. Author missing hidden anatomy and actual leg/arm layers if needed; no mirror that swaps equipment. Retain existing sprites until approved.
- [ ] Add browser tests for switching renderers, context loss, visibility, reduced motion, pause, navigation, DPR, portrait/landscape and mobile input.
- [ ] Record baseline/candidate desktop and physical iOS/Android render time, median/p95/p99, GPU/CPU, memory and thermals, and 130-mob scenario with full existing gameplay. No speedup claim.
- [ ] After evidence and owner review: agree on a single-renderer boundary for live Knight, test real engine-to-renderer state and depth order, preserve weapon/hitbox/timing parity, expand directions and remaining animation states; update production package and frozen lockfile together.
- [ ] Run pnpm test, pnpm typecheck, pnpm build, pnpm check-release and actual browser QA. No release promotion without approved visual evidence.

Official MeshPlane v8.23.0: https://pixijs.download/v8.23.0/docs/scene.MeshPlane.html
