# Character Art Contract — 3× Sources / 1× In-Game Rendering

**Required for every playable hero, enemy, elite, boss, summon, companion, NPC and future character.** This rule extends [CLAUDE.md](../../CLAUDE.md) and applies to portrait, selection card, HUD, world actor, animation, VFX-adjacent character drawings and every replacement of existing character art.

## 1. Native 3× source-resolution acceptance

- Design from an approved **full-resolution character master**, retaining high-frequency detail. For each *displayed* frame with maximum on-screen bounding dimensions `W × H` in CSS/game pixels, the **authored actual-source** frame must be at least `3W × 3H` pixels. Runtime draws at `W × H` (1× game design size); device DPR and physical Canvas backing-store scale must not be confused with asset resolution.
- A resized/AI-upscaled `198×198 → 384×384` cell, or `@3x` filename by itself, **does not satisfy native 3× fine-detail acceptance**. If upscaling is unavoidable for a candidate, preserve the real source dimensions and record `native3x: false`, the interpolation method, and `QA_PENDING`.
- Use individually approved transparent WebP/PNG character frames with clean alpha and without logos, borders, opaque source-sheet backgrounds, halos of unwanted color or remnants from neighboring poses. Confirm real pixel bounds, texture dimensions, visual sharpness, source identity, memory size and alpha using image-based tests.
- **Never silently blur, stretch, sharpen or repeatedly resample** a low-detail sprite to make a nominal dimension pass. Keep a 1× preview/thumbnail for checking original-three-hero parity at actual runtime size.

## 2. One character identity across all art

- Anchor **every** shot, facing and animation frame to the character's **canonical homepage portrait** (same face shape, hair/hood, skin detail, head size, body build, proportions, costume, accessories, dominant color palette, weapon and handedness). The game HUD must use this same identity, not a second character illustration.
- Existing original heroes (knight/ranger/wizard) establish the target realistic premium fantasy-art style, visual size, feet alignment and sharpness. Do not convert only a new hero to pixel/flat/vector art or hide mismatching identities behind glow.
- Female characters retain identifiable facial features and appropriate feminine silhouette/armor tailoring **without compromising believable combat equipment**. Never redraw a female character as someone else when changing direction or performing attacks.
- A new character must never draw the former hero's portrait, animations or weapon as an implicit loading fallback. Use a named, clearly documented same-character fallback (such as their full-resolution idle art).

## 3. Direction and animation contract

- **Direction index/order:** `0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE`. If art source column order differs, use an explicit tested mapping.
- Author a distinct, accurately faced `idle/ready` image for all eight directions. Where animated, author **consecutive real poses** for run/dash, basic attack/cast, special skill and appropriate hurt/death/victory. Target at least 10 run frames and 12 basic attack/cast frames where the game's `HeroAnimation.count` requests them; use a documented frame-timing map when art has fewer frames.
- Motion must have actual anatomy changes (stride, weight shift, cloak/cloth, blade/staff trajectory, shield and effect timing), stable identity and foot placement, and correct anticipation → strike/projectile release → recovery. Do not fake an eight-direction action by copying/mirroring a single right-facing sequence, or by toggling idle/guard frames and calling it running.
- A facing with only idle/guard is **incomplete**. Preserve a same-character fallback for that facing, mark `QA_PENDING`, and do not claim full eight-direction run/combat continuity.
- Keep weapon dimensions, left/right hand assignment, origin and real collision mechanics independent from visual frame silhouettes. No animation may move hitboxes, create duplicate projectiles or replace combat timing.

## 4. Splitting atlases and deterministic layout

