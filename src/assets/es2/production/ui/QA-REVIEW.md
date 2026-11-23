# ES2 UI 17 — repository preflight QA evidence

> Reviewed against GitHub branch `feature/es2-art-qa-ui` at commit `6e8d9f81d5acb3696f4da2a341533693a6389594` on 2026-11-23. This is **repository metadata / consumer-source review only**, **not actual browser visual QA or native-source approval**. No existing WebP has been modified or regenerated.

## Inventory and reproducible checks

- 17/17 UI WebP files present; 17 unique IDs in `manifest.json`. Source attribution in manifest: `assets/images/imgs10.png`.
- GitHub files are all **192×192, one source cell, VP8X with alpha feature flag set** (checked by decoding the WebP RIFF headers), and all are below the manifest's 75,000-byte budget. The *header flag* does not prove there are appropriate transparent gutters/pixel alpha coverage.
- Existing `src/assets/es2/production/world-art-candidates.test.ts` checks file existence, SHA-256, RIFF length, frame geometry and byte limits; `src/game/render/es2/production-world.test.ts` checks all 49 URL mappings, including these 17.
- `WORLD_ART.ui` references the whole set. Active consumers found: `Es2ChoiceCards.vue` (rarity), `CombatHud.vue` (health, XP, cooldown, quest), `Es2Archive.vue` (achievements). All 17 appear in the archive's review gallery. Treasure items are **not confirmed in a gameplay chest/loot consumer** by this source inspection.

| UI asset | Compressed bytes | Active CSS px | Gallery CSS px | Nominal ratio at 72px | Visual status |
|---|---:|---:|---:|---:|---|
| `treasure-common` | 7636 | not identified | 72 | 2.67× at 72px | `needs-human-approval` |
| `treasure-rare` | 8666 | not identified | 72 | 2.67× at 72px | `needs-human-approval` |
| `treasure-legendary` | 10106 | not identified | 72 | 2.67× at 72px | `needs-human-approval` |
| `treasure-cursed` | 8600 | not identified | 72 | 2.67× at 72px | `needs-human-approval` |
| `rarity-common` | 2780 | 20 | 72 | 2.67× at 72px | `needs-human-approval` |
| `rarity-rare` | 5210 | 20 | 72 | 2.67× at 72px | `needs-human-approval` |
| `rarity-legendary` | 3842 | 20 | 72 | 2.67× at 72px | `needs-human-approval` |
| `hud-health` | 4952 | 15 | 72 | 2.67× at 72px | `needs-human-approval` |
| `hud-xp` | 6756 | 15 | 72 | 2.67× at 72px | `needs-human-approval` |
| `hud-cooldown` | 6768 | 15 | 72 | 2.67× at 72px | `needs-human-approval` |
| `hud-quest` | 4308 | 15 | 72 | 2.67× at 72px | `needs-human-approval` |
| `achievement-boss` | 13204 | 72 | 72 | 2.67× at 72px | `needs-human-approval` |
| `achievement-survivor` | 12724 | 72 | 72 | 2.67× at 72px | `needs-human-approval` |
| `achievement-evolution` | 12610 | 72 | 72 | 2.67× at 72px | `needs-human-approval` |
| `achievement-explorer` | 6934 | 72 | 72 | 2.67× at 72px | `needs-human-approval` |
| `achievement-collector` | 12672 | 72 | 72 | 2.67× at 72px | `needs-human-approval` |
| `achievement-flawless` | 1722 | 72 | 72 | 2.67× at 72px | `needs-human-approval` |

Manifest hashes remain the authority for exact SHA-256 values; no asset digest or manifest status was changed. All files have one cell with source rectangle `(0, 0, 192, 192)`. Distinct silhouettes, visible alpha bounds, original source crop regions, and native authored detail **remain unverified**.

## Confirmed dimensional risk

- The archive's `.es2-world-art-icon` is `72×72` CSS px. All `192px` source images provide only `192/72 = 2.67×` *nominal* source dimensions there, less than the `3×` gate. At that preview size, `216×216` actually authored detail would be required.
- The **six actual achievement icons** use `.es2-achievement-icon { width:72px; height:72px }`; the same nominal resolution gap applies in the actual achievement cards, not only the gallery.
- Rarity labels use `20×20` CSS px and HUD active icons use `15×15` CSS px, so their nominal source dimension is sufficient for those specific active contexts; that **does not verify authentic source detail or artwork quality**.
- No runtime consumer CSS or gameplay logic is owned by this independent QA branch. Integration owner should evaluate lowering the 72px presentation to at most 64px **if UX allows**, or commission **genuinely authored** ≥216×216 source art for any 72px display. Never interpolate 192→216 and claim native 3×. Review actual visual legibility and the user-requested 3× rule before choosing.

## Per-category action and blockers

- **Treasure (4):** keep existing files and hashes. Confirm real chest/loot flow integration (currently only the art gallery is verified), distinctions between common/rare/legendary/cursed, real original-source crops and alpha bounds.
- **Rarity (3):** keep existing files and hashes. Inspect 20px rarity badges on choice cards in 320px and 375px portrait, short landscape, desktop, and keyboard/touch selection states; inspect 72px gallery separately.
- **HUD (4):** keep existing files and hashes. Inspect 15px HP, XP, quest, cooldown icons in active and collapsed/expanded HUD, simultaneous boss warning/skill overlays and both joystick-side settings.
- **Achievements (6):** **needs-fix or layout decision** because active 72px > nominal 3× safe 64px. Inspect locked/unlocked cards, badge readability, alpha bounds and English / Traditional Chinese overflow.
- **All (17):** inspect `assets/images/imgs10.png` original detailed source at actual resolution; compare extracted crop identity and contact sheet; screenshot real Vue gameplay at desktop, 320px/375px portrait and short landscape; record before/after visual evidence, frame boundary and transparent gutter samples. Source image itself was not visually inspected in this pass.

## QA decision

**0/17 visually approved; 17/17 still need human/browser visual approval.** The existing `needs-human-approval` records and category `visual-review-required` status are correct, and remain unchanged. Technical file/header checks are not equivalent to visual approval. Do not merge to `develop`/main or silently modify consumers from this workstream.

### Pending commands / authentic runtime evidence

The full repository could not be checked out into a runnable environment during this GitHub-connector review; therefore `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, actual browser screenshots and MP4 are **not claimed as run/passed**. Run them after checking out this branch and attach real browser output before sign-off.
