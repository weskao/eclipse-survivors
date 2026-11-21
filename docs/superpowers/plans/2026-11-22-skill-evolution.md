# Skill evolution implementation plan — 2026-11-22

Base: `main` at `fe6161fa9deea23d4447b39b2085689744f531fe`. Feature branch: `feature/skill-evolution-system`.

1. **RED — pure progression tests.** Verify seeded weighted sampling, rarity, caps, no duplicates, recipes and preserved original skills. Start with failing tests.
2. **GREEN — deterministic progression.** Reuse existing `UP`, `Hero.skills` and seeded source. Add a small evolution module, independent timers/effects, and keep original skills usable after evolving.
3. **RED — UI/state tests.** Assert HUD shows owned skills only, cooldown/level/evolved state, upgrade card rarity and multi-level-up queue behavior.
4. **GREEN — HUD and cards.** Project equipped abilities from hero state on the existing 8 Hz cadence. Reject invalid/hidden choices; render styled cards and original SVG sigils; preserve `App.vue` and enemy/map/audio modules.
5. **REFACTOR — maintainability and accurate descriptions.** Shared definitions, native CSS, no extra dependencies. Fix ambiguous skill descriptions.
6. **VERIFY — run `pnpm typecheck`, `pnpm test`, `pnpm build` through branch-only GitHub Actions and create real browser screenshots and MP4 artifacts. Commit and push branch only. No PR, merge or force-push.

Explicit conditions: both original prerequisites are at Lv.3+; original abilities remain equipped; the evolution is offered once and costs one pending upgrade. Each evolution has one level and its own cooldown.
