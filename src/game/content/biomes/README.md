# Eclipse Survivors — ES2 biome adapter handoff

This module provides **four independent gameplay environments** but intentionally does not edit `src/game/world.ts`, `src/game/step.ts`, `src/game/render/`, `src/game/scene.ts` or the integration-owned `src/game/content/packs/index.ts`. Merely registering `BIOMES_PACK` is not sufficient to make these stages selectable or playable. An integration branch must wire environment adapters into the engine, renderer and minimap.

## Public contract

```ts
import { BIOMES_PACK } from '../packs/biomes'
import { createBiomeSession } from './index'

const session = createBiomeSession('cursed-forest', { seed: 42, maxCells: 256 })
const env = session.current
const safeHeroPosition = env.collide({ x: hero.x, y: hero.y }, 17)
const danger = env.contact(safeHeroPosition, 17, simulationTime)
const geometry = env.minimap(hero.x, hero.y, 1050)
const sprites = env.visibleDecorations({ left, top, right, bottom })
const usedNode = env.interact(hero, simulationTime)
session.enter('celestial-rift') // new deterministic scene, cleared interaction state
```

- `cell(i,j)` generates deterministic, frozen terrain, hazard, decoration and interactive-node data from biome ID, seed and integer cell position. At most 256 cached cells by default; configurable between 1 and 4096, using least-recently-used eviction. Evicted cells regenerate identically. The adapter does not store moving actors or evolving timers in the procedural cache.
- The world has connected safe passage corridors across the 420-unit grid, and a hazard-free/obstacle-free central spawn. Obstacles use the existing game's **circle** collision model. `collide()` returns a resolved point; the integration branch must apply it to hero and mob positions after movement, preserving their existing hitbox radii and not altering projectile rules.
- `phase(hazard,time)` returns `idle`, `warning` or `active` in seeded periodic cycles. `contact()` returns per-second damage, a movement speed multiplier and a repulsive force vector (world units per second), **not already-applied damage**. The integrator is responsible for applying those to live simulation using `dt`, existing hero damage/invulnerability rules and safe frame caps. Never call damage on warning/idle.
- `interact()` activates an environment-specific node for nine seconds, suppressing nearby hazards within 172 units. Interaction state is bounded at 48 nodes and reset on scene changes. Supply a player action control with feedback; this module does not install UI inputs.
- `minimap()` exports the exact same obstacle/hazard world positions and radii as collision/hazard queries. Scale to the minimap with the existing transform; do not create an unrelated visual-only map.
- `visibleDecorations()` culls by world-space viewport bounds. Generate offscreen sprites once, draw only visible items, and invalidate GPU/canvas assets on context, DPR, asset or scene changes.

## Rendering and art requirements

| Biome | Gameplay and terrain | Environment art and mood | Telegraph/readability |
| --- | --- | --- | --- |
| Blood Moon Cathedral | Gothic columns / broken pews; periodic ritual and corrupted altar zones; blood seal suppression | Blood-moon rooflight; gothic stone tile, ruined cathedral silhouettes, crimson mist, animated embers and ritual sigils | Bright amber ritual ring during warning; solid crimson active area beneath actors |
| Cursed Forest | Thick ancient trunks / brambles; poison bloom damage and root snare; ward trees cleanse nearby ground | Layered canopy, moss, roots, toxic flora, eerie green spores | Yellow warning roots and distinct green poison gas; do not tint playable heroes the same color |
| Abyssal Necropolis | Tombs / ossuaries; cursed ground and wraith chill; soul lantern suppression | Stone grave slabs, mausoleums, blue-grey spectral fog, distant spirits | Gold warning glyph followed by pale cyan/purple danger ring; keep enemy cast silhouettes readable |
| Celestial Rift | Floating stones / arcane spires; outward gravity push and arcane surge; rift anchors | Starlit void, levitating arcane fragments, astral gradients, moving star particles | Amber warning ring, violet/blue active rift; preserve projectile contrast |

All palettes, tile/landmark/ambient keys and a high-contrast telegraph color are exposed by `env.definition.atmosphere`. They are **asset requirements/identifiers, not actual sprite files**. Integration should supply authored 3× transparent WebP sprites/tiles and cache the decoded/prepainted geometry; avoid per-frame regeneration of icons, glyph paths, gradients or procedural terrain. Layer ground → hazard telegraphs → ground props → actors/projectiles → high-priority enemy attack telegraphs → UI. Culling of off-screen decoration must never skip gameplay contact or enemy attacks.

