# Real-time Performance Rules — Eclipse Survivors

**Mandatory for any game logic, rendering, effects, terrain, AI, skills, physics, and performance change.** These rules apply to Vue 3 + TypeScript + Vite + Canvas 2D; do not replace the architecture or add dependencies simply for optimization.

**Preference order:** eliminate work → precompute immutable data → reuse bounded/valid caches → reject out-of-range work cheaply → optimize only measured bottlenecks. Never trade correctness, determinism, mobile, readability or fairness for speed. Write concise notes on why any necessary real-time computation cannot be precomputed and what invalidates each new cache; favor the simplest correct optimization over speculative abstractions.

## 1. Minimize calculations inside each simulation tick and animation frame

- **Do not recompute an invariant on every frame.** Precompute deterministic world geometry, cell contents, hazard positions, weather and ambient particle seeds, static trigonometric tables, icon/sprite geometry, and reusable gradients when initialized or first requested.
- Distinguish immutable inputs from live game state. **Only static hazard geometry may be cached; hazard activation, timers, enemy positions, attack warnings, health, projectile contact, and damage must stay current.**
- Before adding any math or allocation to a hot loop, ask: can this value be computed once, shared for the current tick, updated only when inputs change, or skipped entirely?
- Do not memoize per-frame results keyed by mutable references if the referred objects can move without cache invalidation.

## 2. Cache and precompute safely

- Use existing helpers and **bounded caches** for procedural infinite-world cells (e.g., obstacles and hazards); never retain every visited cell forever.
- Cache keys must include all dependencies (e.g., scene/biome and cell indices). On eviction, re-generated geometry and RNG results must match the original deterministic output.
- Rebuild or invalidate screen-dependent resources on viewport size, DPR, asset, palette, render context, or scene changes **when those inputs affect the cached output**.
- Keep memory usage stable for long-running / Endless runs. Avoid unbounded Maps, growing arrays, and pooled objects whose ownership or lifecycle is unclear.
- Reuse prepainted high-DPI sprites and stable Canvas gradients only when the visual result is equivalent. Do not share mutable draw-state objects across contexts incorrectly.

## 3. Reduce expensive math and redundant crowd scans

- For **range comparisons**, prefer `dx * dx + dy * dy < radius * radius` instead of `Math.hypot(dx, dy) < radius`. Preserve the original strict/inclusive boundary and combined hitbox radius.
- Do not calculate square roots for faraway enemies, distant XP crystals, or out-of-range AoE candidates. Calculate true distance only where needed for normalized movement, pull falloff, ordering, or precise intersections.
- Calculate each enemy's distance **once per operation** when sorting or selecting nearest targets; never call `Math.hypot` repeatedly in a `sort()` comparator. Keep sorting semantics and deterministic tie behavior.
- Share a distance or collision result only while positions are unchanged. Recompute after knockback, teleport, pull, dash, or another movement that invalidates it.
- Prefer early rejection and conservative bounding boxes before expensive precision tests. For dense projectiles or AoE, assess broad-phase or spatial indexing **only after profiling** shows repeated full-crowd scans are material.
- If optimizing swept projectile collisions, preserve tunneling prevention, first-contact order, pierce rules, boss immunity/visibility requirements, and duplicate-death prevention. Do not replace precise collision with incorrect proximity-only checks.
- Avoid unnecessary `sort()`, nested `filter()`/`map()`, closures, repeated `Object.keys()`, and temporary allocations in per-enemy/per-frame paths. Do not introduce custom pools or complex structures without measured benefit.

## 4. Rendering and effects are separate from gameplay simulation

- Cull dead, invisible, and offscreen sprites/effects **before** sorting, draw calls, path/gradient creation, and expensive transforms; leave a conservative margin for large sprites, particles, telegraphs, and boss effects.
- Offscreen culling must **never** disable required AI, collision, damage, cooldown, boss persistence, rewards, or victory checks. Do not incorrectly hide offscreen attacks whose telegraphs intersect the viewport.
- Precompute static weather noise and ambient positions; animate only time-dependent offsets, opacity and state.
- Keep independent audio and mobile input behavior intact; do not reintroduce low-resolution placeholders or silently degrade art to save CPU.
- Respect Canvas save/restore balance, device pixel ratio, resize behavior and context ownership when caching gradients or image assets.

## 5. Simulation correctness and fairness are non-negotiable

- Preserve exact hitboxes, target priorities, AI state transitions, attack cadence, cooldowns, skill evolutions, hazard phases, obstacle collision, XP, and boss-defeat victory behavior.
- Performance optimizations cannot silently lower enemy count, reduce simulation frequency, weaken enemies, skip meaningful hits, or change game difficulty.
- Handle long frames, pause/resume, mobile notifications and background/foreground transitions without multiplying damage or skipping required updates. Any AI throttling or adaptive quality strategy needs a separate measured design and deterministic regression tests.

## 6. Required test-driven workflow and performance evidence

