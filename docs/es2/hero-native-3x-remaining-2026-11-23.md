# ES2 Hero Art — Remaining Native 3× Animation Work (2026-11-23)

**Repository:** https://github.com/weskao/eclipse-survivors  
**Target branch:** `feature/es2-release-readiness-integration`  
**Source-of-truth rules:** `CLAUDE.md`, `.claude/rules/character-art-3x.md`  
**Status:** **INCOMPLETE / QA_PENDING** — the items below are not approved production animation.

## Verified current art

| Hero | Portrait | Existing static facings | Existing moving actions | New candidates | Production status |
| --- | --- | --- | --- | --- | --- |
| `shadowblade` | 900×900 canonical WebP | 8 idle + 8 guard, 448px nominal cells from ~313px source | 8 run + 8 attack + 8 special independently authored **East** frames; West mirrors East, other six directions hold guard | Nine-batch East: run/attack/special × 4; new South run × 4 | `QA_PENDING`; new candidates **not** used in combat |
| `spirit-summoner` | 900×900 canonical WebP | Same limits | Same limits | East run/attack/special × 4; South run × 4 | `QA_PENDING`; original source edge risks |
| `crimson-paladin` | 900×900 canonical WebP | Same limits | Same limits | East run/attack/special × 4; South run × 4 | `QA_PENDING`; original source edge risks |

The current production split atlases use a 448px cell with 8px gutters and 432px safe cropping; keep that code until the replacement atlas contract has complete real art and tests. Nominal atlas size is not evidence of genuine native 3× details. Some existing 448px outputs came from roughly 313px sources; 384px legacy sheets came from roughly 198px source frames.

**Candidate assets:** `src/assets/es2/production/heroes/candidate-poses-2026-11-23.json` inventories the nine East-only 4-frame image candidates. `shadowblade/candidates/south-2026-11-23/manifest.json`, `spirit-summoner/candidates/south-2026-11-23/manifest.json`, and `crimson-paladin/candidates/south-2026-11-23/manifest.json` inventory three additional South-running 4-frame sources. The Summoner candidate preserves its original 1254×1254 PNG master and its 1536×1536 transparent WebP. Both have original crop-edge risk. All are **QA_PENDING** and the production renderer intentionally does not import them. Preview at `src/game/render/es2/hero-candidate-preview.html` (run `pnpm dev` first).

**Source-edge QA defect corrected:** 36/36 original cells across nine East candidate atlases reach a 627px source-cell boundary. The corrected test and manifest now mark these as `sourceClippingRisk`, instead of mistaking added output padding for proof that original arms/weapons/hair/capes were not clipped. The South 4-frame source is likewise provisional. A risk means **potential** source truncation, not proof that every visible limb is lost.

## Art still needed for full implementation

Each character requires genuinely authored **8-direction** assets with independent motion (E, SE, S, SW, W, NW, N, NE):

| State | Minimum per direction | 8-direction total / hero | 3-hero target |
| --- | ---: | ---: | ---: |
| Run / Dash | 10 distinct poses | 80 | 240 |
| Attack / Cast | 12 distinct poses | 96 | 288 |
| Special | 8 distinct poses | 64 | 192 |
| **Three active action types** | **30** | **240** | **720** |

This is the **required production action-frame target**; the existing legacy East frames and four-frame QA candidates **are not accepted native-3× substitutes**. Further work must create complete and untruncated native masters, not duplicate frames to fill the counts. Idle/ready must also be replaced with detailed, identity-consistent native 3× directional artwork. Distinct hurt, death and victory sequences are missing and need authored timing, render integration and approval.

At the current maximum ~147 CSS px display size, source detail must be at least 441px across the full displayed bounding dimension. Reserve adequate source framing space (e.g. 768px or larger separate transparent frames), then pack within verified mobile texture limits; do not upscale low-detail 198px / 313px originals and call the export native 3×.

### Recommended next production batches

