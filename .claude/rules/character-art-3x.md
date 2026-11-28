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

## 3–4. Direction, animation and atlas layout

§3 (direction order, five-source-first policy, asymmetric facing exception, horizontal reuse) and §4 (atlas splitting, gutters, deterministic layout) live in `character-directions-atlas.md`, with the current ES2 hero transition status. Read it before ordering, generating, mirroring, packing or wiring any directional or animated character art.

## 5. Mandatory character Create / Read / Update / Delete (CRUD)

All operations involving a playable hero, enemy, boss, summon, companion or NPC, including their assets and render consumers, MUST consult this rule first. CRUD applies to the character's canonical source art, animation atlases, portraits, HUD, data registry, runtime bindings, saved-game references and QA evidence.

- **CREATE:** Establish one approved canonical portrait/identity before generating animation. Create genuine native 3× frames and all required facings/poses in local production asset directories, then record source provenance, hashes, budgets, anchors, fallbacks and explicit QA status. A character without complete required art must remain `QA_PENDING` and cannot be presented as production-finished.
- **READ / REVIEW:** Trace the selected hero/character's complete runtime asset mapping before making changes. Inspect authentic source resolution rather than file names or resampled dimensions; inspect frame crops, transparency, directions, real 1× rendering, and all portrait/HUD/combat consumers. Read-only inspection alone never triggers regeneration or deletion.
- **UPDATE / REPLACE:** Preserve the approved identity, equipment handedness, role and gameplay hitboxes; use genuinely newly authored detailed poses rather than interpolation. Update dependent pose maps, foot anchors, frame rects, accessibility fallbacks, local imports, tests and manifests together. Do not activate partly redrawn atlases over valid art merely to silence QA.
- **DELETE / RETIRE:** Locate every code/manifest/test/capture/saved-state reference, remove or migrate consumers safely, and invalidate decoded caches. Preserve save migration or a documented same-character fallback when applicable; no broken Vite imports, stale IDs or substitution with another hero's art. Keep legacy assets only while referenced or needed for original-source/QA provenance and explicitly record archival status.
- **DEDUPLICATE at import and replacement:** Compare SHA-256 (or exact Git blob IDs) for image files under the character asset root and temporary extracted upload paths. Review visually equivalent mirrored atlases separately; same pose labels or similar silhouettes do not prove equivalence. Prefer one canonical source for identical bytes or a verified safe runtime reflection; redirect every consumer and update manifests/anchors/hashes/tests/capture tooling before retiring redundant copies. Do not retain separate mirrored exports or identical extracted copies for convenience. Preserve the sole original master, distinct authored poses and necessary repair/QA evidence. Record removed paths, canonical replacements, bytes saved and verification results. If no safe duplicate exists, record zero removals rather than delete unique art. Do not rewrite Git history to reclaim storage.
- **Any CRUD merge gate:** Treat art, code integration, and real in-game visual evidence as one transaction. Re-run affected TDD regressions plus `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`. A passing CI run is not a substitute for visual/manual QA. Never switch `QA_PENDING` to `APPROVED` without authentic native-source evidence and all required direction/action clips.

## 6. Required implementation order and evidence

1. Inventory existing sources and consumers, assess safe horizontal reuse and duplicate cleanup, then inspect the actual portrait and every required source sprite at real pixel resolution. **Generate/correct only missing or unsuitable unique assets and commit them into the project path first**; reuse existing assets directly when eligible.
2. Add a manifest with a clear `native3x` and `QA_PENDING|APPROVED` field for each character, pose and direction. Do not invent completed frames or promote source interpolation.
3. Add RED regression tests for exact file presence, source resolution, frame dimensions and safety gutters, direction/pose indexes, animation continuity, timing, scale/anchor, fallback, reduced motion, hero switching, every supported facing, mobile sizes, actual on-screen 1× rendering and device memory bound.
4. Implement Vite asset imports plus actual game-world Canvas, homepage, HUD and skill usages. Replace deprecated data URLs, empty previews, and art-only orphan files.
5. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, inspect contact sheets and browser gameplay screenshots at desktop and mobile landscape/portrait. For actual 3× claim, compare at **1× rendered size** against the original three heroes and inspect image detail/alpha.
6. Release status is **BLOCKED** until all required angles and motion clips, visual identity, and runtime performance have evidence. CI passing alone is not artistic signoff.
