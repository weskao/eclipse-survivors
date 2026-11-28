# ES2 hero WebP migration / Batch 7

Extract into the repository root on `feature/es2-release-readiness-integration`. Submit a commit with the new files. Do NOT remove existing PNGs or overwrite existing manifests before the migration code/tests are updated.

- Seven `source.webp` masters are losslessly encoded with exact decoded RGBA equality against their original PNG (including invisible RGB). Six replace existing PNG source masters after consumer/manifest/test migration; one restores the previously absent Spirit Summoner NW batch-6 master in WebP form. See `webp-migration-inventory.json` for SHA-256, original Git blob, dimensions and pixel hash. No resizing.
- Crimson Paladin NE batch-7: independent original WebP master (1254×1254, 2×2) and runtime four-cell atlas (1536×1536, 768×768 cells), transparent background, no labels. Original master preserved exactly; only alpha=1 boundary noise removed in padded runtime derivative. QA_PENDING, pending review of character identity, handedness, alpha and motion. Not an approved ten-frame animation.
- This pack does not include mirrored duplicate exports. Staff and sword/shield reflections require visual verification. Do not delete independent SW/NW atlases until their replacements are proven.
- Other original PNGs elsewhere in the repository are outside this pack; migrate them only with their own exact-pixel verification.
