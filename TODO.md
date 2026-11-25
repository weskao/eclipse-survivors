# TODO — Eclipse Survivors

## Hero costume artwork (not complete)

- [ ] Replace aura-only legacy cosmetics (knight-gilded, ranger-moonlit, wizard-astral) with actual approved costume variants. Current equipped IDs persist and drive the existing world aura and lobby preview, but do not change garment/armor pixels.
- [ ] Produce canonical costume portraits and native 3× transparent WebP idle/run/attack/cast/hurt/death/victory assets using the existing character art and rigid-weapon contracts. Reuse mirrored directions only where silhouette and weapon handedness stay correct; preserve each hero identity. Do not use full-character tint as a substitute for authored clothing.
- [ ] Extend the cosmetic catalog to the three specialization heroes with explicit per-hero ownership/unlock/save migration; ensure legacy base-class mapping cannot accidentally select a different hero's costume.
- [ ] Connect each cosmetic to the menu preview, HUD and actual animation atlas for every supported direction/pose, with identity-safe load fallback, bounded caching, no per-frame image creation, and unchanged hitboxes, stats, weapons and attack origins.
- [ ] Add TDD for selection/save/reload, locked states, all six heroes, actual selected asset/render identity, both locales, all devices and reduced-motion. Capture real menu/game screenshots and motion clips; verify native 3× quality, WebP workflow and performance before accepting the costumes as complete.

## Skill level-up choice card artwork (not complete)

- [ ] Audit every item displayed in the in-combat skill level-up selection screen, including weapons, passive skills, hero passive upgrades, evolutions and other eligible upgrade choices. Inventory all items that do not already use actual WebP artwork, including SVG icons, inline SVG, CSS-drawn or Canvas-drawn illustrations, emoji, text-only placeholders and fallback glyphs.
- [ ] Replace every identified non-WebP illustration with newly authored, stylistically consistent, high-quality native 3× WebP artwork, preserving each skill's identity and recognizable effect. Follow the existing image-first asset workflow, mandatory Polytool `towebp` conversion and WebP-only delivery rules; preserve transparency where required.
- [ ] Wire the committed WebP assets into the actual skill selection cards, reuse the existing shared image mapping, and remove superseded illustration fallbacks and unused assets only after checking all consumers. Keep functional UI icons, accessibility labels, rarity indicators and numerical/text descriptions intact.
- [ ] Add regression coverage for all eligible upgrade IDs and image mappings, asset decoding, missing-art detection and desktop/mobile portrait/mobile landscape/tablet/foldable layouts in both locales. Verify real in-game level-up selection screenshots and ensure image loading does not introduce layout shifts or gameplay regressions.

### Missing legacy skill illustrations — 10 assets (2026-11-26)

History audit: commit `2c17c81eb27d1621e57b0be443cf3228276e3e4b` redrew these ten SVGs; the preceding revision also used SVGs, and no corresponding original raster assets were found in the inspected history. Author genuine skill-specific illustrations rather than merely rasterizing the existing SVGs or reusing unrelated artwork. Preserve all existing approved still/animated WebPs.

- [ ] `assets/skill-icons/speed@3x.webp` — movement speed
- [ ] `assets/skill-icons/haste@3x.webp` — attack speed/cooldown
- [ ] `assets/skill-icons/maxhp@3x.webp` — maximum health
- [ ] `assets/skill-icons/magnet@3x.webp` — pickup attraction
- [ ] `assets/skill-icons/bolt@3x.webp` — lightning bolt
- [ ] `assets/skill-icons/frozen-thunderstorm@3x.webp` — ice/lightning evolution
- [ ] `assets/skill-icons/infernal-singularity@3x.webp` — fire/gravity evolution
- [ ] `assets/skill-icons/apocalypse-rain@3x.webp` — apocalypse rain evolution
- [ ] `assets/skill-icons/blade-tempest@3x.webp` — blade evolution
- [ ] `assets/skill-icons/guardian-sanctuary@3x.webp` — defensive evolution