1. Identify the bottleneck using a profiler, operation-count instrumentation, or a reproducible high-density scenario. Record the baseline and preserve relevant gameplay behavior.
2. **RED:** add a deterministic regression test demonstrating redundant work or equivalent behavior, then verify the expected failure.
3. **GREEN:** make the smallest correct fix; assert correctness (positions, hits, timing, visuals where testable), not merely an operation counter.
4. **REFACTOR:** remove duplicate code and unnecessary abstractions, then rerun the entire suite.
5. Check 130-mob scenarios, boss and offscreen enemies, projectile sweeps, exact range boundaries, crowd AoE, biome transitions, viewport/DPR changes, pause/resume, and cache eviction as relevant.

Keep `src/game/crowd-benchmark.test.ts` (130 mobs, simulation + mocked Canvas) **diagnostic**, never a single-run timing gate. Compare baseline and candidate under identical workloads over multiple runs. Profile real browser rendering and iOS/Android devices separately: median and p95/p99 frame time, allocations, memory, CPU, dropped frames, thermals, visual correctness. A mocked Canvas benchmark is **not** real-world FPS; never claim a speedup without measurement.

## 7. Review rule for every new hot-path operation

For any new loop inside `src/game/step.ts`, `src/game/enemies/`, `src/game/skills.ts`, `src/game/combat.ts`, `src/game/world.ts`, or `src/game/render/`:
- Explain briefly why the work must happen at that frequency.
- Identify inputs that change and the cache invalidation policy (if cached).
- Preserve test coverage for changed gameplay contracts and provide measured before/after evidence when making a performance claim.
- Prefer deleting unnecessary work to adding an elaborate optimization framework.

## 8. Visual fidelity with bounded Canvas work

**Mandatory for every new/modified skill card, combat animation, particle, projectile, shader-like Canvas effect, HUD treatment and skill artwork update.** Preserve approved art quality and effects while reducing redundant painting, and keep motion/accessibility modes. Higher fidelity must not silently reduce runtime effects, actor counts, resolution, attack timings, collision precision, or existing feedback. Optimize *how* visuals are drawn rather than disabling them.

1. **Measure actual work:** Record a representative baseline and after-change Canvas operation counts for the same deterministic scene (visible actors, sprites, images, paths, save/restore, shadows, canvas allocations, and retained cache entries). Use browser performance recording on a real desktop and mobile where possible; **drawImage count is not a GPU draw-call count** in Canvas 2D. Never promise a GPU batching benefit without profiling an actual GPU renderer.
2. **Art decode and lifespan:** Use Vite-owned local assets; instantiate/decode image sources once per renderer or session, never once per actor, hit, animation frame or render call. Avoid redownloading/recreating identical image assets. Prefer an existing signed-off 3× WebP or scalable source; don't deliberately downsample below the device's presentation requirement.
3. **Cache costly painting:** Prepaint reusable blur/glow/core geometry into a bounded, clear 3× offscreen sprite; reuse via drawImage instead of repeating shadowBlur/path/gradient work for hundreds of identical sparks. A cached entry must be keyed by its visual inputs (color, effective radius, quality or DPR when those affect the raster). Use bounded caches, clear on renderer disposal/asset invalidation, and inspect memory after long Endless sessions.
4. **Cull before work:** Discard purely decorative elements outside a conservative visible margin **before** allocating sprites, opening a Canvas state stack, calculating angles, drawing paths, or applying shadows. Never use decorative culling to disable AI, hitboxes, projectile collision, boss tells or offscreen attacks that overlap the visible screen.
5. **Minimize state transitions:** Avoid save/restore and shadow/filter/gradient setup for each object when simple alpha + a shared sprite gives equivalent output. Group effects with the same style where visually equivalent; use as few beginPath/stroke/fill calls as possible without changing silhouettes. Never replace real art with crude circles as a purported performance optimization.
6. **Animation only where meaningful:** Static/locked skill-collection art does not need to decode and animate every WebP simultaneously. Prioritize live, selected and actionable cards. Show pristine stills for inactive cards, use reduced-motion still fallbacks and avoid continuous background CSS filters, backdrop-filter, giant blurred panels and idle transforms on dozens of elements.
7. **Don't add a renderer lightly:** Canvas 2D drawImage has no cross-object GPU sprite batching contract. If profiling proves it insufficient, propose a measured single-renderer PixiJS v8 transition with proper batching, textures/atlases, texture reuse, explicit culling, hitbox parity, mobile WebGL fallback and TDD; **never** layer redundant Pixi render loops over current Canvas simply to gain an API, add PixiJS solely for aesthetics, or migrate partially without measured justification.
8. **Evidence gate:** Before completing VFX refactors, test 130 enemies, repeated weapon volleys, diverse sprite kinds, large bosses, mobile portrait/landscape, DPR 1/2/3, paused modal, visibility loss and scene transition. Verify asset presence, one-time loading, stable geometry and cache bounds; use Chrome Performance and screenshots to assess actual GPU, CPU, memory and readability. Record comparable draw operations plus real-device frame/memory evidence. CI passing alone is not a mobile performance benchmark.



## 9. Single-owner rendering, duplicate work and draw-operation budgets

