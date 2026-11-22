# ES2 Art Pack — partial concept inventory

**Not production-ready.** These are original, AI-generated dark-fantasy item illustration concepts, not the completed 16-category game art pack. All included files contain genuine WebP image bytes. Their matte/alpha and subject-to-content-ID correspondence still need human art review. The file names use concept IDs rather than falsely assigning them to unrelated weapon/evolution IDs.

- `concept-manifest.json` lists only image paths committed to this branch.
- `missing-assets.json` records the 24 canonical weapon and evolution IDs plus the other missing art categories.
- `asset-manifest.test.ts` verifies file existence, WebP encoding, alpha feature, image sizes, per-file bounds and SHA-256.
- No changes to shared renderer, UI, main, or integration-owned ContentPack index.

Design theme: Dark Fantasy + Gothic Magic + Celestial Eclipse, original realistic illustrated art; transparent WebPs intended for future approval.

A separate downloadable 25-WebP local concepts pack exists but is **not** equivalent to the GitHub branch's verified inventory. Do not integrate until its canonical appearance and animation constraints are satisfied.
