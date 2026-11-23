---
paths:
  - "src/assets/**"
  - "src/components/**"
  - "src/game/render/**"
  - "scripts/es2/**"
  - "scripts/generate-*"
---

# Image-first asset workflow — Eclipse Survivors

Applies to every feature that needs images: characters, enemies, bosses, scenes, props, skill icons, VFX, animations, previews. Procedure lives in the [es-asset-runtime](../skills/es-asset-runtime/SKILL.md) skill; these are the hard constraints.

1. **Asset first.** Produce the image files in their final owned directory (normally `src/assets/<feature>/`; ES2 production: `src/assets/es2/production/<category>/`) before writing the code that uses them. Commit optimized runtime PNG/WebP; keep source art where the export needs it. Never finish with a chat-only image, local-only export, external URL, placeholder, mock icon, or unused manifest entry.
2. **Code second.** Import the committed file via Vite or a typed local asset map and wire it to the visible UI/Canvas/gameplay state. An image sitting in a folder or an isolated gallery is **not** applied. Keep a documented fallback for load failure.
3. **Spritesheets.** Use verified per-frame source rectangles, direction/pose order and alpha bounds from the full-resolution original. **Never guess the grid, cut into a neighboring frame, stretch a whole contact sheet as one sprite, or invent missing frames** — repair or re-render bad source frames first. Hitbox/telegraph geometry stays independent of visual pixels.
4. **Acceptance.** Manifest records dimensions, frame geometry, source ID, transparency, SHA-256 and size budget where appropriate. RED → GREEN → REFACTOR tests cover asset presence, mapping, source-rect bounds, atlas direction/state selection and fallback. Review contact sheets and real in-game screenshots (desktop, mobile, reduced motion, visual continuity) before calling art production-ready.
5. **Merge gate.** Image files and their real code consumers land in the same verified integration. Never merge incomplete art as final.
