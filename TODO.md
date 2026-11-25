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
Implementation branch: `feature/es3-combat-juice-power-pacing-rewards`. First delivery: discussion sections 4, 5, 8, 9; all other items remain tracked. Check off implemented behavior after observed RED/GREEN and automated player-path acceptance; retain existing TODO sections. For this ES3 branch only, the owner explicitly waives manual visual/audio/device review, physical thermals, screenshots/MP4 delivery and other manual-only gates (2026-11-26). Record these as WAIVED (not measured or performed); do not let them block this delivery. Automated regressions, build and release checks remain required; the existing three-hero manual art acceptance failure is an acknowledged exception, not an approval or a reason to change the gate. Preserve input, audio lifecycle, hitboxes, saves, bilingual UI, and mobile accessibility. Prefer existing renderer; PixiJS allowed only with measured benefits, single-owner drawing, bounded particles, batching, draw-call/overdraw budgets and comparable mobile visual quality.

Implementation status (2026-11-26): feature and regression-test commits are staged for final integrated validation. Owner authorized implementation-first batching without waiting on CI between batches. Unchecked items remain unverified; tests written before implementation but not observed RED/GREEN must not be claimed as completed TDD. Original manual art gate remains unchanged. Intermediate integrated run 45688647153 (ac1ccfd0): 1,846 passed, 1 skipped, only the acknowledged three-hero manual art gate failed; subsequent commits require final verification.

### Wave 0 — Baseline [P0]
- [ ] Deterministic seed scenarios and per-run combat statistics. Implemented: bounded 10-second combat telemetry, deterministic opening fixtures and run-result fields.
- [ ] Measure XP, DPS, kill speed, and encounter pressure curves. Implemented instrumentation and four mode opening-curve test cases; numerical run results pending.
- [ ] Establish automated frame-time, memory and draw-operation baselines using comparable workloads; physical-device thermal and manual hardware sign-off WAIVED for ES3.

### Wave 1 — Combat Juice [P0; first delivery]
- [x] Normal/heavy/critical contact differentiation with single cached rendering path and priority preservation (RED 45683517312; GREEN 45683993331).
- [ ] Remaining tiered impact feedback: evolved, mass kill, boss stagger, hero active and boss death. Implemented distinct mass-kill feedback and boss break/cleanse; evolution and hero active reuse their existing effect owners.
- [x] Legacy heavy/critical local animation hit stop (35/50ms) without pausing simulation or input (RED 45684497744; GREEN 45685008359).
- [ ] Extend local hit stop to faction and boss-specific poses; directional knockback acceptance. Implemented local pose hold for faction and boss; automated regression pending.
- [ ] Authored enemy hit, death and dissolve animations; preserve art identity. Implemented bounded original-art death fade/pose, no bespoke new sprite sheets; manual art review waived.
- [ ] Critical and damage-number hierarchy; preserve danger readability. Implemented incoming/critical/normal priority budgets; acceptance pending.
- [x] Authoritative kill streak and burst multikill counts, expiry/reset, legacy and faction kill ownership; no damage bonus (RED: 45680983083; GREEN test log: 45681389783, combat.test.ts; later workflow steps cancelled by newer HEAD).
- [x] Live combo HUD, game-clock expiry and bilingual highest streak/multikill run results (RED 45681795019; GREEN 45682705645, engine/HUD/result tests).
- [x] Six kill streak milestones (10/25/50/100/200/500), highest-per-tick feedback and rate-limited layered cue (RED 45684497744; GREEN 45685008359).
- [ ] Further distinct milestone visual/audio presentation and multikill feedback. Implemented capped per-tick milestone and burst cues with bounded impact waves.
- [ ] Layered combat/kill SFX, rate limiting, preserve complete active-skill playback.
- [ ] Camera impact and accessibility controls; reduced motion/flashing, supported mobile haptics. Implemented opt-in touch-only haptics and reduced-flashing lightning; browser acceptance pending.

