# TODO — Eclipse Survivors

## Hero costume artwork (not complete)

- [ ] Replace aura-only legacy cosmetics (knight-gilded, ranger-moonlit, wizard-astral) with actual approved costume variants. Current equipped IDs persist and drive the existing world aura and lobby preview, but do not change garment/armor pixels.
- [ ] Produce canonical costume portraits and native 3× transparent WebP idle/run/attack/cast/hurt/death/victory assets using the existing character art and rigid-weapon contracts. Reuse mirrored directions only where silhouette and weapon handedness stay correct; preserve each hero identity. Do not use full-character tint as a substitute for authored clothing.
- [ ] Extend the cosmetic catalog to the three specialization heroes with explicit per-hero ownership/unlock/save migration; ensure legacy base-class mapping cannot accidentally select a different hero's costume.
- [ ] Connect each cosmetic to the menu preview, HUD and actual animation atlas for every supported direction/pose, with identity-safe load fallback, bounded caching, no per-frame image creation, and unchanged hitboxes, stats, weapons and attack origins.
- [ ] Add TDD for selection/save/reload, locked states, all six heroes, actual selected asset/render identity, both locales, all devices and reduced-motion. Capture real menu/game screenshots and motion clips; verify native 3× quality, WebP workflow and performance before accepting the costumes as complete.


### Six-hero costume runtime audit (2026-11-26)

Verified against `06063349438f5ca5dec848afba938643580df6b4`: `src/meta/cosmetics.ts` defines only three non-default legacy aura palettes; `src/game/engine.ts` persists/equips by legacy JobId and sets the selected aura at run start; `src/game/render/characters.ts` draws that aura but selects character artwork independently of the cosmetic ID. `HeroPortrait.vue` also resolves by HeroId only. The original three lobby cards bind the equipped palette, whereas `HeroRoster.vue` has no equipped-cosmetic binding. All six costume cards have their correct base-hero portrait and unlock text, but none has a distinct equipped costume artwork path. No actual costume variants were found in the inspected repository tree. This is source inspection, not real-browser acceptance.

| Hero | Current advanced aura / ownership | Actual costume portrait + motion |
|---|---|---|
| Knight | knight-gilded — 曙光鎏金 | Pending |
| Ranger | ranger-moonlit — 月影獵裝 | Pending |
| Wizard | wizard-astral — 星界法衣 | Pending |
| Shadowblade | shares knight-gilded | Pending; needs own cosmetic ID |
| Spirit Summoner | shares wizard-astral | Pending; needs own cosmetic ID |
| Crimson Paladin | shares knight-gilded | Pending; needs own cosmetic ID |

- [ ] Knight: author and integrate the actual 曙光鎏金 costume (distinct gilded armor, preserve knight identity).
- [ ] Ranger: author and integrate the actual 月影獵裝 costume (distinct lunar hunter garments, preserve ranger identity).
- [ ] Wizard: author and integrate the actual 星界法衣 costume (distinct astral robes, preserve wizard identity).
- [ ] Shadowblade: design, author and integrate a distinct specialization-specific costume, localized name, real unlock condition and stable ID.
- [ ] Spirit Summoner: design, author and integrate a distinct specialization-specific costume, localized name, real unlock condition and stable ID.
- [ ] Crimson Paladin: design, author and integrate a distinct specialization-specific costume, localized name, real unlock condition and stable ID.
- [ ] Make the three specialization lobby cards reflect the equipped cosmetic immediately; keep their own canonical portraits and selection state, shared visual component/style and only the selected hero's prominent gold glow. Use the same authoritative equipped-cosmetic resolver for all six heroes.
- [ ] For each of the six costumes, demonstrate an actual outfit change (not merely aura, whole-character tint, or a different preview thumbnail) in the cosmetic picker, lobby, hero details, loading/result portraits, HUD wherever hero art is displayed, and live battle through idle, movement, dash, attack, active skill, hurt, death and victory; switch back to default and verify save/reload and account changes. Verify correct assets, unchanged combat stats/physics, locked equip denial, and independent hero ownership with no cross-hero bleed. Keep all individual entries unchecked until actual assets, runtime integration and regression/browser QA have passed.

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

