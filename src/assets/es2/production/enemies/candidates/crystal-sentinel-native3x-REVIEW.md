# Crystal Sentinel — six-pose native-3× QA candidate

**Status:** `QA_PENDING`, **not in default gameplay**. Preserves existing world enemy atlas and authoritative combat state. This candidate is accessible in the browser-only enemy QA preview at `/src/assets/es2/production/enemies/qa-preview.html` for side-by-side review.

- Original source: a new 1536×1024 3×2 image containing 6 separately illustrated 512×512 poses, *not an upscale of the existing 96px per-frame atlas*. The pale backdrop was removed programmatically; recomposed as a **3072×512** transparent six-pose master, with the downsampled **1944×324** candidate atlas.
- World Canvas draws the existing Crystal Sentinel at **108px**, so the proposed 324px sprite cell meets the **3× nominal dimension**. Runtime atlas is **109,496 bytes**, under the existing 110KB cap. Full 6 frames have visible pixels, zero opaque pixels on cell borders, and different per-frame decoded pixel hashes.
- **Major identity blocker**: the new silhouette is noticeably bulkier and more heavily armored than the current slim purple-crystal humanoid. The new poses must be reviewed against the canonical character before any release activation; the source matte also needs halo review at 1× on actual game backgrounds.
- Frames: Ready A, Ready B, Windup, Attack, Recover, Phase. Their order mirrors the existing `production-factions.ts` frame selector, but this preview does not claim successful in-combat animation.
- Runtime asset: `crystal-sentinel-6poses-QA-PENDING.webp` (SHA-256 `aa298e71eea92290fe4da2423ab539862e53bd631077100d15d10009cab24ea8`).
- New authored source master: `crystal-sentinel-6poses-master@source.webp` (SHA-256 `e284ff6e0e776a611b8cee0b469d4cbde4cc788faf0e14c7e9a1ce935ff097f6`).
- Automated tests: `crystal-sentinel-native3x.test.ts` verifies source/runtime dimensions, hashes, alpha flag, bytes, six poses and QA-preview wiring. Browser gallery review is **not** the normal gameplay or owner visual-approval gate.
- Formal world-art manifest remains unchanged, with `crystal-sentinel-body@3x.webp` at six 96px legacy cells, `native3x=false`, `status=needs-human-approval`. The other 49 canonical entries and their SHA values are untouched.

**Next**: revise the candidate to match the existing character identity, or obtain owner sign-off on a redesign; only after true in-game desktop/portrait/landscape review consider an explicit separate production activation commit.
