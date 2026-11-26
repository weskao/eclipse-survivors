# Revision: three evolution skill illustrations (2026-11-26)

The original candidate package below describes the earlier 10-asset batch. The three entries `frozen-thunderstorm`, `infernal-singularity`, and `blade-tempest` are superseded by the six authored GIF frames in this revision. The other seven entries are unchanged. Each 512 × 512 source frame is downsampled to 384 × 384; alpha and infinite looping are preserved. The revised animations have six distinct decoded frames each, with original timing (150/140/130 ms per frame respectively); they are not 24 FPS. No artificial interpolation or whole-image transform. All three are under the 1.2 MB reference budget. Pillow/libwebp encoding was used, not Polytool; browser/CI/visual acceptance remain pending. See the manifest for exact hashes, timing and provenance.

---

## Historical original candidate package

# Eclipse Survivors — 10 animated upgrade skill illustrations (candidate)

Target repository: `weskao/eclipse-survivors`
Target branch: `feature/es2-release-readiness-integration`

## Contents

- `assets/skill-icons/`: 10 static `@3x.webp` and 10 real multi-frame `@3x-animated.webp` files.
- `manifest.json`: all source rectangles, generated source IDs, source SHA-256, output hashes, dimensions, frame durations, encoded sizes, motion descriptions, and decoded verification results.

All ten underlying paintings have 512 × 512 source cells, cropped at inspected equal-grid cell boundaries and downsampled to 384 × 384 (logical target 128 × 128 at 3×). The five evolution paintings have been regenerated at native resolution, replacing the insufficient-resolution drafts in the previous package. No source image is enlarged. Alpha is normalized to remove faint background residue; all exports have genuine transparent pixels. Each animation has 48 distinct decoded frames, a 2,000 ms period at 24 FPS (41/42 ms frame durations), and infinite looping. Frames are procedural composites of the authored painting, localized light, particles and, where appropriate, spatial flow. They are not ten independently hand-painted frame sequences. The base art remains recognizable; the blade ring and molten disk receive additional spatial motion. No whole-image zoom is used.

## Skill IDs and animation

| ID | Motion |
|---|---|
| speed | directional wind trails around winged boot |
| haste | golden sand motes and circulating highlights |
| maxhp | localized heartbeat glow and orbiting ember highlights |
| magnet | gold/gem-colored motes pulled toward magnetic poles |
| bolt | electric branches and travelling current |
| frozen-thunderstorm | falling frost streaks and branching discharge |
| infernal-singularity | differential molten disk flow and orbiting embers |
| apocalypse-rain | falling meteor trails and impact sparks |
| blade-tempest | rotating authored outer blade ring around the vortex core |
| guardian-sanctuary | circulating golden energy and rising sacred sparks |

## Verification and limitations

Every image was opened and decoded with Pillow/libwebp. Dimensions, transparency, unique frame count, loop metadata, total duration and file SHA-256 were verified. Source cell edges and a decoded-frame contact sheet were inspected. Loop-seam and consecutive-frame differences are recorded in the manifest. A few glow pixels near the perimeter are intentionally faint; edge alpha maxima are recorded.

This is a candidate package, not a verified repository change. Polytool `towebp` and `cwebp` are not installed in this environment. The static candidates were encoded with Pillow/libwebp quality 95, and the animations with quality 84. These are not claimed to have passed the mandatory Polytool workflow. The 48-frame animations exceed the existing 1.2 MB per-animation reference budget; see sizes in the manifest. Preserve this high-quality candidate set for review, and optimize and validate runtime bandwidth/decoding before acceptance (do not sacrifice the transparent contour or claim native 24 FPS if reducing the frame rate). No game, browser QA, CI, GitHub push or TODO completion has been performed.

## Integration checklist

1. Extract this ZIP in a staging directory. Inspect the images and confirm the SHA-256 values. Follow repository `.claude/rules/webp-assets.md` and `asset-workflow.md`, including Polytool verification as applicable; preserve actual animated WebP frame count when working with the animations. Commit approved assets before wiring consumers.
2. In `src/game/ui-art.ts`, make the ten legacy IDs resolve to their matching still/animated WebPs. Keep generated HUD atlas membership separate from the new animated-file membership: do not mark these ten as present in the existing atlas. Preserve all older still and animated WebPs and ES2/hero-specific art.
3. Make both live `Es2MenuSystem.vue` choice-card flow and legacy `LevelUpOverlay.vue` use the shared art resolver. Default uses `@3x-animated.webp`; reduced motion, game still setting and reduced flashing should use `@3x.webp`. Do not add JavaScript frame loops in the game. Keep functional UI icons and world-space VFX outside this migration.
4. Update the SVG expectations in `src/game/skill-art-choice.test.ts` and `src/components/ai-art-integration.test.ts`. Verify all ten IDs and real image decoding, missing asset handling, the existing HUD atlas and both card routes; run RED/GREEN/REFACTOR, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` and real browser QA. Check mobile loading and reduced-motion behavior. Keep TODO entries unchecked until accepted.
