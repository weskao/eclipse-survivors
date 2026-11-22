# ES2 Combat VFX — Integration and capture guide

Authored VFX base: `feature/es2-combat-vfx`; live-adapter remediation: `feature/es2-remediate-live-vfx` (base `7d7517752466d0a835525d53cebb1b915c5f10bc`).

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

**Important integration boundary:** `ContentEvent` exposes hit/kill/damage/pickup/start/reset/scene-change/run-complete, but does **not** identify criticals, swing direction, phase transitions, spell release, opened chests, shields, or ultimate activations. Do **not** infer those from generic events. This branch now supplies a fully typed, per-run `createLiveCombatVfxAdapter` for all 18 confirmed cues, but **the shared gameplay emitter is integration-owned**. Only `enemy-death` and winning `victory-finish` auto-emit through the existing standard registry events. The remaining 16 must be called by the integration branch at the exact point their outcomes are confirmed.

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


## Live authoritative event bridge (remediation branch)

`src/game/render/es2/live-events.ts` exports `ConfirmedCombatVfxEvent`,
`LiveCombatVfxAdapter` and `createLiveCombatVfxAdapter`.
There is no additional particle queue or timer. The existing registry continues to
own drawing, four-second lifetimes, the 96-effect budget, Canvas balance and culling.

```ts
import { createLiveCombatVfxAdapter } from './render/es2/live-events'

// Construct once for each engine instance, after registering COMBAT_VFX_PACK.
const vfx = createLiveCombatVfxAdapter(effect => registry.addEffect(state, effect))
let sequence = 0

// Only after a real sword release, with world-space weapon origin and heading:
vfx.emit({
  sequence: ++sequence, kind: 'sword-slash',
  x: weaponOrigin.x, y: weaponOrigin.y, angle: releasedSwingAngle,
})

// On a new run: reset the simulation/registry, then:
vfx.reset()
sequence = 0
// On engine teardown:
vfx.dispose()
```

**Source-of-truth wiring table** (all coordinates in simulation/world units, never screen
pixels; directional headings in radians at the instant of the actual action):

| Kind | Required confirmed outcome / authoritative coordinate |
|---|---|
| `critical-hit` | Damage resolution marked critical; hit contact point |
| `sword-slash` | Melee release; weapon origin and locked swing angle |
| `projectile-trail` | Shot successfully spawned; muzzle point and launch angle |
| `spell-cast` | Successful spell cast; caster hand/world origin |
| `frost-impact` | Frost strike actually impacts; contact point |
| `lightning-chain` | Confirmed chain segment; strike node and segment heading |
| `fire-eruption` | Fire activation; real eruption origin |
| `poison-cloud` | Poison zone activated; actual zone center |
| `gravity-vortex` | Vortex activated; actual center |
| `boss-entrance` | Boss spawned; boss world origin |
| `boss-phase` | Phase number advanced; boss world origin |
| `shield-impact` | Damage actually blocked/absorbed; shield contact |
| `dash-afterimage` | Dash succeeds; starting position and travel heading |
| `evolution-awakening` | Evolution successfully acquired; hero origin |
| `chest-opening` | Chest transaction succeeds; chest position |
| `enemy-death` | Authoritative kill (already handled by pack `onEvent`) |
| `ultimate-attack` | Ultimate action successfully fired; actual attack origin |
| `victory-finish` | Winning run-complete (already handled by pack `onEvent`) |

A producer must assign **strictly increasing integer sequences across all FX cues per
run**, including simultaneous confirmations, and should create an event only after the
gameplay outcome is committed. Replays and out-of-order events are rejected in O(1)
space using the last accepted sequence. Invalid events do not consume sequence IDs;
valid events rejected because the registry is full **do** consume their ID to prevent
late duplicates. Do not reuse sequence IDs before calling `reset()`; call `dispose()`
on engine destruction to release the effect writer. A separate adapter belongs to
each run/engine. This is a visual-only bridge; no cue may alter hitboxes, damage,
status, cooldowns, or kill attribution.

**Avoid double emission:** continue letting `registry.emit(..., { type: 'kill', ... })`
and the winning `run-complete` event drive the corresponding two pack effects.
Never additionally submit those same occurrences through the new adapter.
The pack now deduplicates repeated kills by mob object identity and repeated victory
events per state, resetting those keys on `start` and `reset`. The two automatic
effects need no separate host hook. Other 16 cues are explicitly emitted via the bridge.

**Host integration outstanding (not claimed on this branch):**
1. Register the pack in integration-owned `src/game/content/packs/index.ts`.
2. Instantiate an adapter against that engine's registry; wire the 16 distinct
   authoritative outcomes listed above without modifying this module.
3. Pass the existing settings UI getters to `createCombatVfxPack` for quality,
   reduced-motion and reduced-flashing; never create another render loop.
4. Invoke reset/dispose on actual engine lifecycle transitions; verify the effect
   layering against the shared renderer and safe-area/browser matrix.

**Performance and invalidation:** immutable direction/spiral trigonometry is cached
at module initialization, independent of scene, DPR and viewport; no invalidation is
needed. Dynamic lifetime/fade and transforms are evaluated only for live visible
effects, with conservative world-to-camera culling before Canvas work. There is
no persistent particle pool or event-history allocation, and no independent
frame loop. The only event deduplication state is one sequence number per adapter
and one weakly keyed kill/victory tracker per active registry state.

**Verification scope:** `live-events.test.ts` exercises all 18 mappings,
confirmed-event sequencing, invalid inputs, direction snapshots, 96-instance
cap, cleanup, new runs and disposal, plus standard death/victory deduplication.
The existing `combat-vfx.test.ts` covers geometry, render order, culling,
context restoration, all 18 visual draws and accessibility quality tiers.
Full local/CI verification still needs to be executed on this new branch.
