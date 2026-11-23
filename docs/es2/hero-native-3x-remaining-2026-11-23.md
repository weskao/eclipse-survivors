# ES2 Hero Art — Remaining Native 3× Animation Work (2026-11-23)

**Repository:** https://github.com/weskao/eclipse-survivors  
**Target branch:** `feature/es2-release-readiness-integration`  
**Source-of-truth rules:** `CLAUDE.md`, `.claude/rules/character-art-3x.md`  
**Status:** **INCOMPLETE / QA_PENDING** — the items below are not approved production animation.

## Verified current art

| Hero | Portrait | Existing static facings | Existing moving actions | New candidates | Production status |
| --- | --- | --- | --- | --- | --- |
| `shadowblade` | 900×900 canonical WebP | 8 idle + 8 guard, 448px nominal cells from ~313px source | 8 run + 8 attack + 8 special independently authored **East** frames; West mirrors East, other six directions hold guard | Nine-batch East: run/attack/special × 4; new South run × 4 | `QA_PENDING`; new candidates **not** used in combat |
| `spirit-summoner` | 900×900 canonical WebP | Same limits | Same limits | East run/attack/special × 4 | `QA_PENDING`; original source edge risks |
| `crimson-paladin` | 900×900 canonical WebP | Same limits | Same limits | East run/attack/special × 4 | `QA_PENDING`; original source edge risks |

The current production split atlases use a 448px cell with 8px gutters and 432px safe cropping; keep that code until the replacement atlas contract has complete real art and tests. Nominal atlas size is not evidence of genuine native 3× details. Some existing 448px outputs came from roughly 313px sources; 384px legacy sheets came from roughly 198px source frames.

**Candidate assets:** `src/assets/es2/production/heroes/candidate-poses-2026-11-23.json` inventories the nine East-only 4-frame image candidates. `shadowblade/candidates/south-2026-11-23/manifest.json` inventories a further South-running 4-frame source; it has original crop-edge risk. All are **QA_PENDING** and the production renderer intentionally does not import them. Preview at `src/game/render/es2/hero-candidate-preview.html` (run `pnpm dev` first).

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
