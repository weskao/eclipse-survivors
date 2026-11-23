# ES2 UI 17 — conditional artwork QA and remediation ledger

**Branch:** `feature/es2-art-qa-ui` (updated 2026-11-23). **Human visual sign-off: pending.** This record documents repository source and manually inspected images; it is **not browser gameplay evidence**.

## Completed technical work
- Inspected all 17 existing transparent WebP icon previews individually.
- Preserved 14 original files byte-for-byte. Identified stray horizontal/adjacent-source color in `rarity-legendary` and `hud-xp`; `rarity-rare` had an unwanted right-side dark rectangle. Re-authored **only these 3** from a newly generated detailed transparent master.
- Authored source: original **724×724 per icon**, three independent cells; output WebPs individually rendered **192×192** with alpha, 1 frame, compressed well below 75,000 bytes. Generation ID `e0ae89ca-a466-4ecd-9e7b-254f2406c140`. These are new artworks, not enlarged former 192px sources.
- Replacements were committed as actual project files **before** the manifest updates and before any consumer integration; they preserve the existing `WORLD_ART.ui` filenames and IDs.
- The existing `world-art-candidates.test.ts` verifies exact file SHA, bytes and source dimensions; this category's `ui-qa-evidence.test.ts` verifies the VP8X alpha feature flag of all 17.
- A real **3×** nominal size for every original 192px icon requires **≤64 CSS pixels** of display. Currently archive achievement cards and preview gallery use 72 CSS pixels, while rarity badges use 20px and HUD icons use 15px. Integration owner must reduce archive display dimensions to 64px or provide native 216px art; this workstream may not modify the shared Vue consumer.

## Per-icon state

| Asset ID | Treatment | Bytes (new) | Active CSS px before integration | Human visual QA |
|---|---|---:|---:|---|
| treasure-common | RETAINED | existing | gallery only | needs-human-approval |
| treasure-rare | RETAINED | existing | gallery only | needs-human-approval |
| treasure-legendary | RETAINED | existing | gallery only | needs-human-approval |
| treasure-cursed | RETAINED | existing | gallery only | needs-human-approval |
| rarity-common | RETAINED | existing | 20 | needs-human-approval |
| rarity-rare | REDRAWN | 5484 | 20 | needs-human-approval |
| rarity-legendary | REDRAWN | 5646 | 20 | needs-human-approval |
| hud-health | RETAINED | existing | 15 | needs-human-approval |
| hud-xp | REDRAWN | 7778 | 15 | needs-human-approval |
| hud-cooldown | RETAINED | existing | 15 | needs-human-approval |
| hud-quest | RETAINED | existing | 15 | needs-human-approval |
| achievement-boss | RETAINED | existing | 72 | needs-human-approval |
| achievement-survivor | RETAINED | existing | 72 | needs-human-approval |
| achievement-evolution | RETAINED | existing | 72 | needs-human-approval |
| achievement-explorer | RETAINED | existing | 72 | needs-human-approval |
| achievement-collector | RETAINED | existing | 72 | needs-human-approval |
| achievement-flawless | RETAINED | existing | 72 | needs-human-approval |

## Consumer trace
- All 17 are mapped through `WORLD_ART.ui` in `src/game/render/es2/production-world.ts`.
- `src/components/es2/menu/Es2Archive.vue`: 6 achievement icons in actual achievement cards, 17 UI icons in review gallery; 4 treasure icons have not been verified in a **live loot/chest** consumer.
- `src/components/es2/menu/Es2ChoiceCards.vue`: 3 rarity icons in actual selectable cards.
- `src/components/es2/hud/CombatHud.vue`: 4 HUD icon slots, including cooldown overlay.

## Still required before sign-off
1. On **real Vue/Canvas gameplay**, capture desktop, 320px and 375px mobile portrait, short landscape, safe areas, reduced motion, active and collapsed HUD, card tap, rarity labels, and achievement lock/unlock.
2. Confirm authentic `assets/images/imgs10.png` original crop mapping and distinguishable silhouettes; verify per-pixel transparent bounds, no bordering contamination, no clipping or 1× blur of all 17.
3. Verify runtime treasure chest/loot consumer, or document as intentionally preview-only without falsely claiming gameplay use.
4. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`; attach GitHub Actions URLs. No claim these ran in this GitHub connector-only asset pass.
5. Only after real-browser and human visual checks may authorized review change manifest `needs-human-approval` and `visual-review-required`. The status remains unchanged.

**Safety:** Heroes, enemies, bosses, biomes, gameplay, shared consumers, main, and develop were untouched by this workstream. No PR, force-push or deployment.
