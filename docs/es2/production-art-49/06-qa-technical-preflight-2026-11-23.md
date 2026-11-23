# ES2 world-art 49 — technical preflight (2026-11-23)

> **Evidence status: TECHNICAL PREFLIGHT ONLY — NOT visual approval.** This document records GitHub repository metadata and observed source-code/test/CI facts. No browser frame-by-frame visual QA, original-source-resolution validation, or real-game screenshot sign-off was performed by this audit.

- Repository: [weskao/eclipse-survivors](https://github.com/weskao/eclipse-survivors)
- Integration branch: `feature/es2-release-readiness-integration`
- **Read-only audit snapshot:** [`918b18296eeec74a15b9b03267e4cc25f9a2f407`](https://github.com/weskao/eclipse-survivors/commit/918b18296eeec74a15b9b03267e4cc25f9a2f407)
- Reference: [00-inventory.md](00-inventory.md), [README.md](README.md), [05-integration.md](05-integration.md)
- Asset sources: `src/assets/es2/production/{enemies,bosses,biomes,ui}/manifest.json` plus GitHub Contents metadata at the snapshot SHA.

## Scope and verification

| Category | Verified manifest entries | WebP files found in directory | Manifest QA state |
|---|---:|---:|---|
| enemies | 20 | 20 | `visual-review-required` |
| bosses | 4 | 4 | `visual-review-required` |
| biomes | 8 | 12 | `visual-review-required` |
| ui | 17 | 17 | `visual-review-required` |
| **Canonical total** | **49** | **53 total including 4 noncanonical biome scenes** | **NOT APPROVED** |

All **49 manifest paths exist** in the GitHub repository snapshot. The 49 returned GitHub Contents byte lengths total **1,088,948 bytes** and individually remain under their declared `maxBytes`; no duplicate `category:id` was found. These are metadata-based checks; **WebP pixel headers, alpha pixels, original authored pixel detail and declared SHA-256 were not independently re-decoded or rehashed in this preflight**. Existing `world-art-candidates.test.ts` and `heroes/production-art.test.ts` perform byte/geometry/hash checks in CI.

The manifests retain `visual-review-required` for all four categories and `needs-human-approval` for all 49 entries. Existing WebPs and manifest SHA-256 fields are left unchanged.

## Source/render resolution findings requiring remediation or source proof

1. **Enemy body (10 assets):** `production-factions.ts` draws body at `Math.max(70, enemy.radius * 4)` CSS/game units, but each committed strip's source cell is **96×96**. Even at the minimum 70px destination, 3× requires **at least 210×210 source pixels per frame**, whereas the delivered cell is 96×96 (at most 1.37 source pixels per destination pixel). This fails the *delivered-runtime-art* native-3× pixel-dimension criterion for all ten body strips. Preserve pending; regenerate only after real full-resolution source/provenance and frame audit.
2. **Enemy telegraph (10 assets):** `production-factions.ts` draws the 96×96 source into a **40×40** decorative warning. That is 2.4× rather than 3×. If warnings also require the native-3× image rule, at least **120×120** source pixels are necessary at this render size. Review the warning's actual screen use and confirm policy before replacements.
3. **Boss phases (4 assets):** `Es2Archive.vue` uses a **120×120** boss preview for source cells of 192×192: 1.6× source/destination, under native 3× at that preview size (minimum **360×360** per frame). `production-world.test.ts` also explicitly exercises a 236px rendered boss with a 192px source cell; **that is a test fixture, not real-browser gameplay evidence**. Measure actual boss Canvas dimensions and inspect all three frames before art changes. Retain pending.
4. **Biome tiles and decorations (8 assets):** Ground is 768×768 and decor is 96×96 per slot. To qualify as a nominal 3× asset, the maximum on-screen tile/decor slot must be at most 256px / 32px respectively; actual draw dimensions, edge seams, tiling and alpha require in-game measurement.
5. **UI icons (17 assets):** Each WebP is 192×192; it can meet the nominal 3× pixel-dimension criterion only if its highest displayed dimension is **at most 64px**. Verify actual desktop/touch/UI-scale dimensions and source provenance individually. Inclusion in the archive gallery does **not** establish correct gameplay/UI consumer use.

**Important:** A 3× dimension is a necessary but not sufficient condition for *native authored detail*. A resized/interpolated source may still fail even after meeting nominal dimensions. Do not mark any entries approved based only on these calculations.

## CI evidence (snapshot `918b18296eeec74a15b9b03267e4cc25f9a2f407`)

- [ES2 release readiness verification — run 45165415573](https://github.com/weskao/eclipse-survivors/actions/runs/45165415573): **failure** from the intentional `src/assets/es2/production/heroes/production-art.test.ts` approval gate. The log reports **1 failing test / 1,118 passing / 1 skipped** in 149 test files, with `pnpm typecheck`, `pnpm build`, and `pnpm check-release` finishing successfully.
- [Real Chromium mobile browser smoke — run 45165415521](https://github.com/weskao/eclipse-survivors/actions/runs/45165415521): **success**; attached artifact `es2-mobile-browser-screenshots` (artifact ID `14813599073`, SHA-256 digest `1e36b96eb58d2ab4c6ea66ed00069cf452ea420676fedb01c0395bc907eeb5c5`). The artifact has **not** been inspected frame-by-frame here and is **not** evidence that all 49 canonical art items/4 boss phases passed visual QA.
- Do not modify the blocking gate, statuses, heroes, `develop`, or `main` to make a CI check green.

## All 49 per-asset technical preflight results

“present / size in budget” means only that the named GitHub file was found and its reported byte length is within the manifest's stated budget. It does not mean passing visual, hash, frame-bleed, alpha, or gameplay QA.

### enemies (20)

| ID | File | Declared pixels / frames | GitHub bytes | Preflight | Visual QA |
|---|---|---:|---:|---|---|
| `shadow-assassin` | `shadow-assassin-body@3x.webp` | 576×96 / 6 | 17844 | present / size in budget | PENDING |
| `shadow-assassin:telegraph` | `shadow-assassin-telegraph@3x.webp` | 96×96 / 1 | 2238 | present / size in budget | PENDING |
| `necromancer` | `necromancer-body@3x.webp` | 576×96 / 6 | 18776 | present / size in budget | PENDING |
| `necromancer:telegraph` | `necromancer-telegraph@3x.webp` | 96×96 / 1 | 2902 | present / size in budget | PENDING |
| `dark-archer` | `dark-archer-body@3x.webp` | 576×96 / 6 | 18726 | present / size in budget | PENDING |
| `dark-archer:telegraph` | `dark-archer-telegraph@3x.webp` | 96×96 / 1 | 2134 | present / size in budget | PENDING |
| `plague-carrier` | `plague-carrier-body@3x.webp` | 576×96 / 6 | 20404 | present / size in budget | PENDING |
| `plague-carrier:telegraph` | `plague-carrier-telegraph@3x.webp` | 96×96 / 1 | 2968 | present / size in budget | PENDING |
| `shield-guardian` | `shield-guardian-body@3x.webp` | 576×96 / 6 | 19876 | present / size in budget | PENDING |
| `shield-guardian:telegraph` | `shield-guardian-telegraph@3x.webp` | 96×96 / 1 | 2616 | present / size in budget | PENDING |
| `phantom` | `phantom-body@3x.webp` | 576×96 / 6 | 17810 | present / size in budget | PENDING |
| `phantom:telegraph` | `phantom-telegraph@3x.webp` | 96×96 / 1 | 2974 | present / size in budget | PENDING |
| `fire-imp` | `fire-imp-body@3x.webp` | 576×96 / 6 | 21508 | present / size in budget | PENDING |
| `fire-imp:telegraph` | `fire-imp-telegraph@3x.webp` | 96×96 / 1 | 2936 | present / size in budget | PENDING |
| `frost-wraith` | `frost-wraith-body@3x.webp` | 576×96 / 6 | 21332 | present / size in budget | PENDING |
| `frost-wraith:telegraph` | `frost-wraith-telegraph@3x.webp` | 96×96 / 1 | 3364 | present / size in budget | PENDING |
| `berserker` | `berserker-body@3x.webp` | 576×96 / 6 | 19850 | present / size in budget | PENDING |
| `berserker:telegraph` | `berserker-telegraph@3x.webp` | 96×96 / 1 | 2742 | present / size in budget | PENDING |
| `crystal-sentinel` | `crystal-sentinel-body@3x.webp` | 576×96 / 6 | 25318 | present / size in budget | PENDING |
| `crystal-sentinel:telegraph` | `crystal-sentinel-telegraph@3x.webp` | 96×96 / 1 | 3570 | present / size in budget | PENDING |

### bosses (4)

| ID | File | Declared pixels / frames | GitHub bytes | Preflight | Visual QA |
|---|---|---:|---:|---|---|
| `abyss-monarch` | `abyss-monarch-phases@3x.webp` | 576×192 / 3 | 34630 | present / size in budget | PENDING |
| `frost-sovereign` | `frost-sovereign-phases@3x.webp` | 576×192 / 3 | 24164 | present / size in budget | PENDING |
| `infernal-titan` | `infernal-titan-phases@3x.webp` | 576×192 / 3 | 44514 | present / size in budget | PENDING |
| `eclipse-seraph` | `eclipse-seraph-phases@3x.webp` | 576×192 / 3 | 42434 | present / size in budget | PENDING |

### biomes (8)

| ID | File | Declared pixels / frames | GitHub bytes | Preflight | Visual QA |
|---|---|---:|---:|---|---|
| `blood-moon-cathedral:ground` | `blood-moon-cathedral-ground@3x.webp` | 768×768 / 1 | 132288 | present / size in budget | PENDING |
| `blood-moon-cathedral:decor` | `blood-moon-cathedral-decor@3x.webp` | 384×96 / 4 | 14920 | present / size in budget | PENDING |
| `cursed-forest:ground` | `cursed-forest-ground@3x.webp` | 768×768 / 1 | 124346 | present / size in budget | PENDING |
| `cursed-forest:decor` | `cursed-forest-decor@3x.webp` | 384×96 / 4 | 23150 | present / size in budget | PENDING |
| `abyssal-necropolis:ground` | `abyssal-necropolis-ground@3x.webp` | 768×768 / 1 | 128738 | present / size in budget | PENDING |
| `abyssal-necropolis:decor` | `abyssal-necropolis-decor@3x.webp` | 384×96 / 4 | 21204 | present / size in budget | PENDING |
| `celestial-rift:ground` | `celestial-rift-ground@3x.webp` | 768×768 / 1 | 120678 | present / size in budget | PENDING |
| `celestial-rift:decor` | `celestial-rift-decor@3x.webp` | 384×96 / 4 | 18504 | present / size in budget | PENDING |


The four `*-scene@3x.webp` files are additional existing files, excluded from these 49 canonical entries.

### ui (17)

| ID | File | Declared pixels / frames | GitHub bytes | Preflight | Visual QA |
|---|---|---:|---:|---|---|
| `treasure-common` | `treasure-common@3x.webp` | 192×192 / 1 | 7636 | present / size in budget | PENDING |
| `treasure-rare` | `treasure-rare@3x.webp` | 192×192 / 1 | 8666 | present / size in budget | PENDING |
| `treasure-legendary` | `treasure-legendary@3x.webp` | 192×192 / 1 | 10106 | present / size in budget | PENDING |
| `treasure-cursed` | `treasure-cursed@3x.webp` | 192×192 / 1 | 8600 | present / size in budget | PENDING |
| `rarity-common` | `rarity-common@3x.webp` | 192×192 / 1 | 2780 | present / size in budget | PENDING |
| `rarity-rare` | `rarity-rare@3x.webp` | 192×192 / 1 | 5210 | present / size in budget | PENDING |
| `rarity-legendary` | `rarity-legendary@3x.webp` | 192×192 / 1 | 3842 | present / size in budget | PENDING |
| `hud-health` | `hud-health@3x.webp` | 192×192 / 1 | 4952 | present / size in budget | PENDING |
| `hud-xp` | `hud-xp@3x.webp` | 192×192 / 1 | 6756 | present / size in budget | PENDING |
| `hud-cooldown` | `hud-cooldown@3x.webp` | 192×192 / 1 | 6768 | present / size in budget | PENDING |
| `hud-quest` | `hud-quest@3x.webp` | 192×192 / 1 | 4308 | present / size in budget | PENDING |
| `achievement-boss` | `achievement-boss@3x.webp` | 192×192 / 1 | 13204 | present / size in budget | PENDING |
| `achievement-survivor` | `achievement-survivor@3x.webp` | 192×192 / 1 | 12724 | present / size in budget | PENDING |
| `achievement-evolution` | `achievement-evolution@3x.webp` | 192×192 / 1 | 12610 | present / size in budget | PENDING |
| `achievement-explorer` | `achievement-explorer@3x.webp` | 192×192 / 1 | 6934 | present / size in budget | PENDING |
| `achievement-collector` | `achievement-collector@3x.webp` | 192×192 / 1 | 12672 | present / size in budget | PENDING |
| `achievement-flawless` | `achievement-flawless@3x.webp` | 192×192 / 1 | 1722 | present / size in budget | PENDING |

## Required next evidence before approval

1. Inspect each original `c104-provenance.json` entry and its source contact sheet, including native pixel detail, silhouettes, transparency and every separate sprite frame.
2. Capture *real* gameplay (not gallery or isolated previews) at 320×640, 375×812, 390×844, 640×320, 812×375, 768×1024, 1024×768, 1280×720 and 1920×1080. Check all ten enemy bodies and warnings, four boss phases, four ground/decor biomes and each of the 17 UI assets at its real consumer.
3. For independently confirmed art failure, follow RED → GREEN → REFACTOR and commit genuine native 3× source-derived asset **before** updating consumers. Preserve existing identical WebPs where already acceptable; never claim interpolation as authored 3×.
4. Save reviewed evidence with asset ID, source/master dimensions, on-screen max dimensions, source rect, approved screenshot/recording, SHA-256, branch commit, review author and status. Until sign-off, keep `needs-human-approval` / `visual-review-required`.
5. Re-run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` on the same current integration HEAD and compare GitHub Actions results. The three heroes remain a separate, external blocking dependency.

No WebPs, manifest approval fields, tests, or gameplay code were changed by this technical audit.
