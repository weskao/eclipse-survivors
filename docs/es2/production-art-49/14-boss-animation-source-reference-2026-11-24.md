# Boss body animation follow-up — 2026-11-24

Owner asked to re-check actual animation connectivity after static-art signoff, and explicitly requested applying existing images to the remote project.

## Implemented source reference playback

The original project source files `assets/images/imgs7.png` and `imgs8.png` (1448×1086) contain small authored action pose sequences. A visual source audit found six selected attack poses per phase for all four bosses (72 rectangles). The source files remain unchanged and are consumed directly by the DEV renderer, without duplicate PNG/WebP copies or upscaling claims.

`?showcase=1&es2BossArtQa=<boss-id>&es2BossMotionQa=1` enables the source-reference motion review in Vite DEV. IDs: abyss-monarch, frost-sovereign, infernal-titan, eclipse-seraph. The first three selected poses are sampled against actual windup progress and the last three against release impact lifetime. The sprite preserves aspect ratio, ground anchor and phase growth. On missing source, idle, or reduced-motion preference it falls back to existing static phase rendering. The source review is intentionally excluded from the production build; it is not an approved animation or full-size replacement.

## Still incomplete

- Current native candidates contain only one drawing per phase. Original source pose content is approximately 50–80px, with possible crop/neighbor fragments; it cannot meet actual maximum 293px display (878px native detail requirement). It is unsuitable as the release body animation.
- New authored idle, locomotion, windup, attack, recovery, hurt, transition and death frames are still required, with consistent per-phase identity and anchors. Existing Canvas VFX, AI and combat geometry remain independent.
- The prior owner's static canonical visual signoff does not approve the 72 reference poses, high-resolution QA-PENDING candidates, or a complete body animation. Preserve static approval and separately track animation as incomplete, pending real cross-device footage and explicit owner review.
- No newly painted art is claimed for this change. No combat, hitbox, timing, heroes or balance changes.
