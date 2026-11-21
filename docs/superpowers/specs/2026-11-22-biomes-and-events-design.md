# Biomes and random events — design

## Intent
Turn four existing timed atmospheres into distinct playable combat spaces, while preserving the established Vue/TypeScript/Vite Canvas 2D game.

## Approach
Use four prerendered procedural tile and landmark canvases rather than new dependencies, a physics engine, or a large art-download pipeline. Keep Dawn's illustrated courtyard; Thunder, Frost, and Ash use their own cached textures and motifs. Sparse deterministic world cells define circular collidable props and clearly visible ground hazards. Reuse the existing hero damage, XP and mob types.

## Events
Schedule bounded random opportunities during play; six weighted event types have immediate or timed effects. Place within player reach, off colliders and hazards, and clear of other events. Expire unclaimed rewards and reset the schedule on scene change. A cooldown and entry grace window limit hazard damage.

## Guarantees
Never change shared combat formulas or upgrade definitions. Preserve renderer's DOM-independent tests. Keep minimap coordinates identical to world coordinates and cap visible draw loops for mobile. No heavy physics/navigation frameworks, no new runtime dependencies.
