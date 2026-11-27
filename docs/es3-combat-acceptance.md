# ES3 combat, power, encounter and reward implementation evidence

Scope: Waves 0, 1, 2, 4 and 7. Target branch `feature/es3-combat-juice-power-pacing-rewards`. Date 2026-11-26 Taiwan time. This is an evidence record, not a blanket acceptance claim.

## Measured comparison

Two actual GitHub Actions diagnostic runs with the same 130 actors, 96 player shots, 64 hostile shots and 96 initial particles, 120 measured ticks and 120 recorded frames per viewport. [Earlier diagnostic](https://github.com/weskao/eclipse-survivors/actions/runs/45693471092), [later diagnostic at f9ca7928](https://github.com/weskao/eclipse-survivors/actions/runs/45696301552). These are single-run samples from different hosted runners, not controlled performance guarantees. Recorded Canvas calls are NOT GPU draw calls or browser FPS.

| Metric | Earlier | Later |
|---|---:|---:|
| Simulation median ms/tick | .2232 | .1878 |
| Simulation p95 | .3451 | .3488 |
| Simulation p99 | .4941 | .4688 |
| Mobile low recorded Canvas median ms | .2245 | .1760 |
| Mobile low recorded Canvas p95 | .4089 | .3650 |
| Mobile low recorded Canvas p99 | .5140 | .5370 |
| Desktop high recorded Canvas median ms | .3303 | .2618 |
| Desktop high recorded Canvas p95 | .5655 | .4793 |
| Desktop high recorded Canvas p99 | .7131 | .7237 |
| Mobile/desktop paint commands per frame | 829/1055 | 829/1055 |
| Observed heap delta bytes | 977280 | 744816 |
| 10-minute simulated Endless p95 ms/tick | .1252 | .0631 |
| 10-minute simulated Endless p99 ms/tick | .1479 | .1196 |
| 10-minute observed heap change bytes | 25147240 | -2088472 |
| Actor checkpoints | all 130 | all 130 |

Heap endpoints depend on GC; they do not prove allocation volume or a memory leak is absent. GPU draw calls, physical device temperature, measured mobile battery use and production FPS are not established by these tests.

## Deterministic 30-second opening fixture

Knight, seed 20261126, standing still with invulnerability, no interactive upgrade selection. These are workload probes, not human playtime guarantees.

| Mode | XP earlier → later | Kills earlier → later | DPS earlier → later | Live enemies earlier → later | First upgrade (s), later |
|---|---:|---:|---:|---:|---:|
| Quick | 172 → 199 | 59 → 69 | 65.26 → 73.83 | 32 → 36 | 2.43 |
| Standard | 140 → 143 | 46 → 47 | 52.10 → 54.84 | 29 → 36 | 2.43 |
| Endless | 192 → 219 | 66 → 72 | 78.22 → 81.35 | 31 → 39 | 2.43 |
| Challenge | 239 → 257 | 75 → 81 | 110.31 → 123.93 | 40 → 52 | 4.68 |

The later diagnostic passed all five tests, including deterministic opening, low/medium/high simulation parity and ten simulated minutes of Endless. The real Chromium matrix passed six profiles before finding hero-card clipping on 1024×768 tablet landscape. A targeted CSS fix is in 99b12c5f; the new browser result must be checked.

## Integration evidence and limitations

- Full integrated run [45696301536](https://github.com/weskao/eclipse-survivors/actions/runs/45696301536) at f9ca7928: 1,942 passed, 1 skipped, 1 failed. Failure is the unchanged owner-acknowledged manual art gate for Shadowblade, Spirit Summoner and Crimson Paladin; it remains red, not approved.
- Earlier test-first batches sometimes had CI cancelled by later implementation commits under the owner's implementation-first instruction. Do not describe unobserved RED steps as observed. The explicit historical RED/GREEN pairs remain in TODO.md.
- Later implementation adds typed damage/healing feedback, direction/material-dependent enemy death timing, preserves authored boss identity after death, result telemetry presentation, direct-particle caps and compact landscape layout. Final integrated verification is separate.
- All five chest tiers use existing production artwork; Epic shares the Rare source with distinct styling. Celestial Lens was promoted from Epic to Legendary without stat changes to permit a non-cursed Legendary offer. Existing hero and enemy source sheets are not newly authored. Bespoke enemy hit/death/dissolve sheets are not produced in this delivery.
- Scope does not include Waves 3, 5 or 6. Manual-only visual/audio/device acceptance, screenshots, MP4 and physical thermals explicitly waived by owner. The existing asset acceptance gate is unchanged.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm test
ES2_PERF_LONG=1 pnpm exec vitest run tests/es2/performance/benchmark.test.ts
pnpm typecheck
pnpm build
pnpm check-release
```

Use the ES3 automated gameplay and performance acceptance workflow for Chromium responsive/layout and live-browser diagnostics. Never equate simulation/recording Canvas timing with real GPU performance.

## Follow-up evidence at ba34d948

- [Full regression 45702064115](https://github.com/weskao/eclipse-survivors/actions/runs/45702064115): 1,965 passed, 1 skipped, 1 failed (unchanged human art gate). Typecheck, production build and release check passed. Opening terrain regression: RED 45701540066, GREEN 45702064115. Faction living-pressure, camera direction and typed contact regressions: RED 45701923875, GREEN 45702064115. Audio signature table also passed; its CI RED was not observed.
- [Diagnostics 45702064486](https://github.com/weskao/eclipse-survivors/actions/runs/45702064486): all five simulation/recorded Canvas diagnostics passed. Chromium passed 11/12 profiles; remaining 640×360 (200%-zoom equivalent) hover dossier intercepted the hero card. Normal desktops and tablet landscape passed. Fix 01883573 adds adaptive side sizing before vertical fallback; browser acceptance remains pending.
- Latest hosted-run simulation median/p95/p99: .202269/.378615/.511911 ms; mobile/desktop recorded Canvas median .213744/.334501 ms; paint operations 829/1055 per frame. Ten-minute simulated Endless p95/p99 .138258/.153493 ms; all ten actor checkpoints 130; observed heap endpoint change −2,644,584 bytes. This runner was slower than the earlier later sample; no performance improvement claim or real-device/GPU inference.
- Opening fixture after terrain placement correction (XP/kills/DPS/first upgrade seconds): Quick 209/71/80.69/1.92; Standard 138/45/54.10/2.43; Endless 205/71/79.02/2.43; Challenge 259/83/123.20/4.68.
- Additional test-first commit b7bdd9f2 and implementation 786d1405 add objective-specific ordinary encounter cycles and rarity-specific claim audio; exact-HEAD results pending. No new artwork or human approval is claimed.


## Follow-up evidence at cc87cf77 and e81f7fdd

- [Full regression 45703042847](https://github.com/weskao/eclipse-survivors/actions/runs/45703042847) at cc87cf77: 1,972 passed, 1 skipped, 1 failed (the same three-hero manual artwork acceptance gate). Typecheck, build and release check passed. [Diagnostics 45703042822](https://github.com/weskao/eclipse-survivors/actions/runs/45703042822): five simulation diagnostics passed, responsive matrix 11/12; remaining 640×360 zoom-equivalent hover timed out. Do not count this as complete browser acceptance.
- The comparable cc87cf77 hosted-run workload reported simulation median/p95/p99 .240906/.470876/.684121 ms, mobile/desktop recording Canvas medians .306293/.374003 ms, paint commands 829/1055, observed heap delta 948952 bytes. Ten-minute simulated Endless p95/p99 .102251/.159917 ms; all ten actor checkpoints 130, observed heap endpoint change −2689872 bytes. Hosted-runner noise and GC preclude hardware or GPU claims.
- Hover scroll retention/reposition regression e93d8787 → 4fd0e1e1, with nullable Vue child typing fix d11be7d5. Boss-specific defeat notice/palette test c3791ce1 → 100a3761; boss death presentation handoff test 5952b4bf → e81f7fdd. [Full regression 45754080001](https://github.com/weskao/eclipse-survivors/actions/runs/45754080001) at e81f7fdd: 1,978 passed, 1 skipped, 1 failed (unchanged three-hero art gate); new hover, combat and boss-controller test files passed. [Diagnostics 45754080035](https://github.com/weskao/eclipse-survivors/actions/runs/45754080035): all five simulation diagnostics, typecheck, build and release check passed; browser step not finalized at last inspection. Test-only runs were cancelled by subsequent implementation pushes, so these are test-first/observed GREEN, not observed full RED/GREEN pairs.
- Adaptive music pressure test-first 8ded420c → implementation 2b6d9e97: the quarter-second score update now counts living actors from both enemy pools, sharing the telemetry helper. Exact-revision verification pending. No new bespoke art assets were authored; existing four chest assets and enemy artwork remain intact. Unchecked items retain their outstanding evidence/art requirements.


## Follow-up: identity-safe boss poses and contact art (2026-11-26)

- At `73562cf2`, [full regression](https://github.com/weskao/eclipse-survivors/actions/runs/45798704349) had 2016 passing tests, one skipped, and only the existing three-hero art approval gate failing. [Browser and diagnostics](https://github.com/weskao/eclipse-survivors/actions/runs/45798704355) passed all 12 Chromium viewport profiles and five seeded diagnostics. The ten-minute simulated Endless p95/p99 were .138726/.153322 ms per tick, all ten checkpoints at 130 actors; observed heap endpoint change −2,272,488 bytes. No physical-device or GPU claim.
- Boss production phase art motion test-first `65f2908e` observed RED [45804252908](https://github.com/weskao/eclipse-survivors/actions/runs/45804252908); implementation `ade37dc7` observed GREEN for the new test in [45804676946](https://github.com/weskao/eclipse-survivors/actions/runs/45804676946), 2017 passed, 1 skipped, 1 existing art gate failure. Typecheck, build and release checks passed. Test verifies original atlas movement, a held body pose while the warning advances, and reduced motion; no canonical image replacement.
- Contact texture tests `b1db4aec` observed RED [45805083905](https://github.com/weskao/eclipse-survivors/actions/runs/45805083905), implementation `717b4491` adds optional six-variant native WebP lookup with original-art fallback and critical priority. Six 480×360 transparent WebPs were produced from the existing vector geometry and supplied in an external ZIP, not yet uploaded. Five generated legacy death concepts are review-only and do not satisfy native 420px cells. No human approval or new canonical character bitmap is claimed. Latest run [45805386490](https://github.com/weskao/eclipse-survivors/actions/runs/45805386490) and [45805386524](https://github.com/weskao/eclipse-survivors/actions/runs/45805386524) were pending at documentation time.
- Checklist closes verified functional requirements only; missing original-identity native art, dedicated uploaded-texture/chest browser acceptance, historical RED gaps, danger-telegraph review, and latest exact-HEAD verification remain explicitly open. Waves 3, 5 and 6 are untouched.


## Contact art upload and identity-safe candidate batch (2026-11-26)
- Owner upload `0f4bbb8` contains six 480×360 native vector-derived WebPs and combat manifest. Actual full suite 45811884654: 2019 passing, 1 skipped, only original three-hero manual gate failing; seven contact tests pass (observed RED 45805083905). Subsequent owner merge `3eda1848`: full suite 45812374428, 2022 passing / 1 skipped / 1 known manual gate; diagnostics 45812374133 successful, including all 12 browser profiles, simulation p95 .079799 ms and p99 .131487 ms/tick, 130 actors at ten checkpoints. Not a physical device metric.
- Added static verification of real combat files, vector provenance, WebP geometry and alpha; extended existing real Chromium harness to verify all six decoded actual production textures and critical-over-hero priority with reduced flashing, separately from timed workloads. New run not yet verified at documentation time.
- New Slime source generated in two independent 1254×1254 four-frame variants, downsampled to 872×872 with 8px transparent gutter, 420px content boxes, shared bottom anchor. External ZIP contains one upload candidate and one review-only alternative. Neither replaces canonical artwork or claims owner review. Other four Legacy identity-matched sheets still missing; no unrelated pixel-art previews included.


## Batch 03: native enemy candidate and lossless WebP verification
- Owner upload `d16f6e79` adds the isolated Slime source, atlas and manifest. Canonical enemy art unchanged.
- [Browser diagnostics 45815206266](https://github.com/weskao/eclipse-survivors/actions/runs/45815206266) passed, including all six actual contact texture decode/paint checks and critical priority on desktop and mobile-low. [Full regression 45815206035](https://github.com/weskao/eclipse-survivors/actions/runs/45815206035) had 2023 passing, 1 skipped, 7 failures (six false-negative VP8L container assertions plus original three-hero approval gate). Fix accepts valid simple lossless VP8L alpha and extended VP8X, retaining SHA, dimensions and source provenance checks. New candidate tests validate source PNG, atlas dimensions, original Git blob SHA, and unapproved status; latest regression pending.
- Bat Batch 03 external ZIP includes a new generated 1254×1254 source and 872×872 candidate atlas, 627px original grid cells, 420px content boxes and 8px gutters. Original Bat reference inspected, no canonical replacement. Goblin/Golem/Warlock attempts rejected for identity/style mismatch. No owner approval inferred.


## Five-candidate upload and real-browser acceptance coverage
- Owner HEAD `3d9bc75e` contains all five native legacy enemy atlases and provenance manifests; no additional asset upload needed for these twenty frames. DEV-only loader `e645a10c` preserves canonical release art. Last completed full run `45937955517` at `8d117bc7`: 2119 passed, 1 skipped, 1 existing hero approval gate failed. Diagnostic run `45937955589`: five simulations passed, responsive lobby hidden-start timeout. Added five-ID inventory/loader assertions, real Chromium candidate decode, gutter and four unique paint checks, and separate browser workflow steps so lobby failure cannot suppress asset verification. Added diagnostic screenshot and computed-style ancestry on lobby timeout. New CI not yet verified; no visual approval inferred.


## Native atlas runtime admission and accessibility regression (2026-11-27)
- Owner explicitly requested actual animation integration, then all six outstanding tasks. All five exact identity-matched preferred atlas paths enabled for ordinary gameplay; old mismatched sheets retain QA gates. Individual candidate visualReview remains pending; separate hero art gate unchanged. Existing draw path uses four frames and canonical fallback, no new simulation timers.
- Actual prior run [45945481180](https://github.com/weskao/eclipse-survivors/actions/runs/45945481180) at 47ab3adc painted all six hit textures and all 20 native death cells on desktop and mobile-low. Five performance diagnostics, typecheck, build and release check passed. Responsive failed because computed HTML display was none. Identified scoped Hall CSS global selector dropping descendants; fixed selectors, added compiled CSS regression. Corrected Epic reveal seal mapping and shared treasure routing test. New commits not yet verified at documentation time.

- Follow-up real Chromium checks exercise actual hit(), drawFrame(), ageEffects and each of the five native atlases without query flags; living sprites, reduced-motion bypass and bounded reduced-flashing final-frame opacity are asserted. Actual engine treasure event and production menu component exercise rare/epic/legendary reveal decode, skip, single claim and claim cue; system reduced motion tested separately. Existing media continuity unit regressions are retained. Browser checks are new and not yet verified; no device/audio playback claim.


## Wave 7 accessibility follow-up (2026-11-27)
- Test-first commit cc798869: App system motion changes update the actual engine presentation and root attributes, listener cleanup on unmount; legacy hit flash suppression with Reduced Flashing; all 25 boss warning geometries retain the same functional outline at VFX Off and GPU boundary-only mode without changing snapshot state.
- Isolated original tint expression reproduced the bright hit flash even with Reduced Flashing; extracted App lifecycle did not propagate a system media-query change. Fixed by honoring reducedFlashing in the existing tint condition and registering/removing the live system preference listener. Isolated production expression and lifecycle checks pass. Full Vitest, Chromium and HUD/telegraph visibility acceptance still pending; do not infer historical RED or visual approval.
