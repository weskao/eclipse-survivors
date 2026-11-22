# World Events — Live Adapter Integration

The 12 event definitions, deterministic director, real reward adapter and keyboard/touch
dialog live in this feature-owned directory and
src/components/es2/world-event-ui/. **They are not automatically mounted by
the legacy engine.** Do not edit engine, step, events, reward writers or shared
gameplay modules in this remediation branch.

## One adapter per run

~~~ts
import { createLiveWorldEvents } from './game/content/world-events/runtime'
import WorldEventPanel from './components/es2/world-event-ui/WorldEventPanel.vue'

const worldEvents = createLiveWorldEvents(state, hooks, {
  random: seededRng, // the engine's own seeded random source
  otherActors: () => factionRuntime.enemies.length, // shared 130-actor budget
})

// After the run state has been reset:
worldEvents.reset()
// During real simulation play ticks (NOT during rendering):
worldEvents.tick()
// Forward already-finalized ContentEvent callbacks:
worldEvents.onContentEvent(event)
// For a newly entered scene (before next play tick, if desired):
worldEvents.sceneChange()
~~~

The WorldEventPanel receives an event (a selected marker from
worldEvents.director.active) and options=worldEvents.options(event.id).
On its choose(eventId, choiceId) event, call
worldEvents.choose(eventId, choiceId) and refresh the props:
applied closes the dialog; retry shows feedback and refreshes choices;
out-of-range shows the distance warning. On close, clear the selected
marker. Reopen via an explicit interact key or tap on a displayed marker;
**never auto-claim** when the hero merely walks over one. The modal handles
number keys 1–9, Tab focus, Esc, pointer and touch (44+ px controls).

## Transaction and reward invariants

- Legacy GameState remains unchanged. The live adapter directly uses the
  existing addXp, acquireRelic, inventorySnapshot and GameState.mobs
  functions/data; it does not modify any shared reward writer.
- Symbolic loot tokens resolve deterministically to an eligible real relic of
  the specified rarity. If there is no room or no matching relic, the entire
  transaction is rejected without spending HP or XP; the choice remains
  retryable. This adapter refuses transactions with multiple simultaneous
  symbolic tokens until the relic subsystem exposes an atomic multi-item API.
- Non-relic effects are checked first, then committed synchronously: HP/XP
  costs, tagged in-world encounters, temporary damage/speed/protection buffs,
  healing and actual XP progression. HUD/SFX notifications follow the commit.
- Every summoned legacy mob has its origin event in a per-run WeakMap. Forward
  confirmed kill content events via onContentEvent, **after** mob.hp reaches
  zero and before the dead mob leaves state.mobs. Unrelated, late, scene-old,
  duplicate or still-living mobs never advance the objective.
- Encounter capacity includes state.mobs.length and otherActors(), capped at
  MAX_MOBS = 130. Spawn placement uses bounded terrain/path/occupancy checks.
- The replay ledger holds 256 recent transaction IDs with a retired serial
  watermark: old IDs are refused rather than rewarded again. Director markers
  expire after 24 playable seconds, at most two exist, and objective completion
  cannot be claimed twice. Pause freezes simulation ticking; the live engine's
  play clock must itself stop on pause (as GameState.time already does).
- reset() clears active director markers/objectives, event tags and temporary
  stat modifiers; scene changes clear pending progress, tags and temporary
  event buffs. The engine must call reset after resetRun on every new game.

## Still owned by the integration branch

The final integration owner must explicitly install WORLD_EVENTS_PACK in
content/packs/index.ts, mount the adapter into the engine tick and kill
callbacks, render marker cues, expose the UI selection and select feedback,
and coordinate it with the legacy automatic events.ts system. This branch
does **not** install those shared hooks or disable the legacy events.

## Verification required before merge

~~~sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
~~~

The existing .github/workflows/es2-world-events-ci.yml only triggers on
feature/es2-world-events pushes; this remediation branch requires a CI
workflow dispatch or a separately authorized branch-specific workflow change
before GitHub can provide full green verification evidence.