**Mandatory for all current and future heroes, enemies, BOSSes, projectiles, summons, skills, evolutions, HUD and choice-card artwork.** These rules apply to every visual quality tier. A visually richer effect must not be implemented by blindly adding another layer over an existing effect.

- **Inventory ownership before implementation.** Trace the real simulation event → emitter → effect queue → render pass → draw routine → asset/cache. Record the logical effect identity, authoritative position/time, owning renderer and intentionally separate layers (e.g. ground danger outline versus above-actor impact). Check legacy and ES2 handlers, generic hit/impact hooks, content registry effects, hero animation/sprite overlays, fallback paths and CSS/DOM overlays. Remove or consolidate duplicate emissions and duplicate painting for the same visual purpose; do not deduplicate independent casts, legitimate targets or required gameplay feedback. One gameplay event may deliberately own distinct anticipation, release, contact and residual layers, with bounded lifetimes and no accidental second implementation.
- **Mutually exclusive art and fallback.** If an authored sprite is decoded, do not also paint its obsolete procedural core/outline/tail or second body/weapon. A fallback is only for unavailable art; it must preserve essential readability and must never replay a missed effect after decoding. Preserve distinct required warning boundaries, not redundant cosmetic rings. Do not draw a UI skill-card portrait or opaque icon as a substitute for an in-world effect.
- **Bake and reuse, not regenerate.** Prefer authored transparent 3× WebP (display at 1×, use the mandatory Polytool pipeline for new raster art), or appropriate scalable authored VFX sources. Precompose stable glow, shards, gradients, texture details and multi-layer motifs into a shared cached sprite/atlas where visually equivalent. Decode once per owner/context lifecycle; do not build canvases, Image instances, gradients, filters or textures per frame/cast/actor. Share identical immutable textures across abilities and actors with independent transforms, alpha and lifetime. Cache keys include actual raster inputs; set memory bounds, invalidation and disposal rules. Avoid large mostly transparent textures and excessive alpha overdraw.
- **Minimize draw operations and state churn.** Prefer a single drawImage for a ready precomposed melee ribbon, aura or summon body when equivalent. Batch fixed-count particle paths by style, reuse precomputed directions and immutable geometry, and minimize save/restore, style changes, strokes/fills, clipping, native shadowBlur and filter passes. Preserve compositing and z-order; never reorder overlapping transparent effects if that changes the appearance. Do not blindly add offscreen layers, full-screen postprocessing, new canvas elements or renderer loops. Cull conservative visual bounds before transforms, sorting, paths, allocations or texture requests; keep gameplay simulation authoritative.
- **Fixed cost and fair quality.** Set documented effect-specific particle/voice counts and global queue/cache budgets based on real peak workloads; continuous effects must not spawn new objects every render frame. Use simulation-clock lifetime, deterministic visual seeds and reuse of immutable data; no unbounded particle accumulation. Keep high-quality art, hazard visibility and gameplay geometry; reduced-motion/flashing modes retain meaningful static feedback without decorative motion. Any intentional artistic or balance redesign is separate from performance equivalence and needs explicit tests for collision, damage, cadence and counterplay.
- **UI compositing:** one image/animation per visible upgrade option; avoid simultaneous still + animated painting, duplicate icon/card layers, hidden animated images, and full-screen CSS filters. Preserve approved 3× still/animated WebP artwork and localized stat/rarity information. Use the shared art resolver and native reduced-motion selection. Review desktop, phone portrait/landscape, tablet and foldable.
- **Measure, do not conflate.** For each optimized path record baseline/candidate Canvas API counts (drawImage, fill, stroke, fillRect, save/restore, gradient/filter/shadow work and allocations), visible actor/effect counts, asset/cache bytes and workload/quality/DPR. An example: replacing three strokes and five fillRect calls with one ready drawImage changes 8 painting operations to 1 (87.5% fewer API painting operations), **not** a measured GPU draw-call or FPS improvement. Use actual GPU tooling for GPU draw calls, batches, texture switches, uploads and overdraw; measure CPU/GPU frame time and p95/p99, memory/GC, dropped frames and thermal behavior on real devices. Never fabricate a measurement or mark a missing benchmark passed.
- **Renderer choice:** reuse the existing single Canvas 2D owner unless profiling justifies a measured renderer migration. If PixiJS is approved, use texture atlases, shared textures/materials, stable blend modes and supported particle batching, with measured batch breaks and resource budgets. Do not layer a permanent second renderer over Canvas for duplicate actors or effects. Preserve accessibility, device quality, input, world/camera transforms and offscreen simulation parity.
- **Acceptance tests:** deterministic RED/GREEN checks for single emission and mutually exclusive ready-art/fallback rendering, correct per-layer ownership, bounded queues/cache, offscreen culling, exact hitbox and safe-zone parity, pause/resume, resize and context disposal. Compare the same representative normal and 130-mob dense scenes, repeated volleys, boss P1/P2/P3 and upgrades at DPR 1/2/3. Require real browser captures and device evidence for visual/performance sign-off. Label incomplete art, audio, CI or profiling `QA_PENDING`; never lower existing gates to make an unverified change pass.
