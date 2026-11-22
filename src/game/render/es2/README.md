# ES2 Combat VFX — Integration and capture guide

Branch: `feature/es2-combat-vfx` (base: `9fd59c85e355909a6973cf93c116b8de5f9ca0df`).

## Preview every effect

After installing dependencies, run `pnpm dev` and open:

`http://localhost:5173/src/game/render/es2/demo.html`

The page is a **standalone effect showcase**, not an integration with normal game combat. Choose an effect, set a quality tier, toggle Reduced motion / Reduced flashing, and press **Replay**. **Pause** freezes the current animation phase for a capture; **Next effect** cycles the list. Use browser screenshot or screen recording, and capture early anticipation (roughly 10%), main impact (roughly 40%), and fade (roughly 85%). Verify no bright fullscreen wipes and no persistent obstruction. The stage visualizes an abstract impact anchor instead of pretending an actual enemy was hit.

| # | Effect / ID suffix | Legitimate gameplay trigger / capture |
|---|---|---|
| 1 | `critical-hit` | Confirmed critical damage, burst center on damaged target |
| 2 | `sword-slash` | Melee swing release, supply the *snapshot* of actual sword swing angle |
| 3 | `projectile-trail` | Projectile release/muzzle accent, supply actual launch angle; do not use as a projectile hitbox |
| 4 | `spell-cast` | Spell cast starts, caster's hand/cast origin |
| 5 | `frost-impact` | Confirmed frost collision, point of contact |
| 6 | `lightning-chain` | Confirmed lightning strike/chain node; direction equals strike segment |
| 7 | `fire-eruption` | Fire skill ignition, actual eruption origin |
| 8 | `poison-cloud` | Poison field activation; geometry is decorative, hitbox remains simulation-owned |
| 9 | `gravity-vortex` | Gravity skill activates, true vortex center |
| 10 | `boss-entrance` | Boss spawn becomes authoritative; anchor at boss location |
| 11 | `boss-phase` | Boss phase state actually advances |
| 12 | `shield-impact` | Confirmed blocked/absorbed damage, not every ordinary health hit |
| 13 | `dash-afterimage` | Successful dash, capture movement heading |
| 14 | `evolution-awakening` | Evolution acquired, hero origin |
| 15 | `chest-opening` | Real chest opens and loot resolves |
| 16 | `enemy-death` | Authoritative kill event (already auto-wired in pack) |
| 17 | `ultimate-attack` | Ultimate action fires successfully |
| 18 | `victory-finish` | Authoritative winning run-complete event (already auto-wired in pack) |

To capture all 18: select each entry in order using **Next effect**, replay, pause near its visible impact, and save `01-critical-hit.png` through `18-victory-finish.png`. For video, record approximately one complete effect duration per entry (duration is displayed below the canvas). Replay with Reduced motion and Reduced flashing enabled for accessibility regression captures.

## Integration contract (integration branch only)

**Do not edit `src/game/render/index.ts` or `src/game/content/packs/index.ts` in this feature branch.** The integration owner registers:

```ts
import { COMBAT_VFX_PACK, emitCombatVfx } from './content/packs/combat-vfx'
const registry = createContentRegistry([...CONTENT_PACKS, COMBAT_VFX_PACK])
// Call only after gameplay confirms a corresponding event:
emitCombatVfx(effect => registry.addEffect(state, effect),
  'sword-slash', origin.x, origin.y, { angle: swingAngleAtEmission })
```

`createCombatVfxPack({ quality, reducedMotion, reducedFlashing })` accepts static settings or getters, so the existing settings UI can update them live without modifying this branch's renderer. The default pack honors `prefers-reduced-motion`; the integrator should bind the actual user-controlled reduced flashing and quality preferences. The helper validates finite world coordinates and optional angles. The existing Foundation registry owns all lifetimes (at most 4 seconds) and the hard limit of 96 active effects, and clones optional angle metadata without modifying its shared type declarations.

**Important current limitation:** `ContentEvent` exposes hit/kill/damage/pickup/start/reset/scene-change/run-complete, but does **not** identify criticals, swing direction, phase transitions, spell release, opened chests, shields, or ultimate activations. Do **not** infer those from generic events. Their authoritative gameplay hooks must be added by the integration owner. Only `enemy-death` and winning `victory-finish` auto-emit today; the remaining 16 are explicitly callable and showcased but not yet automatically triggered in a normal run.

**Depth ordering:** The Foundation renderer currently draws `content.render()` **after** hero, mobs, and legacy effects. All integrated combat effects therefore render as foreground overlays (in emission order). This feature draws ground rings before its own upward debris for local depth cues and avoids large opaque cover, but genuine behind-character layering (boss ground telegraphs, fog behind actors) requires the integration owner to add a dedicated background pass at the correct point in the shared renderer. Never claim that the late-pass overlay is already y-sorted with actors.

## Performance / correctness guardrails

- Rendering is simulation-independent; no damage, collision, timers, or target selection changes.
- `DIRS` and `SPIRAL_POINTS` are immutable precomputed unit geometry. They depend on no viewport, DPR, texture, context, palette, or scene input, so **no invalidation is required**. Live effects are placed using current world-to-screen offsets.
- Animated interpolations, Canvas paths, phase-dependent transforms, and opacity **must** run each frame for visible active effects. Effects are culled conservatively before any Canvas state save, geometry or stroke call. Particle-like shards share a single bounded Canvas path instead of allocating entity objects.
- No per-frame gradients, full-screen flash layers, bitmap duplication, extra packages, or persistent particle pools. Each effect is capped at 12 geometry samples (except small spiral combinations) and the registry caps count at 96.
- No camera movement or screen shake is introduced. Motion quality is independent of simulation.
- Under reduced motion, most expansion/rotation freezes to a fixed pose and sample count drops; reduced flashing caps effect alpha at 0.55. Neither accessibility mode changes gameplay, hitboxes, or lifetime.
- The original rendering path is unchanged until an integration branch registers this pack; old saves and existing gameplay work the same with an empty `CONTENT_PACKS`.

## Tests / verification

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

`src/game/render/es2/combat-vfx.test.ts` checks registration, directions, emission ordering, culling, lifecycle, caps, user settings, and event honesty. The integration branch must run the full test suite and review screenshots under high mob count, different DPR, window resize, context loss/recreation, pause/resume, all three hero animations and mobile Safari/Chrome. Existing `createContentRegistry` owns save/restore on every effect draw; `drawCombatEffect` also pairs its own save/restore with `finally`, so an exception cannot strand its transform on the Canvas.
