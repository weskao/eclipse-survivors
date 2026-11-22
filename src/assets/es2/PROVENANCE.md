# Asset provenance and visual approval gate

- **Source:** original image synthesis performed for this Eclipse Survivors request. Generated sheet reference: `663ce120-12b8-4432-a046-520f0c444a92`.
- **Theme:** Dark Fantasy, Gothic Magic, Celestial Eclipse. Painterly realistic metal, magic, flame, frost, blood and astral effects. No licensed or extracted game assets used.
- **Derivation:** crop original 1536×1024 sheet into 6 columns × 4 rows of 256×256. Approximate background subtraction estimates a bilinear background from each tile's corners; edge alpha is then softly blurred. Export transparent WebP images. Build a 6×4 atlas of downsampled 96×96 frames, optimized with a binary alpha threshold for size. Conversion is nondestructive to the original source PNG.
- **Limitations:** source synthesis is an initial **art concept**, not canonical weapon-specific artwork. Several positions intentionally depict repeated variants. Transparency is approximate and magic halos and dark edges may require manual retouch. No real sequential character action animation has been authored; concept images are not a substitute for multi-frame animation.
- **Go/no-go:** review each proposed visual against the content-specific weapon/relic/boss/hero ID before assigning it; review alpha in dark/light UI, 3x size and mobile readability. Until that happens, only `es2-art:concept-*` IDs are valid. Never auto-assign this artwork to unrelated content IDs.
- **Copyright:** original generation, not copied third-party game art.
