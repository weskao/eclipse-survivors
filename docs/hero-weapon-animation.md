# Hero weapon animation contract

Eclipse Survivors retains the existing three original transparent WebP character illustrations.
Their poses are **not** interchangeable: the knight's sword is on the image-left,
the ranger's bow is on image-right, and the wizard's staff is image-left while
spell projectiles originate at the right casting hand.

## Rendering / gameplay invariants

- Match skinned arm weights to the **actual** weapon side for each illustration.
  Do not assume the main weapon is always on the right.
- Use physically bounded shoulder–elbow–hand (two-bone IK) movement. Avoid
  scaling/bouncing an entire static illustration or adding ghost weapons.
- The gameplay projectile spawn, illustrated casting hand and animation aiming
  must use the **same** grip coordinates from `weapon-geometry.ts`.
- A projectile travels along its actual spawn-to-target vector. Do not calculate
  travel/interception as though the shot began at the hero's ground-contact point.
- Maintain the last attack-facing direction while `strike > 0`; movement cannot
  flip the sprite in the middle of a weapon swing.
- Reduced-motion preference draws one intact source illustration. The new
  animation is hero-only and must not add per-monster texture subdivision.
- Keep TDD coverage for both facing directions, all target quadrants,
  two-bone length constraints, and an actual rotated weapon-bearing texture.

## Important visual limitation

The current WebP files are single illustrations with arms and weapons painted
into the same layer. The continuous mesh skinning is a physically informed
2D approximation, **not** a full skeletal character with independent bone
sprites or a rigid-body physics solver. Production-level animation fidelity
will require newly authored transparent limb and weapon layers, or dedicated
multi-frame attack sheets, maintaining the original face, armor and costume.

The current combat system still resolves strike and projectile release when
`attack()` fires; therefore an anticipatory wind-up that delays the gameplay
hit should be implemented separately with its own combat-balance and
frame-synchronization tests before describing attacks as physically exact.

## Verification

`pnpm typecheck && pnpm test && pnpm build`

On the development branch, GitHub Actions also runs Chromium capture for all
three heroes and uploads MP4, screenshots, a before/after comparison, and
render-cost measurements. Review these visuals before merging.
