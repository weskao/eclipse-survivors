# ES2 Faction Sprite Scale — visual parity pass (2026-11-24)

## Motivation and calibration

The 10 faction sprites previously used 88–128px *square atlas destinations*, while the five classic develop mobs use 87×75 to 139×134px drawings and the classic BOSS uses 236×246px. Direct pixel inspection of the actual committed faction WebPs shows large transparent margins in some sheets (e.g. shield-guardian occupies roughly 64% of source-cell height in typical poses). The first size pass therefore remained visually too small.

**Only** `src/game/render/es2/production-factions.ts::FACTION_VISUAL_SIZE` owns the new visible Canvas destination dimensions. No new asset is loaded or decoded per frame; no changes were made to `ENEMY_DEFINITIONS.radius`, HP, AI, world movement, attack reach, collision geometry, six-frame source crops, direction, or the original foot anchor (`y - size + 5`). Conservative lower-screen culling was extended so large enemies no longer vanish when still partly visible.

| Enemy | Previous square Canvas box | New square Canvas box | Current authored WebP source cell | Source px per displayed px |
|---|---:|---:|---:|---:|
| shadow-assassin | 92 | 146 | 216 | 1.48× |
| necromancer | 108 | 168 | 276 | 1.64× |
| dark-archer | 96 | 154 | 228 | 1.48× |
| plague-carrier | 104 | 184 | 288 | 1.57× |
| shield-guardian | 128 | 208 | 336 | 1.62× |
| phantom | 90 | 152 | 210 | 1.38× |
| fire-imp | 88 | 142 | 210 | 1.48× |
| frost-wraith | 102 | 166 | 228 | 1.37× |
| berserker | 110 | 180 | 264 | 1.47× |
| crystal-sentinel | 128 | 208 | 324 | 1.56× |

**The largest new enemy display box is 208×208px, less than the old BOSS's 236×246px.** This comparison concerns renderer destination boxes; actual visible alpha silhouettes differ due to artwork padding.

## Source-resolution acceptance is still pending

These are deliberate **visual size fixes**, not newly rendered source images. While the source masters were previously authored at high resolution and the existing manifest still records `native3x: true` provenance, the current optimized WebP source cells are **not 3× the new display sizes**. The source-to-destination ratios above are only 1.37–1.64×. The 3× *at the new draw size* requirement in `.claude/rules/character-art-3x.md` must be reverified against approved independent masters; new native 3× runtime exports/art may be needed to satisfy it. Do not cite this size pass as passing that requirement, do not silently upscale existing small sheets, and do not mark any artwork `approved` merely because its destination size now matches older mobs.

## Regression and review

- `production-faction-size.test.ts` locks the ten new destination sizes, validates the BOSS upper bound, the original atlas crop, feet position, cue positioning, unchanged authoritative collision radius, and bottom-edge viewport culling.
- Re-check desktop, tablet, mobile portrait/landscape and busy encounters before signing off. Validate that windup warnings are still readable and smaller enemies do not obscure gameplay. Screenshot comparisons from local decoded sources are **not** actual in-game browser evidence.
- All 20 enemy/cue candidate `status` fields remain `needs-human-approval`. Do not relax the global art acceptance gate or alter other concurrent art ownership.