Implementation status (2026-11-26): substantial implementation integrated. See [ES3 evidence report](docs/es3-combat-acceptance.md). Run 45696301536 at f9ca7928: 1,942 passed, 1 skipped, 1 acknowledged manual art gate failure. Run 45696301552: all five diagnostic tests, typecheck, build and release checks passed; real browser found a 1024x768 tablet hero-card clipping regression. Corrective implementation 99b12c5f and subsequent faction dissolve test/implementation await final exact-HEAD acceptance. Owner authorized implementation-first batching without waiting on CI between batches. Unchecked items remain unverified; tests written before implementation but not observed RED/GREEN must not be claimed as completed TDD. Original manual art gate remains unchanged. Intermediate integrated run 45688647153 (ac1ccfd0): 1,846 passed, 1 skipped, only the acknowledged three-hero manual art gate failed; subsequent commits require final verification.

### Wave 0 — Baseline [P0]
- [x] Count only living faction actors in same-tick encounter pressure telemetry (observed RED 45701923875; GREEN 45702064115).
- [x] Deterministic seed scenarios and per-run combat statistics. Implemented: bounded 10-second combat telemetry, deterministic opening fixtures and run-result fields. Verified: 45798704355 (73562cf2).
- [x] Measure XP, DPS, kill speed, and encounter pressure curves. Implementation and deterministic GREEN evidence in 45696301552; measured four-mode curves and comparison recorded in docs/es3-combat-acceptance.md. Formal RED evidence not reconstructed. Verified: 45798704355 (73562cf2).
- [x] Establish automated frame-time, memory and draw-operation baselines using comparable workloads; two comparable diagnostic runs recorded in docs/es3-combat-acceptance.md; browser GPU measurements not inferred from mocked Canvas. Physical-device thermal and manual hardware sign-off WAIVED for ES3. Verified: 45798704355 (73562cf2).

### Wave 1 — Combat Juice [P0; first delivery]
- [x] Share typed elemental/evolution/hero impact audio and directional camera kick across legacy and faction damage (observed RED 45701923875; GREEN 45702064115).
- [x] Normal/heavy/critical contact differentiation with single cached rendering path and priority preservation (RED 45683517312; GREEN 45683993331).
- [ ] Remaining tiered impact feedback: evolved, mass kill, boss stagger, hero active and boss death. Implemented distinct mass-kill feedback, boss break/cleanse, typed elemental/evolution/hero contact, existing skill-specific owners and bounded authored-contact texture reuse. Six native vector-rasterized 480×360 WebP contact textures uploaded in 0f4bbb8. RED 45805083905; GREEN 45811884654 and 45812374428 (7 contact tests). Actual Chromium decoded and painted all six uploaded textures, including critical priority and reduced-flashing alpha, at d16f6e79 (45815206266). Static checks initially rejected valid VP8L; corrected parser for VP8L/VP8X. Latest regression pending; manual visual acceptance not claimed.
- [x] Legacy heavy/critical local animation hit stop (35/50ms) without pausing simulation or input (RED 45684497744; GREEN 45685008359).
- [x] Extend local hit stop to faction and boss-specific poses; directional knockback acceptance. Implemented local pose hold for faction and boss;  Verified: 45804676946 (ade37dc7; only known three-hero art gate failed). Observed boss production-renderer RED 45804252908 → GREEN 45804676946; warning progresses while body is held.
- [ ] Authored enemy hit, death and dissolve animations; preserve art identity. Implemented bounded original-art death fade/pose, material-colored dissolves and elite/large-enemy lifetime differentiation; preserve boss identity/phase after death. Existing canonical artwork retained. Five new concept references are REVIEW_ONLY, ~250px native per cell, not valid 420px native content; no replacement art admitted. All five native 2×2 candidates uploaded at 3d9bc75e (20 frames), with canonical source provenance; opt-in DEV review implemented at e645a10c. Added exact five-ID inventory and real Chromium pixel/crop/gutter checks; these checks and owner visual approval remain pending. Canonical release artwork retained.
- [x] Critical and damage-number hierarchy; preserve danger readability. Implemented incoming/critical/normal priorities and heavy/elemental/evolved/hero/healing labels.  Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Authoritative kill streak and burst multikill counts, expiry/reset, legacy and faction kill ownership; no damage bonus (RED: 45680983083; GREEN test log: 45681389783, combat.test.ts; later workflow steps cancelled by newer HEAD).
- [x] Live combo HUD, game-clock expiry and bilingual highest streak/multikill run results (RED 45681795019; GREEN 45682705645, engine/HUD/result tests).
- [x] Six kill streak milestones (10/25/50/100/200/500), highest-per-tick feedback and rate-limited layered cue (RED 45684497744; GREEN 45685008359).
- [x] Further distinct milestone visual/audio presentation and multikill feedback. Implemented capped per-tick milestone and burst cues with six separate layered audio sequences, bounded impact waves; GREEN full suite at f9ca7928. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Layered combat/kill SFX, rate limiting, preserve complete active-skill playback. Implemented normal/heavy/critical/elite cues and preserved existing active skill lifecycle; gameplay tests passed at f9ca7928 and e81f7fdd. Test-first 8ded420c and implementation 2b6d9e97 share living legacy/faction pressure with adaptive combat music;  Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Camera impact and accessibility controls; reduced motion/flashing, supported mobile haptics. Implemented opt-in touch-only haptics and reduced-flashing lightning;  Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).

