---
paths:
  - "src/game/render/**"
  - "src/assets/es2/production/heroes/**"
---

# Hero animation and rigid weapons — Eclipse Survivors

## Rigid weapons are never deformable body texture
- Knight swords, ranger bows, and wizard staffs must keep their original silhouette and aspect ratio in movement, attack, cast, and direction changes. The bow's original curvature is intentional and must be retained.
- Never send weapon pixels through per-cell skinning, mesh bending, scaling/stretching, or differential transforms. Render isolated weapon pixels as one solid image with translation and rotation; left-right mirroring is permitted.
- Body joints may animate independently, but the weapon must stay attached to the correct hand and preserve the original projectile origin. Cover all three heroes, all eight directions, reduced motion, and atlas caching with regression tests.

## Held projectiles are live overlays
- Ranger's nocked arrow and wizard's held void charge must be separate from BOTH deformable body and rigid weapon sprites. They appear only while preparing/ready and must disappear as soon as a shot exists in world space. Never render them from an attack/recovery atlas or leave them in stale cached cells.
- Combat currently creates the world projectile at attack start (strike=0.29 seconds). Render release/recovery during that strike, not windup/hold, or the fired arrow/charge will ghost. Preserve existing projectile timing and TDD assertions.

## Body atlas
- A sprite atlas stores body animation only, clears every frame before baking, and is keyed by hero, pose, direction, facing, dimensions and frame count. Held projectiles, current weapon orientation, and release accents are live overlays, never part of its cache.
- All three heroes have at least ten running and twelve action/cast sequential frames; preserve weapon aspect ratio, run eight-direction and projectile-release regression tests, and avoid repainting source texture masks in the hot loop.

## Directional reflection of complete character atlases

For all heroes, including ES2, a full-character baked sprite cannot use horizontal reflection when it would change the canonical weapon or shield hand. Reuse five authored facings only where equipment, costume and action remain equivalent; otherwise require the independent facing or an existing correct rigid equipment overlay. Do not add an overlay architecture solely to avoid a few necessary drawings. See [character art contract §3](character-art-3x.md#3-direction-and-animation-contract) for the per-pose source decision and current ES2 exceptions.
