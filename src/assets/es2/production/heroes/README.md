# ES2 production world + hero art — work-in-progress validation gate

This is the independent art-only branch based on exact commit `7d7517752466d0a835525d53cebb1b915c5f10bc`. Original knight/ranger/wizard art is preserved. Canonical IDs are taken from the exact-base hero, enemy, boss and biome definitions.

**Status: incomplete / BLOCKED.** A manifest entry is an explicit production requirement, not proof that an image exists. Only a real optimized WebP with correct content ID, geometry, alpha, budget, distinct artwork and visual approval can become `approved`.

- Heroes: three new action strips, 4 frames (ready, windup, strike, recovery), 96×96 per frame at 3×. The game's original heroes remain untouched; 8-way movement and continuous running still need separately authored sequences.
- Enemies: 10 distinct six-frame sheets and 10 corresponding high-contrast telegraph images (readable in light/dark gameplay and reduced flashing).
- Bosses: four three-phase variants, 192×192 per phase, no mismatched phase reuse.
- Biomes: four 768×768 ground surfaces and four four-cell decoration sheets. Ground is opaque; foreground decorations are transparent.
- UI: treasure, rarity, HUD and achievement ornaments; each 192×192 transparent 3× WebP.

**RED → GREEN acceptance:** run `pnpm test -- src/assets/es2/production/heroes/production-art.test.ts` then the full repository checks. The tests intentionally fail while assets or approval are missing; do not disable them to make CI appear green. They verify exact ID inventory, actual RIFF/extended WebP geometry, declared alpha feature, 3× frame math, budgets, SHA-256 where recorded, binary duplicates and approval status. Byte checks cannot prove animation continuity or perceptual non-duplication: those require rendered contact sheets with manual review and pixel-based duplicate analysis, not guessed results.

**Scope:** all files live only under `src/assets/es2/production/{heroes,enemies,bosses,biomes,ui}/`; this branch does not wire the engine, UI or shared manifests and must not change weapon/evolution art.
