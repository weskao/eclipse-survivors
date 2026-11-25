# Boss body animation follow-up — 2026-11-24

Owner asked to re-check actual animation connectivity after static-art signoff, and explicitly requested applying existing images to the remote project.

## Implemented source reference playback

The original project source files `assets/images/imgs7.png` and `imgs8.png` (1448×1086) contain small authored action pose sequences. A visual source audit found six selected attack poses per phase for all four bosses (72 rectangles). The source files remain unchanged. Four lossless 672×336 WebP reference atlases now isolate the selected poses in a 6×3 grid of 112px cells (native source detail unchanged). The DEV renderer loads only the selected boss's compact atlas, with fixed source scaling and a common bottom anchor; the full concept sheets are no longer loaded at runtime.

`?showcase=1&es2BossArtQa=<boss-id>&es2BossMotionQa=1` enables the source-reference motion review in Vite DEV. IDs: abyss-monarch, frost-sovereign, infernal-titan, eclipse-seraph. The first three selected poses are sampled against actual windup progress and the last three against release impact lifetime. The sprite preserves aspect ratio, ground anchor and phase growth. On missing source, idle, or reduced-motion preference it falls back to existing static phase rendering. The source review is intentionally excluded from the production build; it is not an approved animation or full-size replacement.

## Still incomplete

- Current native candidates contain only one drawing per phase. Original source pose content is approximately 50–80px, with possible crop/neighbor fragments; it cannot meet actual maximum 293px display (878px native detail requirement). It is unsuitable as the release body animation.
- New authored idle, locomotion, windup, attack, recovery, hurt, transition and death frames are still required, with consistent per-phase identity and anchors. Existing Canvas VFX, AI and combat geometry remain independent.
- The prior owner's static canonical visual signoff does not approve the 72 reference poses, high-resolution QA-PENDING candidates, or a complete body animation. Preserve static approval and separately track animation as incomplete, pending real cross-device footage and explicit owner review.
- No newly painted art is claimed for this change. No combat, hitbox, timing, heroes or balance changes.

## Isolated motion reference delivery

Four files in `src/assets/es2/production/bosses/candidates/motion/` contain 72 source pose cells total. Combined compressed size: 498226 bytes, compared with approximately 3.5–3.8 MB for one original concept sheet. Per-boss atlases preserve the crop pixels without upscaling; 112px cells are padding, not original detail. Their status remains REFERENCE_ONLY_NOT_NATIVE_3X. No canonical visual approval is extended to animation. New high-resolution authored frames and human runtime animation approval remain outstanding.

## Current runtime size correction — 2026-11-24

The earlier 236px and 878px notes above are historical. The shared base draw width is now 255px; phase scales are 1.00 / 1.12 / 1.24. Current display sizes and native-detail requirements: 255 → 765px, 285.6 → 857px, 316.2 → 949px. For a common frame layout use at least 949px authored interior plus a transparent gutter; a 981px cell with 16px gutters is the minimum. A 960px authored interior / 992px cell is a practical option. Split large animation sequences by pose and phase; do not stretch low-resolution source or count transparent padding as native detail. Keep all canonical static approval evidence unchanged and all missing animation art pending.

## Browser motion proof

The attack-video workflow now captures both the existing VFX review and an independent opt-in source-motion review. The latter observes successful real Canvas `drawImage` calls, checks the selected 672×336 WebP and exact 112px source cells, requires all six distinct slots for every phase of every boss, and records the observed rows in the MP4 evidence JSON. It is not a native-3x or visual-approval test. An actual successful workflow with four MP4s and 72 observed cells is required before claiming source-motion capture complete.
