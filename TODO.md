# TODO — Eclipse Survivors

## Six-hero base art and animation completion (2026-11-27, QA_PENDING)

Audit baseline: `cd719ce9b12e54e8453b3ddfc097fd8ef8cc7e6f`. This is a source/CI inventory, not human visual approval. The existing six heroes have artwork and a render path; this is not proof of complete native-3× motion. Do not count isolated candidate keyframes, generated rig poses, mirrored reuse, or nominal upscaled atlas dimensions as independently authored native frames.

| Hero | Current combat artwork | Native directional motion status |
|---|---|---|
| Knight | Original `src/assets/knight.webp` + rig/weapon layers | Existing functional pipeline; native source resolution and complete independently authored action coverage not verified |
| Ranger | Original `src/assets/ranger.webp` + rig/weapon layers | Same |
| Wizard | Original `src/assets/wizard.webp` + rig/weapon layers | Same |
| Shadowblade | Canonical portrait + split direction/action/special sheets | East 8-frame action strips; DEV candidate running in 7 authored facings plus explicitly opt-in E-to-W reflection |
| Spirit Summoner | Canonical portrait + split direction/action/special sheets | East 8-frame action strips; DEV candidates in 6 run facings; independent W/NW run candidates are present but not admitted |
| Crimson Paladin | Canonical portrait + split direction/action/special sheets | East 8-frame action strips; DEV candidates in all 8 run facings |

The original three WebP headers were inspected: Knight 340×345, Ranger 336×390, Wizard 327×390. At the current nominal renderer DIMS (108×134, 111×144, 117×147), their 3× source envelopes would be 324×402, 333×432, 351×441 respectively. Each falls short in at least one dimension; procedural baking does not add native detail. Actual visible bounds, rig masks and maximum UI display still require review before replacing any original source.

The three specializations have nominal 448px split cells from ~313px sources; the older 384px atlas has ~198px originals. Release non-East active poses hold the directional guard rather than playing complete authored actions. Hurt/death/victory hold the directional idle in the split-sheet path. No automatic portrait reflection is approved for these heroes. DEV preview currently inventories 27 selected four-frame atlases, 21 additional pending atlases, 24 independent keyframes, and separate mirrored review panels. These are distinct from production gameplay admission.

- [x] Inventory the six base hero render paths and distinguish candidate preview from runtime and native-art acceptance.
- [x] Register Batch 40 south shield brace and southeast run launch as review-only candidates; dedicated Hero Candidate Visual Review QA passed 27/27 at the audit baseline.
- [ ] Review original Knight/Ranger/Wizard source resolution, actual pose rendering, equipped weapon handedness and runtime max CSS bounds against the native-3× rule; preserve their existing functional rig unless replacement is warranted.
- [ ] Compare all three specialization candidate sets with their exact canonical portraits (face, hair, costume, equipment, facing and anatomical feet); reject mismatches and reuse valid originals. Preserve QA gates.
- [ ] Review Spirit Summoner independent W/NW run alternatives (batches 8/13 and 6/12); all remain `eligibleForDevWiring: false`. Static visual inspection of W batch 13 and NW batch 12 found metal boots instead of the canonical strapped shoes and changed headpiece/outfit details; NW batch 6 also adds a fox mask and different hairstyle. W batch 8 was inventoried by manifest only. Confirm actual right-hand staff, identity and anchors before admission; do not reflect East.
- [ ] Complete authored specialization run/dash (10), attack/cast (12) and special (8) frames per required facing, including transitions and consistent anchors. The strict eight-independent-direction reference target is 720 active frames across the three heroes; an explicitly approved reflection may reduce newly authored work but must be counted separately. Existing 4-frame candidates and 8-frame legacy sequences are not complete replacements.
- [ ] Complete native idle/ready, hurt, death, victory and recovery sequences; replace existing static/guard fallbacks only after validated art exists.
- [ ] For approved complete sequences, update manifests, measured foot anchors, exact crop geometry and the production renderer together; retain same-character decode fallback, reduced-motion and bounded caches; do not alter attack origins or hitboxes.
- [ ] Verify native source pixels versus displayed bounding dimensions, transparent source edges, unique authored frames, SHA-256, Polytool WebP conversion, actual mobile texture/memory budgets and full gameplay video evidence; retain manual production-art approval gate.
- [ ] Run full test/typecheck/build/release verification and desktop, tablet, phone portrait/landscape browser QA. Baseline integration CI: 1954 passed, 27 failed, 1 skipped; dedicated candidate QA: 27 passed; browser smoke failed. Art gate still blocks all three new heroes.

