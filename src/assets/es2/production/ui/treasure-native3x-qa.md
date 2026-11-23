# 4 native-3× treasure chest icons — technical production integration

**Status: UI CONSUMER CONNECTED / VISUAL QA PENDING.** These are four of the existing 17 world-art UI items, not four new inventory IDs or approval claims.

- Source: new original transparent 1254×1254 illustration, 2×2 grid; quadrants independently extracted at 627×627 authentic source pixels. Four 627px `sources/*-master@source.webp` files retained in Git. The full 2×2 PNG is not committed; the four full-resolution independent authored masters are.
- Runtime: four 240×240 transparent WebP assets, using the **existing canonical filenames** so `WORLD_ART.ui`, `RelicRewardOverlay.vue`, game-world chest marker and the in-game archive display them without duplicate resolver code.
- Usage: 64px chest reward buttons/asset gallery, and a conservative 72px QA cap. 240px source ≥ 216px native 3× requirement. Output downsampling from 627px (not upscaling from the earlier 192px files).
- The generated sheet was cropped into four non-overlapping 627×627 cells; each candidate's outermost pixel row/column was checked transparent, no neighbor-frame bleed. Review actual small-size UI against original art style, contrast and the four rarity semantics before final approval.
- Source images independently recoded with WebP quality 84; runtime images quality 80. No resize of original low-resolution icons. Runtime max 75,000 bytes each.
- Four RED→GREEN `treasure-icons-native3x.test.ts` cases assert canonical image URL, original master existence & SHA, correct 240px/627px WebP geometry, alpha flag and byte budget; all 49 entries and the blocking art approval test remain intact.

| UI ID | Runtime bytes | Runtime SHA-256 | Source bytes | Source SHA-256 |
|---|---:|---|---:|---|
| `treasure-common` | 16024 | `4fb726fa7d5ba674e518d0af62cb29ccc78fc309491242fe6d7d96799b620bda` | 79930 | `1c38da0a7deaccb9f7663738050ee65c4dbd5d2a32109f69c6d445f448947dcc` |
| `treasure-rare` | 18476 | `9b081aa661e5c67567e814d37046e939eab97e0c23de5cb78c5b8cbb4dfd74e9` | 89022 | `c5e9713f2db807e077238e6f23375d2b5cb8ac4adee1d2449e636ae9388f9b0e` |
| `treasure-legendary` | 21198 | `843101407f3d4352b6c9ea884cf076f18e07b97539ffaf574015a35691ee7159` | 99244 | `04e7bb805ac196b1f8cee73ef94e5e955db78bbc20a6cb45b66bee5ad244ff56` |
| `treasure-cursed` | 20836 | `d3bcee2f6e50d47781b30d450e349f54c6f3d66d17d618d6e11fb4989dc0209c` | 98336 | `8798bacc91aed73f914b26c4ed9246786a02590a0ad085144c8a9cf5b70fad7b` |

**Not yet complete:** real desktop/mobile portrait and landscape screenshot reviews of each live consumer, all other enemies/bosses/biomes 3× deficits, and manual visual approval. Do not set `approved` merely due to this asset integration. Heroes, `develop` and `main` remain untouched.