- Use **multiple atlases when needed** instead of shrinking character art to fit. Example project paths (actual names depend on content): `src/assets/es2/production/heroes/<character-id>/<pose>-<direction>@3x.webp` or `<character-id>-<pose>-<sheet-index>@3x.webp`.
- Document for **every** atlas: file path, canonical character ID, source art reference, native source cell size, runtime cell size, `3×` source scale, columns/rows, direction order, pose/frame ordering, independent frame count and timing, foot anchor, transparency, SHA-256, compressed bytes, budget, and human QA status.
- Pack fixed-size frames with enough transparent gutters (or extrude transparent edge pixels) to avoid cross-cell bleed under filtering. Source coordinates must be exact integers and within the image; no fractional cell crop and no borrowing adjacent character parts.
- Keep each atlas within practical device maximum texture dimensions (prefer `≤4096×4096`, subject to real device testing). Optimize compressed bytes **and decoded memory**. Lazy-load the current character's required atlas at event/pose boundaries, never in the Canvas frame loop. Cache decoded images and pre-rendered frames with a strict bound; evict on character/art changes.
- Respect `prefers-reduced-motion`: use the same character's still, fully rendered frame, never blank screen or a different job's rig.

## 5. Mandatory character Create / Read / Update / Delete (CRUD)

All operations involving a playable hero, enemy, boss, summon, companion or NPC, including their assets and render consumers, MUST consult this rule first. CRUD applies to the character's canonical source art, animation atlases, portraits, HUD, data registry, runtime bindings, saved-game references and QA evidence.

- **CREATE:** Establish one approved canonical portrait/identity before generating animation. Create genuine native 3× frames and all required facings/poses in local production asset directories, then record source provenance, hashes, budgets, anchors, fallbacks and explicit QA status. A character without complete required art must remain `QA_PENDING` and cannot be presented as production-finished.
- **READ / REVIEW:** Trace the selected hero/character's complete runtime asset mapping before making changes. Inspect authentic source resolution rather than file names or resampled dimensions; inspect frame crops, transparency, directions, real 1× rendering, and all portrait/HUD/combat consumers. Read-only inspection alone never triggers regeneration or deletion.
- **UPDATE / REPLACE:** Preserve the approved identity, equipment handedness, role and gameplay hitboxes; use genuinely newly authored detailed poses rather than interpolation. Update dependent pose maps, foot anchors, frame rects, accessibility fallbacks, local imports, tests and manifests together. Do not activate partly redrawn atlases over valid art merely to silence QA.
- **DELETE / RETIRE:** Locate every code/manifest/saved-state reference, remove or migrate consumers safely, and invalidate decoded caches. Preserve save migration or a documented same-character fallback when applicable; no broken Vite imports, stale IDs or substitution with another hero's art. Keep legacy assets only while referenced and explicitly record archival status.
- **Any CRUD merge gate:** Treat art, code integration, and real in-game visual evidence as one transaction. Re-run affected TDD regressions plus `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`. A passing CI run is not a substitute for visual/manual QA. Never switch `QA_PENDING` to `APPROVED` without authentic native-source evidence and all required direction/action clips.

## 6. Required implementation order and evidence

1. Inspect and approve the actual portrait and every source sprite at real pixel resolution; **generate/correct and commit assets into the project path first**.
2. Add a manifest with a clear `native3x` and `QA_PENDING|APPROVED` field for each character, pose and direction. Do not invent completed frames or promote source interpolation.
3. Add RED regression tests for exact file presence, source resolution, frame dimensions and safety gutters, direction/pose indexes, animation continuity, timing, scale/anchor, fallback, reduced motion and device memory bound.
4. Implement Vite asset imports plus actual game-world Canvas, homepage, HUD and skill usages. Replace deprecated data URLs, empty previews, and art-only orphan files.
5. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, inspect contact sheets and browser gameplay screenshots at desktop and mobile landscape/portrait. For actual 3× claim, compare at **1× rendered size** against the original three heroes and inspect image detail/alpha.
6. Release status is **BLOCKED** until all required angles and motion clips, visual identity, and runtime performance have evidence. CI passing alone is not artistic signoff.

## Existing ES2 transition

The three new heroes currently have `900×900` portrait WebPs and `3072×1920` nominal `384×384`-cell 8×5 motion sheets with authentic source drawings about `198×198` per cell. These **are not yet native 3× character-movement masters**. They have eight-direction idle/guard but only side-facing authored running/attack/special frame sequences. Retain `QA_PENDING` until real higher-detail, complete directional sources are generated, committed and wired; do not falsely claim that more frames were produced just because interpolated output dimensions are large.