See `docs/es2/hero-native-3x-remaining-2026-11-23.md` for historical source details and `.claude/rules/character-art-3x.md` / `character-directions-atlas.md` for the governing contract. The separate costume work below is not included in base art completion.

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
- [x] Remaining tiered impact feedback: evolved, mass kill, boss stagger, hero active and boss death. Implemented distinct mass-kill feedback, boss break/cleanse, typed elemental/evolution/hero contact, existing skill-specific owners and bounded authored-contact texture reuse. Six native vector-rasterized 480×360 WebP contact textures uploaded in 0f4bbb8. RED 45805083905; GREEN 45811884654 and 45812374428 (7 contact tests). Actual Chromium decoded and painted all six uploaded textures, including critical priority and reduced-flashing alpha, at d16f6e79 (45815206266). Static checks initially rejected valid VP8L; corrected parser for VP8L/VP8X. Verified at 54cad221: real Chromium desktop/mobile-low decoded and painted all six contact textures and critical priority (45951315351); full regression 2199 passed, 1 skipped, only acknowledged hero art gate failed (45951315231). Manual visual review WAIVED for ES3.
- [x] Legacy heavy/critical local animation hit stop (35/50ms) without pausing simulation or input (RED 45684497744; GREEN 45685008359).
- [x] Extend local hit stop to faction and boss-specific poses; directional knockback acceptance. Implemented local pose hold for faction and boss;  Verified: 45804676946 (ade37dc7; only known three-hero art gate failed). Observed boss production-renderer RED 45804252908 → GREEN 45804676946; warning progresses while body is held.
- [x] Authored enemy hit, death and dissolve animations; preserve art identity. Implemented bounded original-art death fade/pose, material-colored dissolves and elite/large-enemy lifetime differentiation; preserve boss identity/phase after death. Existing canonical artwork retained. Five new concept references are REVIEW_ONLY, ~250px native per cell, not valid 420px native content; no replacement art admitted. All five native 2×2 candidates uploaded at 3d9bc75e (20 frames), with canonical source provenance; opt-in DEV review implemented at e645a10c. Real Chromium verified all 20 cells on desktop and mobile-low at 47ab3adc (45945481180). Owner requested normal gameplay integration on 2026-11-27; exact nativeDeathRuntime map now activates the five preferred atlases without a QA flag. Earlier mismatched atlases remain gated; individual visual review is pending. Verified at 54cad221: desktop/mobile-low painted 20 native cells and completed actual hit-to-expiry lifecycle, including reduced-motion and reduced-flashing checks (45951315351); full regression 2199 passed with only acknowledged hero art gate failure (45951315231). Individual visual review WAIVED for ES3; no approval recorded.
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
- [x] Rare/epic/legendary chest reveal animations with skip, single claim and uninterrupted essential audio. Implemented five tiers (including cursed), deterministic offers, matching reveal/claim cues, original WebP art and skip/reduced-motion controls. Independent Epic WebP is now uploaded and wired; manifest/overlay/loader tests passed at ade37dc7. GREEN full suite at f9ca7928; specific live chest reveal browser acceptance subsequently passed. Verified at 54cad221: real engine + production Vue chest flow passed rare/epic/legendary decode, skip, single claim, claim cue and system reduced motion in both browser presets (45951315351); full regression including existing audio continuity tests passed except the acknowledged hero art gate (45951315231). Manual audio review WAIVED for ES3.
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

- [x] Hall UX: one accessible category at a time (research, mastery, equipment/blessings, achievements); touch viewport inspector with close and safe-area handling, no forced scroll; desktop hover stays inline; preserve selection, explicit spend, art, audio and motion. Add regression and viewport checks.

Hall UX source implemented with one detail template (teleported only for floating layouts), no forced scrolling, four accessible category tabs, category-change dismissal and viewport regressions. Runtime CI and device validation remain open.

- [x] Hall rank ceremonies: distinct rank 1–4 and mastery sounds, combined destination-unlock finale (only complete prerequisites), synchronized sculpted ring and rank-specific particles, unlock notice visible in touch inspector; waveform and transaction regressions, actual audiovisual QA.

Rank-specific source and full-prerequisite destination finale implemented; manual audiovisual acceptance and full CI remain open.


