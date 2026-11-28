---
paths:
  - "src/game/bosses/**"
  - "src/game/content/bosses/**"
  - "src/game/render/es2/**"
  - "src/components/es2/hud/**"
  - "src/assets/es2/production/bosses/**"
---

# BOSS visuals — arrival countdown UI and phase body size

Mandatory for every current and future BOSS. Complements `boss-music-production.md` (score, per-attack SFX) and `character-art-3x.md` (source art).

## Arrival countdown UI

- Use the authoritative upcoming encounter's `BossId` and its approved artwork-aligned `BOSS_DEFINITIONS.color` as the single palette source.
- The shared countdown panel must theme its background gradient, frame/ornaments, warning glyph, heading, boss name, numerals/unit, progress track/fill, and urgent glow from that same accent; no generic orange/red override or duplicate per-BOSS component.
- Keep readable contrast, the existing timing and spawn prerequisites, non-interactive compact responsive placement, localized names, and reduced-motion/flashing behavior.
- Unknown legacy encounters use the existing generic fallback; never guess the upcoming identity.
- Verify the warning matches the boss that actually spawns in every mode and visually review desktop/mobile before acceptance.

## Phase body size

- Use the visible solid-alpha body silhouette of P1 as the reference, not the transparent atlas cell size.
- P2/P3 must not appear smaller; preserve the source aspect ratio with one uniform scale, stable center/ground anchor and exact isolated source rect. Never stretch/squash width or height independently.
- Preserve current phase growth (112%/124% of P1 visible height), adjust the overhead health bar and renderer culling for the actual art, and never modify physics, hitboxes or combat balance for this correction.
- Precompute/cache geometry at image decode; no per-frame pixel readbacks.
- Assets needing more than the bounded 2x padding correction require art QA/re-authoring, not uncontrolled enlargement.
- Verify all three phases of every BOSS on real desktop/mobile; native-3x and actual browser evidence remain separate gates.
