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

## All six heroes: weapon-specific articulated motion (mandatory migration gate)

Use one renderer/lifecycle, locomotion/contact solver and engine clock; each actual roster ID (not its legacy JobId alias) owns its authored equipment slots, joint chains, weapon hand, attack/cast curves and secondary motion. Do not retarget Knight's sword swing or its anatomical anchors to other heroes. Preserve the accepted e547225 Knight reference unless a reproducible regression requires adjustment. Per-hero animation must be the default in all normal Make play/build/preview paths once admitted; query flags are diagnostics, not prerequisites.

| Hero ID | Existing equipment / semantic action | Required pose design |
|---|---|---|
| knight | Sword / slash | Pelvis and torso rotation lead shoulder, elbow and wrist; rigid blade follows the hand; controlled follow-through and recovery. |
| ranger | Bow / arrow | Bow arm stabilizes the grip; draw arm moves back toward its authored anchor, then relaxes on release; keep arrow attached only before the real projectile spawn. Bow curvature stays authored; if a separate string layer is supplied its motion may follow the nock, never deform the whole bow texture. |
| wizard | Staff / magic | Staff hand retains a stable grip with controlled lift/rotation; free casting hand prepares and releases the charge; robes and sleeves follow with bounded lag. Do not swing the staff like a sword or retain the released charge. |
| shadowblade | Shadow daggers / dual-blade-slash | Separate left and right rigid daggers and wrist anchors; compact alternating arm/torso arcs with distinct recoil; special shadow afterimages follow the actual activation. Do not invent a second gameplay hit. |
| spirit-summoner | Spirit orb / spirit-cast, spectral-convergence | Separate orb or authored focus and both hand targets; deliberate gathering/opening gesture with bounded arm reach; companion strikes remain independent. No invented staff, sword, or extra projectile. |
| crimson-paladin | Crimson guard / shield-counter, crimson-aegis | Shield anchored to the authored arm, compact braced posture and weight transfer, shield recoil only when supported by actual combat/guard events; preserve any secondary weapon depicted in approved art as a separate slot. Do not fabricate a counter event. |

### Human motion and game timing
- Use per-view shoulder/elbow/wrist and hip/knee/ankle chains, foot heel/toe anchors and weapon/focus sockets, stable canonical handedness and explicit occlusion order. Preserve bone lengths in local anatomical space, constrain hinge directions and reach; projection may foreshorten. Move the torso/pelvis before distal joints as appropriate, with controlled easing and bounded cape, cloth and hair follow-through. No joint inversion, rubber limbs, detached equipment, or visual teleport. Verify feet and weapon contact against actual frames; a 2D approximation is not measured human motion capture.
- Separate lower-body travel from upper-body attack aim; allow strafing, moving attacks, rapid repeat, dash, hurt, death, pause and reduced motion. Never force a new gameplay root motion, damage window, cooldown, target, projectile origin or input lock to accommodate a cosmetic animation.
- Preparation / ready / release / recovery must be driven by the actual combat state. In this engine strike starts at the real hit/projectile spawn; never insert a delayed visual release after the projectile has departed. Pre-contact cues use the existing ready/windup state when available, and no false anticipation when no attack is imminent. Active skill and passive counter/companion events must not be conflated with basic attacks.
- Each rig needs its own native transparent 3x source layers and calibrated per-view anatomical anchors. Preserve asymmetric equipment hands; require independent views wherever reflection would swap them. Keep legacy fallback for invalid/missing assets or unsupported GPU, but do not count fallback as migration success.
- TDD: each actual hero ID must select its own action profile; test all eight aim/travel directions, independent gait, weapon/focus attachment, projectile one-shot visibility, bounded joint motion, rapid repeated attacks, special events, reduced motion, pause and unchanged simulation. Test real default DEV and production browser entry (no QA activation query), desktop and mobile, then capture actual MP4 with representative frames. Report visual acceptance, automated checks and performance separately. No promotion solely on a successful capture or by bypassing unrelated art gates.

### Reference principles (not copied artwork or proprietary animation)
- Riot Games, [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/) and [Modernizing the Monk](https://www.leagueoflegends.com/en-gb/news/dev/dev-modernizing-the-monk/): readable attack silhouette and ability hierarchy.
- [Diablo III systems GDC talk transcript](https://www.purediablo.com/wyatt-chengs-gdc-2013-panel-illustrated-transcript-part-two): preserve responsive controls and align the visible contact with the actual action; avoid unnecessary recovery locks.
- [Anatomy of an Attack](https://gdkeys.com/keys-to-combat-design-1-anatomy-of-an-attack/): anticipation/action/recovery with game-appropriate timing (including Hollow Knight).
- [Spine IK constraints](https://en.esotericsoftware.com/spine-ik-constraints) and [Spine tips](https://esotericsoftware.com/spine-tips): foot and hand targets, FK/IK mixing and independent secondary-motion bones.

This section defines the implementation and acceptance standard, not evidence that all six rigs have shipped. Missing per-hero art, physical-device evidence and open CI gates remain explicit blockers.