## ES4 — Eclipse Ascendancy / 冒險者殿堂技能生態（2026-11-27）
Target: `feature/es4-adventurer-hall-skill-ecosystem`; base: `54cad2219010381e14ab8db5f2baf87bf5a921ef`.
Design: [spec](docs/superpowers/specs/2026-11-27-es4-skill-ecosystem-design.md); [implementation plan](docs/superpowers/plans/2026-11-27-es4-skill-ecosystem.md).
- [x] Draft the proposed 77-node ecosystem, six hero identities, dependency graph, attunement, economy, storage safety, visual/audio direction and staged plan (documentation only).
- [ ] Wave 0: baseline CI, runtime and economy inventory, migration/cloud risk gate.
- [ ] Wave 1: 72-node new catalog, validated DAG, v4 migration, purchase transactions, ownership tests.
- [ ] Wave 2 / offense: six universal nodes with real gameplay effects and TDD.
- [ ] Wave 2 / defense: six universal nodes with real gameplay effects and TDD.
- [ ] Wave 2 / arcana: six universal nodes with real gameplay effects and TDD.
- [ ] Wave 2 / mobility: six universal nodes with real gameplay effects and TDD.
- [ ] Wave 2 / hunt: six universal nodes with real gameplay effects and TDD.
- [ ] Wave 2 / summons: six universal nodes with real gameplay effects and TDD.
- [ ] Wave 3 / knight: five hero-specific nodes, mastery gates, two signature choices, runtime and TDD.
- [ ] Wave 3 / ranger: five hero-specific nodes, mastery gates, two signature choices, runtime and TDD.
- [ ] Wave 3 / wizard: five hero-specific nodes, mastery gates, two signature choices, runtime and TDD.
- [ ] Wave 3 / shadowblade: five hero-specific nodes, mastery gates, two signature choices, runtime and TDD.
- [ ] Wave 3 / spirit-summoner: five hero-specific nodes, mastery gates, two signature choices, runtime and TDD.
- [ ] Wave 3 / crimson-paladin: five hero-specific nodes, mastery gates, two signature choices, runtime and TDD.
- [ ] Wave 4: attunement slots and six cross-tree resonances; immutable run snapshot, conflict tests.
- [ ] Wave 5: mobile-first graph, categories, inspector, 72 usable semantic SVG assets, bilingual layouts. Final WebP optimization is separate.
- [ ] Wave 6: distinct rank, signature, resonance and unlock ceremonies; audio/VFX/accessibility tests.
- [ ] Wave 7: balance and performance report, full CI, real device/browser, SVG legibility/audio review, release readiness (final Hall WebP optimization excluded).
No gameplay implementation or asset admission is claimed by the planning checkbox. Existing Hall QA remains open above.


### ES4 UI/UX and temporary art (skill-tree scope)
- [x] Semantic, bilingual 72-node catalog with validated DAG, price, mastery and art contract.
- [x] Compact constellation navigation, medallion controls, shared graph and inspector, clear read-only state until real transactions exist (source implemented; runtime QA pending).
- [x] 72 temporary SVG icons plus individual future WebP paths and art briefs (source created).
- [x] Verify all 72 SVG paths and corresponding unique future WebP paths and per-image descriptions exist in the catalog/manifest (repository tree and manifest audit; not visual approval).
- [ ] **Non-blocking visual optimization:** replace and approve 72 final WebP assets using [individual image paths and briefs](docs/es4/hall-art-manifest.md). Do not block functional Wave 5/7 completion on this item.
- [ ] Real owned/equipped progression, signature/resonance purchase and run effects; enable purchase only after persistence and runtime integration.
- [ ] Actual responsive matrix, keyboard and touch behavior, motion and audio quality; SVG legibility and CI.

### Deferred endgame — transferred to ES5 planning; no ES4 gameplay implementation

- [x] Consolidate the deferred **design and planning** work into the [ES5 design specification](docs/superpowers/specs/2026-11-28-es5-eclipse-ascension-design.md) and [master implementation plan](docs/superpowers/plans/2026-11-28-es5-00-master-plan.md). This is documentation only; all runtime, balance, art and QA tasks remain open.
- Monster ecology, elite combinations and bosses → ES5 W02–03.
- New chapter mechanics and progression objectives → ES5 W05–06.
- Mode selection, challenge tiers and mature-build difficulty → ES5 W00–01, W04–05.
- Reward/time/risk, early/mid/late simulations and performance → ES5 W00, W07–08.
- Art, animation, sound, UI and gameplay TDD/QA → ES5 W02–08, with continuous W08 gates.