### Wave 2 — Power Fantasy [P0; first delivery]
- [ ] Review skill Lv.1–5 power curves; keep tuning in balance config. Reviewed legacy and arsenal rank previews; added config-driven capstone values and matching preview.
- [x] Chain lightning Lv.1–5 target progression, Lv.4 shock and bounded Lv.5 kill discharge; actual damage and upgrade preview (RED 45684497744; GREEN 45685008359).
- [ ] Other qualitative rank breakthroughs: projectile count, AoE, elemental effects or summons. Implemented orb extra blade, bolt shock, frost/vortex/blaze/meteor outer-range bonuses.
- [ ] Improve first-upgrade timing with mode-specific balance tests. Implemented mode-specific first XP thresholds, unchanged subsequent growth, and deterministic opening test.
- [x] Coalesce same-tick XP gem pickup audio while preserving exact per-gem XP and pickup receipts (RED: run 45677562464; GREEN: run 45678439675, step.test.ts).
- [x] XP gem acceleration and same-tick collection, preserving exact XP and pickup receipts (RED: run 45680019938; GREEN: run 45680367799, step.test.ts; player simulation path verified).
- [x] XP gem trails and exact bounded overflow conservation, including all original per-drop receipts in legacy/faction paths. Trail RED 45680983083 / GREEN 45681389783; overflow RED 45683517312 / GREEN 45683993331; manual visual acceptance WAIVED.
- [ ] Optional global magnet reward and enhanced absorption feedback.
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
- [ ] Audit and extend existing director, single authoritative spawn owner. Implemented ordinary and faction spawn pulse integration with shared actor caps.
- [x] Eight encounter identities and legacy spawn composition policies; deterministic rotation, swarm/elite live tests (RED 45684497744; GREEN 45685008359).
- [ ] Integrated encounter acceptance across all eight compositions and faction spawn ownership. Added production-pulse tests for seven assaults plus recovery; integrated results pending.
- [ ] Pressure peaks and recovery windows scaled by mode duration; preserve boss timing, win rules and actor caps. Live assault/reward interval multipliers implemented; RED 45680983083 / GREEN 45681389783; mode-specific cycle scaling RED 45684497744 / GREEN 45685008359; integrated acceptance pending.
- [ ] Risk/reward world events, cursed offers and optional dangerous treasure. Implemented optional guarded legendary vault payout using confirmed deaths, existing curse/transaction UI.
- [ ] Boss stagger, weakness windows and phase transitions with readable telegraphs; preserve collisions. Implemented recovery-only break, one per phase, 1.25s weakness and 1.25× damage.
- [ ] Boss kill and battlefield cleansing audiovisual presentation. Implemented hostile projectile/hazard cleanup on actual boss death.

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
- [ ] Gameplay parity across all quality settings. Added fixed-seed low/medium/high parity test.
- [ ] Automated responsive and localization regression coverage for desktop, phone portrait/landscape, tablet and foldable; manual device review WAIVED.
- [ ] Reduced Motion and Reduced Flashing; no HUD or telegraph occlusion.
- [x] Actual gameplay screenshots and MP4 clips — WAIVED by owner for this ES3 delivery; no capture or review claimed.
- [ ] Automated long-run diagnostics: p95/p99 timing, memory and comparable draw operations/overdraw; manual FPS and physical-device thermals WAIVED, do not invent metrics.
- [ ] All required automated checks pass at exact HEAD, except the explicitly acknowledged three-hero manual art acceptance failure. Preserve original gate; never claim a red workflow is green.
- [x] Document game-feel design rules (meaningful upgrades, hero identity, build diversity, fair difficulty, risk/reward, visual clarity, performance, accessibility, real evidence); see `.claude/rules/game-feel.md` and CLAUDE.md.

## Failing unit tests on `feature/es2-release-readiness-integration` (2026-11-26)

`pnpm test` at `d3bc0821`: 13 failed / 1800 passed / 1 skipped across 10 files. Deterministic (the same 13 fail when the files run alone) and unrelated to the Firebase cloud wallet. They block the release gate: `pnpm typecheck`, `pnpm build` and `pnpm check-release` are not reached in the chained command.

- [ ] `src/game/critical-feedback.test.ts` — a Shadowblade critical hit no longer emits `combat-vfx:critical-hit`
- [ ] `src/game/render/hit-impact.test.ts` — the critical contact impact lacks `contact: 'critical'`
- [ ] `src/game/render/es2/production-direction-no-flip.test.ts` — a left-octant attack no longer calls `scale` to mirror the 900px portrait
- [ ] `tests/es2/mobile/mobile-a11y-regressions.test.ts` — a stateful settings switch lacks `aria-pressed="false"`
- [ ] `src/components/es2/hud/style.test.ts` — the short-landscape info toggle rule (`font: 700 0/1.2 system-ui`) is missing
- [ ] `src/components/es2/menu/Es2AppliedArt.test.ts` — the archives render 0 of 4 biome scene images
- [ ] `src/components/es2/menu/Es2HeroStatParity.test.ts` — the hero card `radial-gradient(ellipse at 50% 50%` is missing
- [ ] `src/components/es2/menu/Es2SourceFramePreview.test.ts` (4 tests) — enemy/boss/decor preview animations and the `.es2-world-art-scene` `object-fit` rule are missing
- [ ] `src/assets/es2/production/ui/ui-runtime-sizing.test.ts` — the 3× art budget computes `NaN`
- [ ] `src/assets/es2/production/heroes/production-art.test.ts` — shadowblade, spirit-summoner and crimson-paladin are still unreviewed; this clears only with human visual approval, not a code change
