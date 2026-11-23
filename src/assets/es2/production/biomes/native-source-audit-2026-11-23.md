# ES2 Biomes 8 — genuine 3× ground art application and real browser QA (2026-11-23)

**Source branch:** `feature/es2-art-qa-biomes`  
**Status:** THREE ground replacements **actually installed and runtime verified**; FIVE assets still blocked; all 8 remain `needs-human-approval`. No integration or release approval is implied.

## Verified authored sources / original packs

The original GitHub Actions [world-art source review](https://github.com/weskao/eclipse-survivors/actions/runs/45173141087) artifact (`14818227501`) was downloaded and visually inspected. `assets/images/imgs1.png` and `imgs9.png` are each **1672×941 px collages**, not four isolated 330×330 authored prop masters. The tiny isolated parts cannot be enlarged or renamed `@3x` and treated as native source. The original four decor sheets remain 4×96×96, still pending real reauthoring.

Three genuine source artworks were independently generated at **1254×1254**, cropped to **1152×1152** without scaling up the old 768px game art, and stitched for visual 2×2 edge inspection. Authored master SHA values are recorded on each updated `ground` manifest item; the full original PNGs and candidate preview package are preserved in the conversation artifact, not inside the runtime build.

## Binary GitHub application — VERIFIED

- [Binary patch staging commit `dbb2a355`](https://github.com/weskao/eclipse-survivors/commit/dbb2a35550fc1a52c5752d4d6efa9f6fadf94d04) preserved the exact **2,470,776 byte** Git binary patch across ten SHA-verified blob parts.
- [Actions run **45186384834**](https://github.com/weskao/eclipse-survivors/actions/runs/45186384834) successfully checked patch SHA-256, applied the three binaries, passed existing world-art integrity/mapping, typecheck, production build, check-release and pushed by normal fast-forward (no PR/force/main/develop).
- **Actual installation commit:** [`fd6e9e335cf41a3df6c057bc19b5c9a1cff13a74`](https://github.com/weskao/eclipse-survivors/commit/fd6e9e335cf41a3df6c057bc19b5c9a1cff13a74). Exact original asset paths retained; the transient patch parts were removed.
- New manifest remains `visual-review-required` and all assets remain `needs-human-approval`; `native3x:true` now applies to the three new ground sources *as source-resolution metadata only*, NOT human approval.

| Asset | New WebP dimensions | Bytes | SHA-256 | New authored master | Status |
|---|---|---:|---|---|---|
| `blood-moon-cathedral:ground` | 1152×1152 | 467142 | `7863a3111779dff6eacd6bb8ccf7e8da2da0615081c7255190fa977aa06a370e` | 1254×1254 | applied / approval pending |
| `cursed-forest:ground` | 1152×1152 | 549912 | `ea4f17a975d589aba1d4ed28f11591deeed6f1f6017eaec49884a418268ce9e0` | 1254×1254 | applied / approval pending |
| `abyssal-necropolis:ground` | 1152×1152 | 509626 | `63c3a79aa355b24a7a90c015a82042937ba9e6f02d30bf5b0e6e39ddc1c55c52` | 1254×1254 | applied / approval pending |

The runtime's existing Vite URL mapping automatically resolves the three replacement WebPs; no gameplay collisions or player hitboxes were modified.

## Actual Chromium screenshots: full production build, no mockups

[Successful genuine browser QA run **45187256704**](https://github.com/weskao/eclipse-survivors/actions/runs/45187256704); artifact `es2-biomes-native-source-real-browser-evidence` **ID 14824117688** (retained by GitHub Actions for 7 days).

Read-only QA script: `src/assets/es2/production/biomes/qa-live-browser.mjs` with workflow `.github/workflows/es2-biome-real-browser-qa.yml`.

- Captures **12 actual in-game Vue Canvas screenshots**, one each for scene 0–3 at desktop **1440×900**, phone portrait **375×812** at DPR2, and landscape **812×375** at DPR2. Uses `?showcase=1` and the real engine `window.__test.previewBiome(index)`, waiting for a new actual Canvas frame. Does not fake progression or archive-gallery screenshots.
- Source decode reverified all four ground WebPs at each viewport, including 1152px for the three replacements and 768px for untouched Celestial Rift. All 12 scenes switched successfully without uncaught browser errors.
- Original GitHub artifact contains 12 PNGs, named WebM recordings for each viewport, and `biome-runtime-evidence.json`. MP4 conversions may be exported separately from downloaded evidence.
- Decoded per-edge mean absolute RGB values in live Chromium (left/right, top/bottom):

| Biome | Loaded source | L/R RGB mean | T/B RGB mean |
|---|---:|---:|---:|
| Blood Moon Cathedral | 1152×1152 | 3.05 | 2.94 |
| Cursed Forest | 1152×1152 | 3.84 | 4.14 |
| Abyssal Necropolis | 1152×1152 | 3.23 | 3.00 |
| Celestial Rift (old) | 768×768 | 3.19 | 3.02 |

**Human visual inspection pending:** visible repetitive large floor motifs, prop layering, contrast and HUD readability in all camera motion and gameplay state variations still need approval. A low mean edge delta is not proof of perfect visual seamlessness or authored native detail.

## Test / remaining blockers

[Native-3× dedicated verification run **45187209702**](https://github.com/weskao/eclipse-survivors/actions/runs/45187209702) exercised all 8 dimension tests: **3 passed, 5 failed** (the untouched Celestial Rift ground and 4 decor atlases). Existing world-art integrity/mapping, TypeScript, build and release check passed. The larger suite still has independent hero/source-art manual gate failures outside this workstream. Do not silence these failures.

To complete the 8-item production-art workstream: author and validate one genuine Celestial Rift 1152×1152 floor plus **four distinct 4-cell 1320×330 transparent decor atlases** (330×330 each, safe frame edges), stage each binary before runtime wiring, inspect source/native detail and gameplay screenshots, then obtain explicit human art signoff and coordinate sequential integration into `feature/es2-release-readiness-integration`. Do not modify heroes, main, develop, force push, open PR or deploy.

Audited HEAD before this documentation update: `bdd7153e80b3c43b78a41dbed8df406bc2872774`.
