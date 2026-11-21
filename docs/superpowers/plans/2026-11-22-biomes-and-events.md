# Implementation plan — biome and event work

1. Add deterministic world geometry tests: four palettes, biome-specific obstacle and hazard layouts, safe origin, circle separation, hazard telegraphs (RED).
2. Add event tests: weighted deterministic rolls, safe placement, single reward, expiry, blessing, fair damage timing (RED).
3. Add world geometry and collision helpers (GREEN), reusing hash and simple circles.
4. Add event scheduler/tick and scene-reset integration (GREEN), reusing existing hooks, spawn patterns, and progression.
5. Render four cached textured floor/landmark sets with biome lighting, weather and distinct hazards, and event glyphs. Make minimap share the exact same world helpers.
6. Wire into step/state/reset and document behavior, run typecheck/tests/build. Simplify duplication.
7. Push only feature/biomes-and-random-events, no merge, PR, or force-push. Capture real gameplay footage only if browser capture is available.

Verification: workflow executes pnpm install --frozen-lockfile, pnpm typecheck, pnpm test, pnpm build on this branch.