### Wave 2 — Power Fantasy [P0; first delivery]
- [x] Five distinct rarity-specific claim signatures routed from the actual acquired relic; preserve one claim. Test-first b7bdd9f2, implementation 786d1405; unit suite GREEN for gameplay at cc87cf77 and e81f7fdd (45754080001); historical test-only RED not observed. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Review skill Lv.1–5 power curves; keep tuning in balance config. Reviewed legacy and arsenal rank previews; added config-driven capstones for all 12 ES2 weapons with corresponding previews; unified legacy/faction targeting for six area skills, chain, 12 weapons and 12 ES2 evolutions; GREEN full suite at f9ca7928. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Chain lightning Lv.1–5 target progression, Lv.4 shock and bounded Lv.5 kill discharge; actual damage and upgrade preview (RED 45684497744; GREEN 45685008359).
- [x] Other qualitative rank breakthroughs: projectile count, AoE, elemental effects or summons. Implemented orb extra blade, bolt shock, frost/vortex/blaze/meteor outer-range bonuses and all twelve arsenal Lv.5 qualitative bonuses. GREEN full suite at f9ca7928. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Improve first-upgrade timing with mode-specific balance tests. Implemented mode-specific first XP thresholds, unchanged subsequent growth, and deterministic opening test. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Coalesce same-tick XP gem pickup audio while preserving exact per-gem XP and pickup receipts (RED: run 45677562464; GREEN: run 45678439675, step.test.ts).
- [x] XP gem acceleration and same-tick collection, preserving exact XP and pickup receipts (RED: run 45680019938; GREEN: run 45680367799, step.test.ts; player simulation path verified).
- [x] XP gem trails and exact bounded overflow conservation, including all original per-drop receipts in legacy/faction paths. Trail RED 45680983083 / GREEN 45681389783; overflow RED 45683517312 / GREEN 45683993331; manual visual acceptance WAIVED.
- [x] Optional global magnet reward and enhanced absorption feedback. Implemented 5-second global magnet event, exact receipt-preserving collection and coalesced burst cue; GREEN full suite at f9ca7928. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [ ] Rare/epic/legendary chest reveal animations with skip, single claim and uninterrupted essential audio. Implemented five tiers (including cursed), deterministic offers, matching reveal/claim cues, original WebP art and skip/reduced-motion controls. Independent Epic WebP is now uploaded and wired; manifest/overlay/loader tests passed at ade37dc7. GREEN full suite at f9ca7928; specific live chest reveal browser acceptance pending.
- [x] Distinct evolution reveal and actual gameplay transformation. Implemented upgrade-specific reveal and unified damage ownership with actual gameplay evolution effects; GREEN full suite at f9ca7928. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).

