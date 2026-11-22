# Eclipse Survivors — Repository Development Rules

Stack: **Vue 3, TypeScript, Vite, pnpm, Vitest, Canvas 2D**. Preserve the stack, existing game art, combat mechanics, accessibility and mobile support. Follow the existing architecture and work on a dedicated branch; do not create a PR, merge, or modify `main` unless asked.

## Feature acceptance

Verify new behavior from the real player entry point through the engine to the resulting state and visible feedback.

| Situation | Skill |
|-----------|-------|
| Content pack or shared runtime integration | [es-content-integration](.claude/skills/es-content-integration/SKILL.md) |
| Browser-facing change (menus, touch, a11y, Canvas art, audio, perf) | [es-browser-qa](.claude/skills/es-browser-qa/SKILL.md) |
| Adding or replacing sprites, animation, scenery, icons, VFX | [es-asset-runtime](.claude/skills/es-asset-runtime/SKILL.md) |

## Rules

- **Images: asset first, code second.** Commit the real image files in the project before writing their consumer → [`.claude/rules/asset-workflow.md`](.claude/rules/asset-workflow.md).
- **Real-time performance:** game simulation, AI, combat, skills, collisions, world, rendering, effects, perf-critical UI → [`.claude/rules/realtime-performance.md`](.claude/rules/realtime-performance.md). Preference order: eliminate work → precompute immutable data → reuse bounded/valid caches → reject out-of-range work cheaply → optimize only measured bottlenecks. Never trade correctness, determinism, mobile, readability or fairness for speed.
- **Hero animation and weapons:** knight/ranger/wizard sprites, rigid weapons, held projectiles, body atlas → [`.claude/rules/hero-weapon-rendering.md`](.claude/rules/hero-weapon-rendering.md).

## TDD and verification

Every gameplay or performance change follows **RED → GREEN → REFACTOR**: reproduce with a deterministic test that fails for the expected reason, make the smallest fix, rerun. Keep regression tests for boundaries, the boss, hitboxes, skills, offscreen objects, viewport resize, biome changes and long-running cache bounds.

Before claiming completion:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```
