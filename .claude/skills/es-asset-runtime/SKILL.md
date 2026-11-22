---
name: es-asset-runtime
description: Prepare and verify local Eclipse Survivors art when adding or replacing sprites, animation, scenery, icons, or effects used by Vue or Canvas.
---

# Integrate game art

1. Confirm the approved source and intended player-facing surface. Put the runtime PNG or WebP in the owning asset directory, typically `src/assets/es2/production/<category>/` for ES2. Keep source sheets where they are required to reproduce the export.
2. Inspect source sheets at full resolution. Record each crop's owner region, bounds, frame order, direction and pose. Check for neighboring pixels, clipped silhouettes and opaque matte. Keep authored directional frames in their original orientation and preserve the legacy mirror on its fallback path. For animated heroes, read the [rigid weapon and projectile rules](../../rules/realtime-performance.md#rigid-weapons-are-never-deformable-body-texture).
3. Follow the owning manifest's conventions for source provenance, dimensions, frame geometry, transparency, hashes and size budget. Verify the exported files against the manifest. Keep a contact sheet for visual inspection where multiple frames or related assets need to be compared.
4. Write a failing regression for the intended runtime consumer. Connect the art through a Vite import or existing typed asset map. Exercise the real Vue state or Canvas draw path, including the correct frame and the fallback during decode failure or an unsupported pose. Keep hitboxes and telegraphs tied to gameplay geometry.
5. Inspect the live surface at intended display sizes and under reduced motion when applicable. Include representative screenshots or clips in the handoff. Report whether each asset was exported, wired, and observed in the game.
