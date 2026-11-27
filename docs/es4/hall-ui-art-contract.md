# ES4 Hall visual and interaction implementation contract

Use the existing Eclipse Survivors dark fantasy art direction. Contemporary game conventions: compact node constellations and focused detail panels rather than dashboard card grids; restrained dark surfaces, engraved metal, meaningful palette by discipline, and legible hierarchy. References are layout inspirations, not copied visual assets.

- Preserve original core research and shared HallGrowthBoard. Add a discrete constellation entry; six medallion-shaped discipline/hero controls, distinct signature geometry, selected-state underline/rim and one action. Avoid repeated oversized rectangular buttons and gratuitous neon glow.
- Mobile: 44px hit targets, safe-area inspector, no forced scrolling; short landscape side panel; fine pointer hover preview; keyboard arrows, focus and Escape. Maintain selected category and per-tree node selection.
- Progress: actual rank, requirements, cost, owned vs equipped; no spend on preview. Until authoritative storage and gameplay are ready, show an explicit preview state with disabled transaction. Never simulate success or deduct currency for placeholders.
- Art: 72 semantic temporary SVG icons, each with a stable future 3× transparent WebP path and a visual brief. Future asset replaces SVG through reviewed manifest; no SVG is production art approval. Existing hero identity and art preserved. Use one consistent pictogram family and silhouette, not 72 unrelated fantasy stickers.
- Motion: finite entry transition, restrained hover, inherited rank progress/Shimmer and transaction-gated celebrations; full motion/flashing alternatives, no endless decorative loops. Each rank and route sound must use existing audio bus. Signature and resonance-specific art/audio remain gated on real unlocks.
- All designs must pass bilingual viewport, text wrap, keyboard, touch and actual audiovisual review. No claimed approval before evidence.
