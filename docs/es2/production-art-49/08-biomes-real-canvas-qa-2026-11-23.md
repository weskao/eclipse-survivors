# ES2 World Art: 4 × 2 Real Canvas Biome Capture Evidence — 2026-11-23

> **Browser/runtime technical QA: PASS. Visual / native-3× art acceptance: PENDING.**
>
> This records real Chromium gameplay Canvas screenshots from the built Vue application; it does **not** approve any of the 49 pending art assets.

- Repo: https://github.com/weskao/eclipse-survivors
- Source branch: `feature/es2-release-readiness-integration`
- Verified CI head: [`93fc54fdfa18838edf8292e17ecbd602e25cd87e`](https://github.com/weskao/eclipse-survivors/commit/93fc54fdfa18838edf8292e17ecbd602e25cd87e)
- Successful workflow: [ES2 real Chromium mobile browser smoke #45173141087](https://github.com/weskao/eclipse-survivors/actions/runs/45173141087)
- Screenshot archive: GitHub Actions artifact **`es2-mobile-browser-screenshots`**, ID **`14818042534`**, SHA-256 `decca40a29d45c9cf8dc2ac3efacedbe945ce6ac041611098f353f4e42fa0ec2`
- Technical QA script: `scripts/es2-world-art-browser-qa.mjs`
- Regression tests: `src/assets/es2/production/world-art-browser-qa.test.ts`

## Source and test verification

The source test was committed in [`aeaee303`](https://github.com/weskao/eclipse-survivors/commit/aeaee3033fe06127bb65f289a93786ff0216c1d7) and was confirmed RED (both tests failed) on [run #45170604326](https://github.com/weskao/eclipse-survivors/actions/runs/45170604326).

The implementation in [`d9317edf`](https://github.com/weskao/eclipse-survivors/commit/d9317edf9121671529d58e41062e99cc657dba9f) made both tests GREEN; [CI #45170972374](https://github.com/weskao/eclipse-survivors/actions/runs/45170972374) reported **1,122 passing, 1 skipped, 1 failure**, solely the existing manual art approval gate, with typecheck, build and check-release succeeding.

The browser QA executes `pnpm preview` on the production build, enters game with `?showcase=1`, uses the existing engine's capture-only `window.__test.previewBiome(index)` hook, waits for a fresh draw frame, and captures the **real running game canvas**. This is not an archive gallery, synthetic mock, or proof of ordinary campaign progression.

## Eight verified gameplay screenshot paths

| Runtime scene index | Desktop screenshot 1440×900 | Touch phone screenshot 375×812 |
|---|---|---|
| 0 | `world-art/gameplay-biome-0-desktop-1440.png` | `world-art/gameplay-biome-0-mobile-375.png` |
| 1 | `world-art/gameplay-biome-1-desktop-1440.png` | `world-art/gameplay-biome-1-mobile-375.png` |
| 2 | `world-art/gameplay-biome-2-desktop-1440.png` | `world-art/gameplay-biome-2-mobile-375.png` |
| 3 | `world-art/gameplay-biome-3-desktop-1440.png` | `world-art/gameplay-biome-3-mobile-375.png` |

The successful job log contains all of:

~~~text
PASS: four distinct live Canvas biomes captured at desktop-1440
PASS: four distinct live Canvas biomes captured at mobile-375
PASS: 49/49 production WebPs decoded, source geometry/alpha verified in real Chromium
ATTENTION: Native 3x source provenance, full combat state coverage and human approval remain pending
~~~

The same run completed portrait 320/375, landscape 640/812, tablet, desktop 1280/1440/1920 and 200%-zoom-equivalent RWD smoke checks. It uploaded a separate `es2-world-art-source-review` artifact with source WebPs, original `imgs*.png`, and manifests.

## Native-3× and animation honesty

Existing `c104-provenance.json` identifies repeated **source crop boxes** in all ten six-slot enemy body atlases. Four enemy types reference only 3 distinct source regions; six types reference 4 distinct source regions. Thus the 60 authored-slot positions use 36 distinct original source regions; **24 slots reuse regions**. This does not imply byte-identical final WebP pixels (resizing/crop processing can vary) but it is not evidence of 60 separately authored animation poses. Require individual image/sequence review before release.

Native authored source resolution is still below the project's strict 3× acceptance criteria for enemy bodies, bosses, biome grounds/decor and at least some UI use cases. The existing manifest statuses remain `visual-review-required` / `needs-human-approval`. Do not mark any image approved, synthesize missing action poses by repeating source boxes or upscaling, or bypass the blocking test.

## Integrity and limitations

- New genuine Canvas screenshots verify that all four scene switches render at two viewports, but do **not** establish absence of all visual seams under sustained camera motion or every hazard/decor variation.
- The 49 decoded WebPs establish technical integrity and gallery loading, not proof that all 10 enemy forms, 4 bosses × 3 phases, and every UI image appear in their actual normal gameplay states.
- Manual visual sign-off, authentic native 3× masters, identity/animation continuity, full combat state coverage and the separate 3-hero workstream remain outstanding.
- This evidence changes **no images, hitboxes, heroes or approved statuses**.
