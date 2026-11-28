# ES2 asymmetric run facings — batch 8 (partial)

Extract at the repository root on `feature/es2-release-readiness-integration`. All raster files are WebP. No images contain labels or captions.

- Spirit Summoner W: new independent four-frame run candidate, 1536×1536 runtime atlas, 768px cells, 1254×1254 exact lossless source master. Pending identity, staff hand and 1× review.
- Crimson Paladin NE: existing batch-7 candidate included unchanged because not yet observed on GitHub. Do not create a duplicate path if already uploaded.
- Spirit Summoner NW: exact source master for the existing batch-6 WebP already on GitHub. The master is not a new direction; review handedness and migrate source manifest/hash before accepting.

Remaining: Crimson Paladin W and NW (new independent source sheets); generated attempts were rejected because they were overview panels or faced NE. Spirit Summoner NW replacement only if the existing candidate fails handedness review. Do not mirror flattened staff or sword/shield art to fill these gaps. Shadowblade needs no new run facing. This archive is NOT a complete production animation set. All candidates stay QA_PENDING.

Conversion: Pillow/libwebp lossless exact RGBA (polytool unavailable in this environment); source and padded runtime atlas round-trip verified against decoded input, no resampling.