1. Recreate the original **clipped/boundary-touching** poses first, by authoring isolated full-body original frames with transparent outer margin. Keep canonical portrait identity, facial features, outfit, weapon handedness and pose-to-pose consistent foot contact.
2. Complete **Shadowblade** South-run 10 real frames, then remaining six non-East/non-West directions and West where mirroring would break handedness. Repeat for Spirit Summoner and Crimson Paladin.
3. Complete eight-direction Attack/Cast, then Special with animation phases synchronized to real combat events.
4. Replace low-detail idle/ready (eight facings), then produce separate hurt, death and victory sequences.
5. Update split atlases, manifests, measured foot anchors and the existing `production-heroes.ts` consumer only after the corresponding art passes QA; the debug preview does **not** count as gameplay integration.
6. Follow RED → GREEN → REFACTOR, run full `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, then record **real-gameplay** MP4s for all directions. Do not pass off candidate-sheet playback as gameplay.

## Distinguish the separate CI blocker

`src/assets/es2/production/heroes/production-art.test.ts` is an intentional **blocking manual art-approval gate** covering **52 assets**: 3 heroes, 20 enemy/telegraph images, 4 bosses, 8 biomes, 17 UI assets. The other **49 already have WebP files**; see `docs/es2/production-art-49/README.md` and its four QA workstreams. Do not regenerate those 49 unless visual/technical evidence proves a defect and do not approve them merely to pass CI.

This hero workstream owns only hero art. Avoid modifying other workstreams' enemy, boss, biome or UI files.

## Evidence and merge gate

- Source sheets and exact source SHA-256, actual master dimensions, alpha bounds and frame-to-frame non-duplication.
- 1× frame contact sheets checked against the canonical portrait and the original three legacy heroes.
- Desktop and mobile landscape/portrait gameplay screenshots; all 8 facings of running/attack/special must be observable.
- Browser event/console logs, performance and memory checks, reduced-motion support and real MP4s at the exact final commit SHA.
- Keep `QA_PENDING` until visual approval is actually supplied and documented, even if binary tests and CI build succeed. Never weaken the 52-asset approval gate to produce a green CI check.

## 2026-11-23 — opt-in real gameplay QA hook for all 12 authored candidates

The three South-run and nine East run/attack/special 2×2 WebP atlases are now bound through `src/game/render/es2/production-heroes.ts` **only in Vite development mode** when the URL includes `?es2HeroArtQA=1` (the earlier `?es2HeroSouthQA=1` alias still works). This is opt-in real-gameplay Canvas QA, not isolated contact-sheet playback. Exact 768px (South) or 704px (East) source rectangles, four authored frame indexes, lazy loading by active hero and pose, same-character fallback and reduced-motion mode are retained. No West mirroring or fabricated eight-direction clips. It does not modify hitboxes or the real combat animation state.

- Source files: each hero's `candidates/south-2026-11-23/run-south-4frames@3x.webp`, plus the three `candidates/east-2026-11-23/{run,attack,special}-east-4frames@3x.webp` files.
- Regression tests: `src/game/render/es2/production-south-run-qa.test.ts`.
- Default gameplay and production builds remain unchanged; `runtimeApplied: false` in candidate manifests remains correct for the release game.
- **Still QA_PENDING:** these are only four frames per action/direction, not the required 10 Run, 12 Attack and 8 Special distinct native-detail poses per direction, nor hurt/death/victory coverage. Cropping and texture quality need desktop/mobile gameplay screenshots and visual sign-off. No gameplay MP4 or complete native-3× approval is claimed.
- The latest separately uploaded Shadowblade 1254×1254 source (SHA-256 `85a4f5880fb640be08ff37ba70d10ce6453508f4ce775515127639c7bcde79b4`) was locally inspected and repacked without resampling into a 1536×1536 QA WebP. That **separate repack has not been uploaded to GitHub**; the in-game QA hook uses the pre-existing committed South-run WebP, not this local repack. Never conflate the two sources.

## 2026-11-24 — real-gameplay candidate evidence pipeline

GitHub workflow `.github/workflows/es2-hero-animation-video.yml` has **two deliberately separate** capture passes:

- **Production:** `pnpm build` + `pnpm preview` on port 4173. Captures the actual released hero artwork and three MP4s in `artifacts/es2-hero-video/`.
- **Unapproved candidate QA:** `pnpm dev` on port 4174 + `ES2_HERO_QA=1` uses the existing **development-only** `?es2HeroArtQA=1` renderer switch. Captures each of the three heroes in live combat as MP4, plus genuine in-game screenshots while moving East and South, under `artifacts/es2-hero-video/candidate-qa/`. The files and `capture-metrics.json` explicitly identify `QA_PENDING`.

Run the opt-in pass locally with a development server on port 4174:

```sh
pnpm dev --host 127.0.0.1 --port 4174 --strictPort
PREVIEW_URL=http://127.0.0.1:4174/ ES2_HERO_QA=1 node scripts/es2-hero-animation-video.mjs
```

The CI artifact is named `es2-three-heroes-production-and-candidate-gameplay-qa` and is available on the workflow run's **Artifacts** section after successful capture. These are **true gameplay captures of existing candidate images**, not newly authored additional direction frames. Screenshots and MP4s permit visual assessment but do **not** prove native-3× authoring, frame completeness, correct original-alpha edges, or human art acceptance. The production renderer still rejects candidate activation by default; every relevant manifest remains `QA_PENDING`.

## 2026-11-24 — visual review of committed South-run WebP candidates

These observations are from inspection of the **actual three 1536×1536 committed 2×2 WebP images**, not inferred from filenames, manifests or automated SHA checks. All are still unapproved and are **not** suitable for unconditional production substitution.

| Hero | Visible observations in original candidate | Required remediation |
| --- | --- | --- |
| `shadowblade` | Four distinct running-looking poses and recognizable purple hood / twin daggers. Bright disconnected blue-magenta specks are visible around the daggers and their glows; source boundary risk remains flagged. | Separate intentional blade glow from detached matte debris; reconstruct clipped original source regions if necessary, then inspect four clean transparent frames at 1× |
| `spirit-summoner` | Recognizable silver-haired staff-bearing summoner and pose variations, but conspicuous white/blue/red/magenta residual pixels and white matte appear around the flowing costume, hair and staff, with detached fragments. | Re-export genuine transparent isolated frames or re-author affected edges; remove residual opaque background/fringe without erasing flowing clothing or legitimate magic, then independently inspect each frame |
| `crimson-paladin` | Recognizable red-haired knight in gold armor, shield and sword, distinct stride positions. Red and white fringe/bright block-like contamination is visible at the hair, sword and cloth edges despite nominally safe alpha>8 source margins. | Remove source matte contamination and confirm weapon/cape transparency under both dark and light 1× game backgrounds; threshold-only alpha safety must not be mistaken for visual approval |

No replacement illustration has been approved or silently generated by this review. Retain original sources and SHA manifests, preserve the canonical identities, and produce new candidate art only after the affected source details are actually corrected. The `candidate-south-run.test.ts` integrity checks cover **all three** committed WebPs, but intentionally do not certify visual quality.

## 2026-11-24 — candidate review controls and rejected art experiments

The existing QA-only `src/game/render/es2/hero-candidate-preview.html` can now pause/step the four committed frames per sheet, switch dark/light checkerboards to expose alpha/matte pollution, and toggle a 147px **reference** canvas size. This is a review-size approximation, **not** a substitute for a measured real-game screenshot at every device layout. With playback paused, the page no longer continuously schedules Canvas redraws. The existing twelve East/South candidates and production build are unchanged.

Two new image-generation experiments were inspected but **not committed**:
1. A 1254×1254 Spirit Summoner 2×2 south-running sheet had full within-cell alpha bounds but visible white/colored matte contamination and no approved native 3× identity or handedness verification.
2. A three-hero eight-direction illustrated overview had labels, decorative panels, small artwork and pixel-art styling, so it was not a splittable transparent source sheet and does not match the established realistic character-art contract.

Neither image is included in source manifests, runtime imports or accepted-frame counts. Re-author clean transparent original frames rather than manufacturing completion through resizing, masking away actual body detail, or mistaking a labeled overview for animation. Review tools and associated regression tests were updated, but do not change the `QA_PENDING` release gate.
