# TODO — Eclipse Survivors

## Hero costume artwork (not complete)

- [ ] Replace aura-only legacy cosmetics (knight-gilded, ranger-moonlit, wizard-astral) with actual approved costume variants. Current equipped IDs persist and drive the existing world aura and lobby preview, but do not change garment/armor pixels.
- [ ] Produce canonical costume portraits and native 3× transparent WebP idle/run/attack/cast/hurt/death/victory assets using the existing character art and rigid-weapon contracts. Reuse mirrored directions only where silhouette and weapon handedness stay correct; preserve each hero identity. Do not use full-character tint as a substitute for authored clothing.
- [ ] Extend the cosmetic catalog to the three specialization heroes with explicit per-hero ownership/unlock/save migration; ensure legacy base-class mapping cannot accidentally select a different hero's costume.
- [ ] Connect each cosmetic to the menu preview, HUD and actual animation atlas for every supported direction/pose, with identity-safe load fallback, bounded caching, no per-frame image creation, and unchanged hitboxes, stats, weapons and attack origins.
- [ ] Add TDD for selection/save/reload, locked states, all six heroes, actual selected asset/render identity, both locales, all devices and reduced-motion. Capture real menu/game screenshots and motion clips; verify native 3× quality, WebP workflow and performance before accepting the costumes as complete.