### Wave 3 — Build Synergy [P1]
- [ ] Unified element/build tags.
- [ ] Freeze shatter, burn spread, shock chain.
- [ ] Eight viable builds: frost shatter, lightning chain, infernal burn, spirit summons, shadow crit, holy counter, blood berserker, void gravity.
- [ ] Branching weapon evolution (e.g. storm, void lightning, divine lightning).
- [ ] Show build compatibility on upgrade choices.
- [ ] Bound proc recursion and avoid runaway damage.
- [ ] Build balance and weighted-selection tests.

### Wave 4 — Encounter Director [P1; first delivery]
- [x] Opening-wave legacy and faction actors use bounded terrain-safe placement without moving the hero (RED 45701540066; GREEN 45702064115).
- [x] Objective-mode-specific ordinary encounter cycle configuration, preserving explicit boss/wave gates (test-first b7bdd9f2; implementation 786d1405; unit suite GREEN for gameplay at e81f7fdd (45754080001); historical test-only RED not observed). Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Audit and extend existing director, single authoritative spawn owner. Implemented ordinary and faction spawn pulse integration with shared actor caps. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Eight encounter identities and legacy spawn composition policies; deterministic rotation, swarm/elite live tests (RED 45684497744; GREEN 45685008359).
- [x] Integrated encounter acceptance across all eight compositions and faction spawn ownership. Added production-pulse tests for seven assaults plus recovery, per-run seed, distinct intervals and shared faction treasure XP; GREEN full suite at f9ca7928. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Pressure peaks and recovery windows scaled by mode duration; preserve boss timing, win rules and actor caps. Live assault/reward interval multipliers implemented; RED 45680983083 / GREEN 45681389783; mode-specific cycle scaling RED 45684497744 / GREEN 45685008359; full integrated suite GREEN for automated behavior at f9ca7928.
- [x] Risk/reward world events, cursed offers and optional dangerous treasure. Implemented optional guarded legendary vault payout using confirmed deaths, existing curse/transaction UI. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Boss stagger, weakness windows and phase transitions with readable telegraphs; preserve collisions. Implemented recovery-only break, one per phase, 1.25s weakness and 1.25× damage. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).
- [x] Boss kill and battlefield cleansing audiovisual presentation. Implemented hostile projectile/hazard cleanup on actual boss death; four identity-specific bilingual defeat notices and palettes, plus objective-boss death pose retention until the next scheduled encounter. Tests passed at e81f7fdd (45754080001); test-only runs cancelled. Verified: 45804676946 (ade37dc7; only known three-hero art gate failed).

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
- [ ] Observed RED → GREEN → REFACTOR and full regression suite. Current round observed production boss RED 45804252908 / GREEN 45804676946 and contact routing RED 45805083905; historical RED evidence is incomplete; global art gate remains.
- [x] Gameplay parity across all quality settings. Fixed-seed low/medium/high parity test passed in 45696301552 and 45696950248; formal RED not observed. Verified: 45798704355 (73562cf2).
- [x] Automated responsive and localization regression coverage for desktop, phone portrait/landscape, tablet and foldable; manual device review WAIVED. Real Chromium run 45702064486 at ba34d948 passed 11/12 profiles, including tablet landscape and desktop 1280/1440/1920. At cc87cf77 (45703042822) the 640×360 hover still timed out; test-first e93d8787, implementation 4fd0e1e1 and test typing fix d11be7d5 preserve/reposition active hover details on scroll. Unit regression passed at e81f7fdd;  Verified: 45798704355 (73562cf2).
- [ ] Reduced Motion and Reduced Flashing; no HUD or telegraph occlusion. Relevant unit suites passed at ade37dc7; responsive 12/12 at 73562cf2. Full danger-telegraph occlusion review still pending.
- [x] Actual gameplay screenshots and MP4 clips — WAIVED by owner for this ES3 delivery; no capture or review claimed.
- [x] Automated long-run diagnostics: p95/p99 timing, memory and comparable draw operations/overdraw; manual FPS and physical-device thermals WAIVED, do not invent metrics. Verified: 45798704355 (73562cf2).
- [ ] All required automated checks pass at exact HEAD, except the explicitly acknowledged three-hero manual art acceptance failure. Preserve original gate; never claim a red workflow is green. At ade37dc7, 2017 passed, 1 skipped, 1 known art gate failure; typecheck/build/release checks passed. At merged 3eda1848: 2022 passed, 1 skipped, 1 known art gate failure (45812374428); all 12 browser profiles and diagnostics passed (45812374133). Exact HEAD after new acceptance coverage remains pending.
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