**Production and acceptance specification**

- [ ] Author square, native 3× art (1:1 aspect ratio; **384 × 384 px** for a 128 × 128 logical-pixel target, consistent with ES2 weapon/evolution art; existing legacy 96 × 96 logical-pixel / 288 × 288 px WebPs remain unchanged). Do not upscale low-resolution art. Preserve responsive 1× logical presentation; use contain/aspect-ratio-safe scaling without cropping or stretching. Review the actual responsive card sizes, including larger art areas, before approval.
- [ ] Match existing realistic dark-fantasy skill paintings, with distinct skill silhouettes, readable effects at small sizes, transparent alpha, clean edges, no baked text/rarity borders, no neighboring sprite pixels, and no generic SVG/emoji/CSS substitutes. Review a contact sheet beside approved legacy and ES2 illustrations.
- [ ] Use the existing mandatory Polytool `towebp` workflow in isolated staging with suitable high quality (prefer `-q 100`); commit genuine encoded WebP only. Verify dimensions, alpha, decoding, unique SHA-256, byte size and provenance. Static WebP is mandatory; if animated art is authored, also supply `<id>@3x-animated.webp` with matching still fallback, native 3× frames and manifest. Do not fabricate animation or require an animated file that does not exist.
- [ ] Commit assets before consumers. Update `src/game/ui-art.ts` and both the live ES2 choice cards and legacy `LevelUpOverlay.vue` through the shared resolver; preserve existing animated skills, hero-specific art, reduced-motion and still settings. Audit HUD/atlas consumers before changing shared helpers; do not incorrectly mark static-only assets as atlas-backed/animated. No SVG illustration fallback for these ten IDs; leave unrelated functional UI icons and world-space VFX alone.
- [ ] TDD: replace obsolete SVG expectations in `src/game/skill-art-choice.test.ts` and `src/components/ai-art-integration.test.ts`; cover all ten IDs, actual WebP files, normal/still/reduced-motion sources, rendered card image selection and missing assets. Run RED → GREEN → REFACTOR, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` and real browser QA on desktop/mobile portrait/landscape/tablet/foldable in en/zh-TW. Mark each asset and acceptance item `[x]` only after its corresponding verification; keep unverified items unchecked.

## ES3 — Combat & Replayability Expansion

Design reference: https://chatgpt.com/s/t_6b072b23233c8191b99e375f1b41e17d

Approved direction: C — hybrid: large-scale horde-clearing power fantasy, dark-fantasy RPG build depth, long-term progression. Initial design emphasis 50% combat, 30% strategy, 20% meta; not a fixed resource allocation or version bump.
Implementation branch: `feature/es3-combat-juice-power-pacing-rewards`. First delivery: discussion sections 4, 5, 8, 9; all other items remain tracked. Check off only after observed RED/GREEN and actual player-path acceptance; retain existing TODO sections. Preserve input, audio lifecycle, hitboxes, saves, bilingual UI, and mobile accessibility. Prefer existing renderer; PixiJS allowed only with measured benefits, single-owner drawing, bounded particles, batching, draw-call/overdraw budgets and comparable mobile visual quality.

### Wave 0 — Baseline [P0]
- [ ] Deterministic seed scenarios and per-run combat statistics.
- [ ] Measure XP, DPS, kill speed, and encounter pressure curves.
- [ ] Establish desktop/mobile frame-time, memory, draw-operation and thermal baselines.

### Wave 1 — Combat Juice [P0; first delivery]
- [ ] Tiered impact feedback: normal, heavy, critical, evolved, mass kill, boss stagger, hero active and boss death.
- [ ] Local animation hit stop (initial target 25–50ms) and directional knockback without pausing simulation, inputs, cooldowns or audio.
- [ ] Authored enemy hit, death and dissolve animations; preserve art identity.
- [ ] Critical and damage-number hierarchy; preserve danger readability.
- [ ] Kill streak and burst multikill feedback, records and bilingual HUD; proposed milestones 10/25/50/100/200/500, expiry/reset, no initial power bonus.
- [ ] Layered combat/kill SFX, rate limiting, preserve complete active-skill playback.
- [ ] Camera impact and accessibility controls; reduced motion/flashing, supported mobile haptics.

### Wave 2 — Power Fantasy [P0; first delivery]
- [ ] Review skill Lv.1–5 power curves; keep tuning in balance config.
- [ ] Qualitative rank breakthroughs: projectile count, AoE, chains, elemental effects or summons; e.g. chain lightning single target to chaining, shock, kill discharge and evolution.
- [ ] Improve first-upgrade timing with mode-specific balance tests.
- [ ] XP gem acceleration, trails, aggregate audio and optional magnet pickups; preserve exact reward totals.
- [ ] Rare/epic/legendary chest reveal animations with skip, single claim and uninterrupted essential audio.
- [ ] Distinct evolution reveal and actual gameplay transformation.

### Wave 3 — Build Synergy [P1]
- [ ] Unified element/build tags.
- [ ] Freeze shatter, burn spread, shock chain.
- [ ] Eight viable builds: frost shatter, lightning chain, infernal burn, spirit summons, shadow crit, holy counter, blood berserker, void gravity.
- [ ] Branching weapon evolution (e.g. storm, void lightning, divine lightning).
- [ ] Show build compatibility on upgrade choices.
- [ ] Bound proc recursion and avoid runaway damage.
- [ ] Build balance and weighted-selection tests.

### Wave 4 — Encounter Director [P1; first delivery]
- [ ] Audit and extend existing director, single authoritative spawn owner.
- [ ] Eight encounter compositions: Swarm Rush, Encirclement, Elite Invasion, Ranged Assault, Titan March, Treasure Rush, Eclipse Surge, Recovery Phase.
- [ ] Pressure peaks and recovery windows scaled by mode duration; preserve boss timing, win rules and actor caps.
- [ ] Risk/reward world events, cursed offers and optional dangerous treasure.
- [ ] Boss stagger, weakness windows and phase transitions with readable telegraphs; preserve collisions.
- [ ] Boss kill and battlefield cleansing audiovisual presentation.

### Wave 5 — Hero Identity [P1]
- [ ] Unique combat loops for all six heroes (warrior rage, ranger focus, wizard elements, shadow crit, spirit souls, paladin shield).
- [ ] Distinct active skill charge and cooldown interactions.
- [ ] Hero-specific skill synergies.
- [ ] Hero mastery/specialization live combat integration.
- [ ] Actual costume and appearance variation.

### Wave 6 — Replayability & Endgame [P2]
- [ ] Hero mastery and hero-specific challenges.
- [ ] Ascension difficulty modifiers.
- [ ] Daily and weekly seeded challenges (local scoring initially).
- [ ] Skill, evolution, relic and boss codex.
- [ ] Secret unlocks and transformative legendary relics.
- [ ] Build sharing, damage/DPS/kill contribution statistics.
- [ ] Results, next unlock goals and quick retry.
- [ ] Endless endgame with staged rule changes.
- [ ] Equipment/cosmetic collections, personal records and horizontal unlocks rather than mandatory currency grinding.

### Wave 7 — Integration & QA [P0; continuous]
- [ ] Observed RED → GREEN → REFACTOR and full regression suite.
- [ ] Gameplay parity across all quality settings.
- [ ] Real desktop, phone portrait/landscape, tablet and foldable QA in both locales.
- [ ] Reduced Motion and Reduced Flashing; no HUD or telegraph occlusion.
- [ ] Actual gameplay screenshots and MP4 clips, not mockups.
- [ ] Long-run FPS, p95/p99 frame time, memory, draw operations/overdraw, and physical-device thermals.
- [ ] All required CI checks pass at exact HEAD before completion.
- [ ] Document game-feel design rules (meaningful upgrades, hero identity, build diversity, fair difficulty, risk/reward, visual clarity, performance, accessibility, real evidence).