See [deferred endgame scope](docs/es4/deferred-endgame-scope.md) and the ES5 section below. Existing enemy/chapter/mode/difficulty implementation stays unchanged in this skill-tree workstream.

Catalog and SVG source created; full CI and runtime transactions are not yet verified. Do not enable talent purchases until the authoritative runtime is ready.

ES4 explorer is read-only in normal builds; the isolated unlocked DEV strategy now implements V4 migration, ownership, combat hooks and attunement. Full end-to-end verification and remaining gameplay gaps are still open. The original core research remains active.

### ES4 continuation checkpoint — 2026-11-27
- [ ] Fix ES4 typecheck regression in `src/components/es2/progression/HallTalentExplorer.test.ts:19`: Vue Test Utils `get()` return type omits `exists()` (TS2339). Preserve the assertion using an appropriate supported API and rerun the focused suite and typecheck.
- [ ] Reconcile inherited manual production-art gate for shadowblade, spirit-summoner and crimson-paladin; obtain legitimate visual approval, never remove or weaken the blocking test. Separate this from the ES4 functional implementation.
Baseline evidence: [ES4 verification 45961478312](https://github.com/weskao/eclipse-survivors/actions/runs/45961478312), commit `24d9d07b82fad3f057fb51dccae56084c3f52939`: 255 test files passed, one failed; 2,204 tests passed, one failed, one skipped. Typecheck failed with TS2339. No full CI green claimed. SVG 72/72 present; final WebP 0/72. Preserve the deferred scope above. See the mandatory ES4 references in CLAUDE.md.

### ES4 completed-node visual refinement
- [x] Shared permanent max-rank crest, full gold bezel, MAX plate and distinct one-rank ownership seal; rank-derived state and bounded final-purchase animation implemented.
- [ ] Verify completed-node regression suite, actual browser/device screenshots, reduced-motion/flashing and final-rank audio/animation timing in CI. No final art approval implied.

### Hall mastered sound refinement
- [x] Distinct advanced maximum-rank cue retaining the prior rank's exact musical opening, adding a richer harmonized finale; independent waveform regression verified at 22,050/48,000 Hz, unrelated cues unchanged.
- [ ] Verify Vitest audio scheduler and full CI; audition the 1.42s mastered cue and 1.60s combined route cue in actual game with music, mobile speakers and headphones.

## Monster / Boss dossier — final 3× WebP art (2026-11-27)

- [ ] Produce 25 boss-specific static WebP dossier icons using the existing `boss-attacks/<id>@3x.webp` combat textures (or their SVG masters from `scripts/render-boss-attack-art.mjs <dir>`) as mandatory geometry/palette references. Those combat WebPs are the temporary dossier fallback until the complete WebP migration and runtime QA below pass.
- [ ] Produce 6 dedicated legacy enemy attack WebP icons (currently reuse existing generic skill WebPs). These are a separate improvement, not missing runtime files.
- [ ] Art QA: preserve the existing dark-fantasy identity, distinct silhouette and phase/attack geometry; transparent alpha, no lettering, no background tile or border, centered subject with ~8–12% transparent padding; high contrast at 44 CSS px; static square 132×132 px (3×44), lossless or high-quality WebP with alpha, no animation. Do not upscale low-resolution source art. Source master may be larger.
- [ ] Runtime QA: verify each ID resolves to its own new image, image decode succeeds in the actual hover preview and Info dialog, both locales and all viewport profiles. Keep SVG/generic fallback only during the transition; review images before retiring every superseded SVG.

Boss output directory: `src/assets/es2/production/skills/boss-dossier/`. Each filename is exactly `<id>@3x.webp`; `bossAttackImageSrc` already prefers that path via Vite glob and falls back to the combat `boss-attacks/<id>@3x.webp` texture. Adding files and rebuilding applies the dossier icons during the transition; the combat asset migration and SVG cleanup below are done (2026-11-28).

| ID / filename stem | Art brief (zh-TW) |
|---|---|
| shadow-fan | 紫黑扇形多枚暗影飛刃，亮紫尖端與煙霧軌跡 |
| darkness-field | 地面深紫腐蝕法陣，暗霧向外擴散 |
| shadow-cross | 兩道交叉的紫黑能量斬 |
| abyss-summon | 深淵裂口中冒出暗影爪牙剪影 |
| abyss-collapse | 紫黑重力核心向內坍縮，碎片被吸入 |
| shadow-storm | 旋轉暗影風暴，紫色弧線和碎片 |
| ice-fan | 扇形鋒利冰晶飛矛，冷藍霜霧 |
| frost-patch | 地面霜凍晶簇與薄冰裂紋 |
| glacial-ring | 空心冰晶環，中央清楚留空 |
| rotating-shelter | 冰霜環形危險區與清晰安全扇形缺口 |
| winter-burst | 冰晶核心向外瞬間爆裂 |
| ice-storm | 旋轉冰雪暴風，細長冰晶和雪霧 |
| titan-slam | 熔岩岩拳重擊地面，放射裂紋 |
| ember-line | 直線橙紅餘燼火浪 |
| eruption | 熔岩柱從破裂地面噴發 |
| flame-wave | 弧形橙紅烈焰浪潮 |
| titan-rage | 怒火包裹的岩石核心，熱浪向外爆發 |
| radiant-lance | 金白聖光長矛，筆直光束 |
| light-ring | 金白聖光環，中央留空 |
| void-fan | 扇形紫黑虛空飛刃與星塵 |
| shadow-sweep | 寬弧紫黑橫掃斬擊 |
| twilight-ground | 地面暮光法陣，金紫交錯 |
| eclipse-wedge | 金紫星蝕扇區，明確楔形邊界 |
| eclipse-cross | 金紫雙色十字交叉能量 |
| seraph-finale | 金白與深紫星蝕核心，放射終曲光芒 |

Legacy enemy output directory: `src/assets/es2/production/skills/enemy-dossier/`. Each filename is `<id>@3x.webp`. The Vite glob URL resolver in `monster-details.ts` already prefers this file and preserves the generic WebP fallback and shared original-boss attack IDs. Add the file and rebuild; no further source change is required. No per-card UI branches. 

| ID / filename stem | Art brief (zh-TW) |
|---|---|
| pounce | 史萊姆壓縮彈跳向前撲擊，黏液飛濺 |
| dive | 蝙蝠收翼高速俯衝，冷色風切線 |
| jab | 哥布林短兵器向前突刺，銳利斬光 |
| slam | 巨像岩拳震地，碎石與衝擊環 |
| bolt | 術士發射單枚紫色魔力彈 |
| summon | 暗影召喚法陣與爪牙剪影 |

### Mandatory SVG retirement after WebP migration

- [ ] After all 31 dedicated `@3x.webp` dossier images are produced, integrated and visually verified, replace every corresponding SVG reference with the final WebP source and remove the temporary SVG fallback paths. This is a mandatory completion gate, not optional cleanup.
- [x] Migrate all 25 original `src/assets/es2/production/skills/boss-attacks/<id>.svg` assets used by the combat renderer to equivalent transparent `<id>@3x.webp` assets before deleting them. Preserve the original telegraph shape, safe sectors, origin, aspect ratio, alpha and in-game visual scale; use 3× the actual combat display size, not the 132×132 dossier icon resolution. Keep combat collision geometry and balance unchanged. Update shared asset lookup/globs, loaders, manifests and tests to resolve WebP only. (2026-11-28: `scripts/rasterize-boss-attack-art.py` renders the byte-identical deterministic SVG masters from `render-boss-attack-art.mjs` in Chromium at 3× each attack's combat box — circle/ring/arena `6·radius`, beam `3·(length+2·width)` at 4:1, projectile 384 px for its ≤110 px launch disk — then Polytool `towebp -q 90`; 25/25 VP8X+alpha, 632 KB SVG → 6.3 MB WebP, all preloaded at combat start. Guarded by `attack-textures.test.ts`. `boss-projectiles/*.svg` missiles are out of scope and unchanged.)
- [x] Delete all 25 superseded boss-attack SVG files, plus any temporary SVGs created for these 31 dossier skills. Audit other direct and indirect consumers (including preloads, Canvas/GPU rendering, asset tests and documentation). If an affected SVG is shared by another feature, migrate that consumer to WebP first. Do not delete unrelated SVG assets outside this scope. (Consumers: `attack-art.ts` glob + dossier fallback, `render.ts` `loadSprites` → Canvas and Pixi `bossVfxImages`; no docs/manifests referenced them.)
- [ ] Verify that no superseded SVG files or runtime SVG references remain, every affected ID resolves to a valid 3× WebP, and no missing-image or decode errors occur. Run typecheck, build, unit tests, responsive browser QA (desktop hover and Info dialog, mobile Info dialog), and actual Boss combat telegraph/impact QA across graphics quality settings. Only mark this section complete after migration, physical deletion and verification all pass.

## ES5 — Eclipse Ascension / 暮蝕昇華：戰鬥生態與終局進化 (2026-11-28)

**Status: PLANNING STORED — implementation not started.** Owner-approved direction: dual-track C (D0–D2 power fantasy, D3–D5 mastery challenge), full legitimate permanent talents in both tracks with separate standardized Apex Trials, and semi-open chapters. All numeric candidates require measured approval. The original ES4 design snapshot was `e561550c3473d175661d5c7d4552020c830a282f`; documents are stored on ES4 at parent `1084ed56f759154b84bb5545bb8d07619bad1a1a` for handoff, not authorization to change gameplay. Reconcile against the accepted ES4 runtime before ES5 implementation.

- [x] Consolidate ES4 deferred scope and owner-approved ES5 direction into the [document index](docs/es5/README.md), [design spec](docs/superpowers/specs/2026-11-28-es5-eclipse-ascension-design.md), [master plan](docs/superpowers/plans/2026-11-28-es5-00-master-plan.md) and nine Wave plans.
- [ ] **G0:** Accept ES4 runtime, save/migration, QA and rollout gates; authorize the active separate ES5 Stage branch from accepted develop; pin execution HEAD and verify baseline.
- [ ] **[W00 — Balance Foundation](docs/superpowers/plans/2026-11-28-es5-wave-00-balance-foundation.md):** six heroes × five investment stages × nine existing modes × three policies × ten seeds = 8,100 proposed simulations; paired DPS/TTK, Q/proc/mitigation, XP, embers/min, pressure and performance.
- [ ] **[W01 — Hero & Talent Balance](docs/superpowers/plans/2026-11-28-es5-wave-01-hero-talent-balance.md):** all 77 permanent nodes (5 legacy + 72 ES4), six Q skills, caps, stacking, hero identity and build viability; no hidden enemy power scaling.
- [ ] **[W02 — Monster Ecology](docs/superpowers/plans/2026-11-28-es5-wave-02-monster-ecology.md):** E01–10, EL01–08, EN01–08, readable counters, threat budget, actor cap; original art identity and runtime QA.
- [ ] **[W03 — Boss Evolution](docs/superpowers/plans/2026-11-28-es5-wave-03-boss-evolution.md):** B01–04, preserve 25 attacks and propose 12 mythic mechanics, exactly-once damage multipliers and phase transition regression; safe routes, audiovisual QA.
- [ ] **[W04 — Difficulty & Oaths](docs/superpowers/plans/2026-11-28-es5-wave-04-difficulty-oaths.md):** D0–D5, A01–12, compatible run config, unlocks, additive capped multipliers, D1 parity, feature flag, responsive UI.
- [ ] **[W05 — Endgame Modes](docs/superpowers/plans/2026-11-28-es5-wave-05-endgame-modes.md):** M01–07, 18 staged hero trials, mythic rush, endless abyss, Build Lab, AT01–04 standardized loadouts; no mutation of actual Hall or wallet, no untrusted public ranking.
- [ ] **[W06 — World Expansion](docs/superpowers/plans/2026-11-28-es5-wave-06-world-expansion.md):** semi-open progression, WLD01–06, Chapter III then IV, B05/06, preserve existing unlocks; separate detailed geometry, asset and encounter approval.
- [ ] **[W07 — Progression & Economy](docs/superpowers/plans/2026-11-28-es5-wave-07-progression-economy.md):** existing Twilight Embers only, measure early/mid/mature investment and risk-adjusted rewards, idempotent receipts, cosmetic rewards and local records; cloud/ranking trust gate.
- [ ] **[W08 — Release Readiness](docs/superpowers/plans/2026-11-28-es5-wave-08-release-readiness.md):** QA01–15, RED/GREEN/refactor, `make verify`, exact-HEAD CI, RWD, actual device/audio/art and performance; verify each independent Release Stage separately.
- [ ] Remove temporary ES5 feature policy only after approved permanent rollout, migration and rollback verification. No automatic merge, PR or deploy.

**Cross-wave acceptance:** W00 measures the ES4 power increase before W01–04 tuning; W02/03/04 and W05/06 must use those same legal investment fixtures (fresh, legacy max, early, mid, mature) and identical paired seeds. W07 verifies reward/min and time-to-upgrade across both tracks without forcing high difficulty. W08 independently checks all six heroes, legacy flag-off parity, D1 baseline, Apex isolation and semi-open chapter persistence. No test, simulation, asset or release gate is marked passed by this planning commit.

**Dependency order:** G0 → Stage 01 → other independently releasable stages as their own prerequisites are met; W08 continuous. [Release stages](docs/es5/release-stages.md) supersede A/B/C batching. See master plan for exact branch ownership and task dependencies. Original ES3, ES4 and art/QA items retain their existing states; historical CI evidence is not a claim about current HEAD.

## ES5 — Release Stages (independent player releases)

- [x] Document the staged delivery strategy, Balance JSON ownership and Stage 01 plan; documentation only.
G0 prerequisite: use the single G0 checkbox in the ES5 Wave section above; no duplicate status.

[Roadmap / Balance ownership / evidence rules](docs/es5/release-stages.md) · [Stage 01 plan](docs/superpowers/plans/2026-11-28-es5-stage-01-combat-balance.md). The following Stage gates are not implementation claims. Wave checkboxes above are aggregate views; keep them open until all mapped work is verified.

### Stage 01 — Combat Balance & Quality
- [ ] S01-00: Preflight — Verify accepted ES4 final SHA ancestry of develop, runtime/save/wallet/rollout and all gates. Read latest rules; record baseline; create target branch only after G0.
- [ ] S01-01: Combat baseline — Inventory 15 JSON/catalog domains; measure six heroes × five legal investment states × existing modes; record baseline config SHA/hash and telemetry.
- [ ] S01-02: Deterministic simulation — Reuse engine/harness; fixed seed/step/policy, smoke and 8,100 screening matrix (6×5×9×3×10), endless 15-min horizon; record actual coverage/censored runs; do not claim unrun matrix.
- [ ] S01-03: Hero active skills — Verify six Q damage, CD, range, targets, hit parity, rejection/reset, animation/SFX; preserve original CD initially.
- [ ] S01-04: Permanent talent audit — Audit 77 nodes/289 ranks, all effects and prerequisites, 2+1+1 attunement, actual UI/runtime parity, legacy/disabled path; preserve legitimate investment.
- [ ] S01-05: Combat calculation — Reproduce and fix source attribution, crit, DR, heal, shield, invulnerability, cooldown, proc recursion, summon interactions, duplicate multipliers.
- [ ] S01-06: Existing build balance — Measure weapon, skill, evolution, relic, contract, hero role and interaction viability; maintain build choice.
- [ ] S01-07: Existing monster balance — Legacy and faction HP/ATK/speed/attack/recovery/telegraph/spawn/elite/wave pressure; no new identities, affixes or encounters.
- [ ] S01-08: Existing boss balance — Audit BAL-01 exactly-once mode damage for contact/projectile/area/summon and BAL-02 phase correctness; preserve normal burst skip; legacy + four existing bosses, no mythic.
- [ ] S01-09: Progression and economy — Measure XP/first upgrade/curve, cost and embers/min including losses; no unapproved cost/reward/schema/currency changes.
- [ ] S01-10: Balance configuration & reports — Identify owner per tunable field; existing JSON only as needed; register/typed validation for touched domains, guard tests, same-seed paired report; approved tuning only.
- [ ] S01-11: Full regression — Run focused RED/GREEN/refactor per change, balance.test.ts, make verify and all applicable regressions. Record commands and actual results.
- [ ] S01-12: Browser/device QA — Real player path, both locales, desktop/tablet/foldable/phone portrait+landscape, numeric UI parity, music continuity, performance and applicable art/device manual gates.
- [ ] S01-13: Documentation and changelog — Update root TODO IDs, Wave steps and Master references with evidence, bilingual player-visible changelog per release-process; version only coordinated with actual authorized release.
- [ ] S01-14: Exact HEAD CI — Commit/push only target, check every applicable workflow at exact HEAD; canceled/stale not pass; record blockers and separate Release-ready/Published gates.
- [ ] S01-GATE: Release-ready (all required TDD/CI/QA evidence and scope complete).
- [ ] S01-MERGED: Authorized integration into develop, reverified.
- [ ] S01-PUBLISHED: Authorized deployment/tag/Release verified.
- [ ] S01-PRODUCTION: Actual public gameplay verified on desktop/mobile.

### Stage 02 — Difficulty Selection
- [ ] S02-SCOPE: D0–D2, D1 parity, unlock, eligible reward, accessible selector; no future variants; domain ownership, TDD and evidence per roadmap.
- [ ] S02-GATE: Independently release-ready (all applicable verification).
- [ ] S02-MERGED: Authorized integration and reverify.
- [ ] S02-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S02-PRODUCTION: Public gameplay verified.

### Stage 03 — Monster Evolution I
- [ ] S03-SCOPE: E01–05, EL01–04, EN01–04; only complete assets and dossier; domain ownership, TDD and evidence per roadmap.
- [ ] S03-GATE: Independently release-ready (all applicable verification).
- [ ] S03-MERGED: Authorized integration and reverify.
- [ ] S03-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S03-PRODUCTION: Public gameplay verified.

### Stage 04 — Mythic Awakening I
- [ ] S04-SCOPE: B01/B02, D3; mythic forms only in compatible encounters; domain ownership, TDD and evidence per roadmap.
- [ ] S04-GATE: Independently release-ready (all applicable verification).
- [ ] S04-MERGED: Authorized integration and reverify.
- [ ] S04-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S04-PRODUCTION: Public gameplay verified.

### Stage 05 — Monster Evolution II
- [ ] S05-SCOPE: E06–10, EL05–08, EN05–08; domain ownership, TDD and evidence per roadmap.
- [ ] S05-GATE: Independently release-ready (all applicable verification).
- [ ] S05-MERGED: Authorized integration and reverify.
- [ ] S05-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S05-PRODUCTION: Public gameplay verified.

### Stage 06 — Hero Trials + Build Lab
- [ ] S06-SCOPE: M01 six first-tier trials, then remaining 12 as independently complete; M07 isolated reward-free lab; domain ownership, TDD and evidence per roadmap.
- [ ] S06-GATE: Independently release-ready (all applicable verification).
- [ ] S06-MERGED: Authorized integration and reverify.
- [ ] S06-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S06-PRODUCTION: Public gameplay verified.

### Stage 07 — Mythic Awakening II
- [ ] S07-SCOPE: B03/B04, D4–D5 and compatible A01–12; no unimplemented oath; domain ownership, TDD and evidence per roadmap.
- [ ] S07-GATE: Independently release-ready (all applicable verification).
- [ ] S07-MERGED: Authorized integration and reverify.
- [ ] S07-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S07-PRODUCTION: Public gameplay verified.

### Stage 08 — Endgame Expansion
- [ ] S08-SCOPE: M02 mythic rush, M03 endless abyss, M06 chaos rotation; own receipt rules; domain ownership, TDD and evidence per roadmap.
- [ ] S08-GATE: Independently release-ready (all applicable verification).
- [ ] S08-MERGED: Authorized integration and reverify.
- [ ] S08-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S08-PRODUCTION: Public gameplay verified.

### Stage 09 — Apex Trials
- [ ] S09-SCOPE: M04/M05, AT01–04 phased by actual dependencies; local fair records first; domain ownership, TDD and evidence per roadmap.
- [ ] S09-GATE: Independently release-ready (all applicable verification).
- [ ] S09-MERGED: Authorized integration and reverify.
- [ ] S09-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S09-PRODUCTION: Public gameplay verified.

### Stage 10 — Chapter III
- [ ] S10-SCOPE: Chapter III, B05, semi-open unlock, own art and mechanics; domain ownership, TDD and evidence per roadmap.
- [ ] S10-GATE: Independently release-ready (all applicable verification).
- [ ] S10-MERGED: Authorized integration and reverify.
- [ ] S10-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S10-PRODUCTION: Public gameplay verified.

### Stage 11 — Chapter IV
- [ ] S11-SCOPE: Chapter IV, B06, distinct mechanics, final achievements; domain ownership, TDD and evidence per roadmap.
- [ ] S11-GATE: Independently release-ready (all applicable verification).
- [ ] S11-MERGED: Authorized integration and reverify.
- [ ] S11-PUBLISHED: Authorized deployment/tag/Release.
- [ ] S11-PRODUCTION: Public gameplay verified.
