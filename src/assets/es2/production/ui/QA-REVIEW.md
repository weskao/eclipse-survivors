# ES2 17 UI icons — original pixels verified, no speculative replacement

Date: 2026-11-23. Workstream: `feature/es2-art-qa-ui`. **0/17 human-approved; 17/17 remain `needs-human-approval`**.

## Correction / evidence
- Downloaded the `es2-world-art-source-review` ZIP artifact (ID 14816995401) from the successful browser workflow [45170008905](https://github.com/weskao/eclipse-survivors/actions/runs/45170008905), which holds the original 17 WebP files and original `assets/images/imgs10.png` (1672×941 RGBA).
- Used Pillow to decode each **actual original** RGBA WebP, checked original `manifest.json` SHA-256 (17/17 equal), dimensions (17/17 are 192×192), alpha bounds and opacity at the four outermost image edges. **Zero visible edge pixels with alpha ≥16 on the 192px outer boundary for all 17**. This does not prove that no interior stray pixel or color fringing exists.
- Three original WebP thumbnails previously appeared to contain side streaks; when composited from original decoded RGBA onto a solid background, no neighboring horizontal bar appeared. The original assets are **not proven defective**. A previous isolated branch candidate re-authored `rarity-rare`, `rarity-legendary` and `hud-xp` before that stronger evidence was available. This follow-up **restores their original Git blobs, original manifest, and SHA-256**, so no speculative art replacement is delivered.
- Browser workflow 45170008905 did decode all 49 existing world-art assets and capture archive screenshots. Its success belongs to that specific past SHA, not a later integration branch head or full real gameplay state; human visual review is still pending.

## Per-icon RGBA evidence

Alpha bbox is the bounding rectangle for alpha ≥16; coordinates are `left,top,right,bottom`, right/bottom exclusive. Pixel coverage is the fraction of the 192×192 canvas at alpha ≥16.

| Asset | WebP bytes | Alpha bbox | Pixel coverage | Outer edge α≥16 | Original SHA-256 |
|---|---:|---|---:|---:|---|
| `treasure-common` | 7636 | `11,33,181,158` | 46.8% | 0 | matches manifest |
| `treasure-rare` | 8666 | `11,30,181,161` | 48.4% | 0 | matches manifest |
| `treasure-legendary` | 10106 | `11,23,181,169` | 48.6% | 0 | matches manifest |
| `treasure-cursed` | 8600 | `11,29,181,162` | 49.9% | 0 | matches manifest |
| `rarity-common` | 2780 | `63,11,128,147` | 16.8% | 0 | matches manifest |
| `rarity-rare` | 5210 | `55,12,137,181` | 26.7% | 0 | matches manifest |
| `rarity-legendary` | 3842 | `81,11,156,152` | 19% | 0 | matches manifest |
| `hud-health` | 4952 | `51,30,181,160` | 29.8% | 0 | matches manifest |
| `hud-xp` | 6756 | `12,11,180,181` | 49.7% | 0 | matches manifest |
| `hud-cooldown` | 6768 | `11,18,181,175` | 45.2% | 0 | matches manifest |
| `hud-quest` | 4308 | `76,12,160,181` | 27.2% | 0 | matches manifest |
| `achievement-boss` | 13204 | `12,11,180,181` | 38.8% | 0 | matches manifest |
| `achievement-survivor` | 12724 | `12,11,179,181` | 27.9% | 0 | matches manifest |
| `achievement-evolution` | 12610 | `11,12,181,180` | 40% | 0 | matches manifest |
| `achievement-explorer` | 6934 | `33,11,178,180` | 15.3% | 0 | matches manifest |
| `achievement-collector` | 12672 | `13,11,178,181` | 39% | 0 | matches manifest |
| `achievement-flawless` | 1722 | `82,54,129,158` | 2.7% | 0 | matches manifest |

## Relevant runtime consumer / 3× nominal sizing

- All 17 are accessible via `WORLD_ART.ui`. Real Vue code places four treasure icons in `RelicRewardOverlay.vue` (cursed, legendary, rare/epic, common), three rarity badges in `Es2ChoiceCards.vue`, four HUD icons in `CombatHud.vue`, and six achievement badges plus a 17-item gallery in `Es2Archive.vue`.
- Original source dimension is 192×192. **UI display up to 64 CSS px meets nominal 3× dimension**; however this does not prove truly authored 192px fine detail from `imgs10.png`.
- Current consumer widths before integration correction: achievement card icons and gallery 72px, loot chest icons 68px; these exceed a 192px/3 nominal source-to-display size. The integration branch must change those to ≤64px and verify visually.
- Rarity badge active UI is 20px, HUD active icon is 15px. Their nominal scale is above 3×.
- `achievement-flawless` has only **2.7%** nontransparent area (bbox 47×104); it is especially likely to be too small in an achievement card. Avoid stretching its 47px source pixels and falsely claiming native 3×. It needs a newly authored high-detail source, and actual 1× screenshot comparison, before final approval.
- Source sheet is available; do not assume each 192px extracted output contains native 192px authored detail.

## Gate and remaining work
- All category manifest statuses remain `visual-review-required`, each asset `needs-human-approval`.
- TDD / integration follow-up: 64px CSS guards for archive, gallery and actual chest, real desktop/320/375 portrait and short landscape screenshots, genuine 3× source provenance, visual comparison and human approval.
- Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release` at **the updated integration head**. A passed CI on a previous SHA is not proof of a newer SHA.
- No other category, hero, collision, gameplay, develop, main, PR, deploy or force-push is part of this source workstream.