## Integration verification requirements

1. Register `BIOMES_PACK` only in the integration-owned manifest and bind stage selection and scene events to `createBiomeSession.enter()`.
2. Replace the active stage's terrain collision, hazard/damage and minimap providers with the adapter; preserve legacy four scenes when the pack is not installed. Do not mix the new stage ID with a numeric legacy `currentScene` index.
3. Apply hazard warning and damage using deterministic simulation time, not the display clock. Ensure enemy telegraphs always draw above opaque scenery, with accessible contrast on mobile.
4. Verify spawn safety, reachable passage lanes, circle-radius boundaries, offscreen attacks, boss navigation, viewport/DPR changes, scene re-entry, pause/resume, long-frame handling, 130-mob density and 3000-cell traversal. Profile on real devices before claiming an FPS gain.
5. Required pre-integration checks: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`.

No shared engine, rendering, profile, world-generation or save-schema files are changed by this feature branch.


## ES2 remediation: opt-in runtime and Canvas adapters

The following files are owned by this branch and **do not replace the original four stages**:

- `runtime.ts`: deterministic movement with swept circular collision; obstacle LOS; bounded corridor waypoints; pause-safe hazard sampling, interaction and transitions
- `../../render/es2-biomes/index.ts`: cached 192-unit floor tiles and obstacle glyphs; world-space, exact-radius hazard telegraphs; interactions and a 152×110 minimap
- `runtime.test.ts` and `../../render/es2-biomes/renderer.test.ts`: collision/LOS/navigation, seed/cache, phase/damage, layer-geometry and scene/DPR invalidation contracts

**Integration example (integration-owned shared files only):**

```ts
import { createBiomeRuntime } from './game/content/biomes/runtime'
import { createBiomeRenderer } from './game/render/es2-biomes'

const biome = createBiomeRuntime('blood-moon-cathedral', { seed: 42, maxCells: 256 })
const painter = createBiomeRenderer((w, h) => {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
})

// Once per simulation tick, never once per rendered frame:
const next = biome.step(heroPosition, desiredVelocity, hitRadius, dt, isPaused)
heroPosition = next.position
// Pass next.hazardDamage to the existing damage/invulnerability handler.
// Do not directly subtract HP or mutate mobs in this module.
// For AI, biome.findPath(start, target, mobRadius) supplies navigable waypoints.
// Interaction button: biome.interact(heroPosition).
// A scene event: biome.enter('cursed-forest') and painter.reset().

// Renderer is called using the existing WORLD-space Canvas transform:
painter.setPixelRatio(Math.min(3, devicePixelRatio))
painter.drawGround(ctx, biome.environment, viewport, biome.time)
painter.drawProps(ctx, biome.environment, viewport)
// Draw heroes, enemies, projectiles, enemy attack telegraphs and HUD ABOVE these.
painter.drawMinimap(minimapCtx, biome.environment, heroPosition, biome.time)
```

The shared stage-selection UI, `step.ts`, `world.ts`, content manifest, rendering index and profile are intentionally **not changed here**. The integration owner must install the new `biomes:<id>` stage IDs, choose this adapter only for an ES2 biome, route collision/contact/minimap/LOS to it and keep the four numeric legacy scenes on their original providers. Without that wiring, this branch is an independently testable adapter, **not an in-game selectable stage**.

**Lifetime and performance:** procedural cells are seed+biome+cell deterministic, LRU-bounded (default 256). Renderer prepaints only static tiles/obstacles (up to one tile and two prop sprites per active biome), resets on biome change, context recreation (create a new renderer), or DPI change. Hazard phase/damage and used interactions are live, never cached. The minimap and ground danger indicators query the same hazard objects used by the simulation; suppressed hazards are visually muted. All frame queries are viewport-bounded, and pathfinding must run on changes of target/obstacle state rather than for every enemy every tick. Draw foreground hostile attack telegraphs above environmental scenery; no offscreen culling should disable gameplay simulation.

**Validation:** `pnpm install --frozen-lockfile && pnpm test && pnpm typecheck && pnpm build && pnpm check-release`. Run the complete integration suite again after installing the adapters, and check mobile DPR/safe-area, 130 actors, repeated scene entry and visual artifact captures on actual devices. A test runner is needed to establish green test/CI status; file presence alone cannot.
