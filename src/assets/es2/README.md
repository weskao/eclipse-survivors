# ES2 original art — integration status

**Status: concept-only, not a completed production art pack.** The 24 original concept illustrations were generated in a 6×4 dark-fantasy illustration sheet and exported as transparent 256×256 WebPs. An additional 576×384 atlas contains 24 frames of 96×96 pixels (3× for 32-pixel inventory slots). The locally extracted matte is a technical approximation, not a human-approved retouch.

- `concept-manifest.json`: all *actual existing* concept WebP paths, exact geometry, SHA-256 and the 24 canonical weapon/evolution IDs from the parallel feature specifications. **Concept images are not assigned to incompatible canonical content IDs.**
- `missing-assets.json`: precise missing canonical assets and remaining category blockers. A manifest entry without a real asset is not counted as delivered.
- `asset-manifest.test.ts`: Vitest regression checks for manifest IDs, exact WebP header/alpha feature, existing files, bounded sizes, dimensions and hashes.
- `validate-assets.mjs`: dependency-free Node verifier; run `node --test src/assets/es2/validate-assets.node-test.mjs`. The optional local `validate_concepts.py` performs pixel-alpha checks via Pillow, not installed by this repo.

**Provenance:** Original generated artwork created in this session for Eclipse Survivors. No external copyrighted game art was copied. Current visuals remain concept-only until animation continuity, subject-to-canonical-ID fidelity, alpha edges, original hero visual identity and mobile presentation are reviewed.

**Usage:** Do not wire concept art into the shared render engine, UI or `src/game/content/packs/index.ts` from this branch. Integration should replace or approve each canonical item, then use local Vite imports or `new URL('./file.webp', import.meta.url)` where appropriate.