## Adventurer Hall — Celestial Legacy growth board (2026-11-27)
- [x] Wave 1: derive research routes, rank totals, prerequisites and current/next benefits from the authoritative catalog; preserve prices, save and cloud transaction contracts.
- [x] Wave 2: shared circular WebP node template for research, starting equipment/blessings and legacy archive; desktop hover/focus, touch selection and explicit purchase; mastery progress.
- [x] Wave 3: consistent dark-fantasy art direction, existing 3x WebP icons, readable progress rings and connected paths, responsive narrow/landscape/tablet/foldable/desktop.
- [x] Wave 4: accepted-purchase-only finite upgrade animation, newly available route highlighting, original layered audio through existing SFX/mute bus; reduced motion/flashing.
- [ ] Add behavior regressions, execute RED → GREEN → REFACTOR, verify full CI and actual browser viewport matrix in both locales.
- [ ] Review actual game screenshots and audition the upgrade cue on desktop/mobile; do not claim manual art/audio approval from automated tests.

Implementation checkboxes above denote source changes only; actual Chromium matrix and art/audio review remain independent gates below. No balance changes or new prerequisites introduced.

Added original deterministic PCM rank (0.74s) and milestone (1.05s) cues using the existing audio context, cached buffer and mute bus; no new audio dependency. Browser matrix now visits the growth board on each existing viewport profile, checks no-spend inspection and captures screenshots. Full runtime verification remains unchecked.

- [x] Hall motion polish: interpolated rank/XP fill, finite metallic shimmer, newly unlocked route sweep, layered particles and distinct max-rank celebration; respect motion/flashing settings.
- [ ] Fix CI TS2339 in progression regression and confirm typecheck, Hall tests, and responsive gameplay.

Motion polish uses finite CSS-only effects, no continuous animation loop. Added cap, newly revealed connection, rank-progress and cached/muted audio regression tests; type error fixed in test source, CI confirmation pending.

Browser acceptance now checks actual WebP decode, different-node inspection, both game accessibility flags and English/Traditional Chinese screenshots on every existing viewport profile. Latest CI must confirm; no manual art/audio approval claimed.

- [x] Correct legacy Hall prices, rank caps, and bonuses to match the authoritative research configuration. Display the actual selected specialization's namespaced mastery while retaining existing classic equipment eligibility. Regression coverage added; runtime CI verification pending.

- [x] Hall sound palette: distinct original hover, inspection, transaction denial, rank, route reveal, max rank, equipment, and blessing Foley; single managed bus, bounded voices and no duplicate generic click. Add waveform and routing regressions; audition final audio in game.

Hall sound source implementation and regressions added; waveform checks and full integration CI recorded separately. Manual listening remains unchecked.

- [x] Compact Hall layout: remove repeated card descriptions/purchase controls, one selected-node detail per board, compact topology at all sizes, refined layered metal progress rings and destination unlock animation. Preserve existing assets, sounds and transaction rules; verify actual responsive render.

Compact topology implementation: one visible confirmation per board; unchanged WebP art; metal bezel, inset, tick marks, moving progress head; destination pulse on true prerequisite unlock. Runtime viewport matrix and aesthetic approval remain pending.

- [x] Hall compact confirmation safety: hover/focus previews never authorize a different node's purchase; only explicit selection enables the single confirmation. Added a behavioral regression; runtime verification pending.

- [ ] Hall UX: one accessible category at a time (research, mastery, equipment/blessings, achievements); touch viewport inspector with close and safe-area handling, no forced scroll; desktop hover stays inline; preserve selection, explicit spend, art, audio and motion. Add regression and viewport checks.
