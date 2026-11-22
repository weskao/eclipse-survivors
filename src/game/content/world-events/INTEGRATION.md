# World events integration boundary

The ES2 world-events feature is **independent and not yet mounted into the live game**.
The foundation `ContentPack.worldEvents` registry only validates metadata; it never
spawns events or provides UI. This branch exclusively owns `packs/events.ts` and
`content/world-events/`. In particular **do not edit** `packs/index.ts`,
`src/game/events.ts`, `src/game/step.ts`, `src/game/types.ts`,
`src/game/engine.ts`, shared UI, audio or loot modules.

## Integration owner checklist

1. Import `WORLD_EVENTS_PACK` into the integration-owned manifest.
2. Create **one director per engine/run**, with the engine's seeded RNG and one
   atomic, idempotent transaction callback. Call `reset()` when a new run starts.
3. In the simulation tick call `director.tick(createLegacyEventWorld(state))`.
   Play/pause is explicit. Invalidate events/objectives at biome changes.
4. Render `director.active` with the provided `visualCueId` for each definition;
   mobile/pointer/keyboard all use `director.choices(id, world)` and
   `director.choose(eventId, choiceId, world)`. Show costs, risk, reward and
   unavailability reasons before confirmation; the 64-unit range uses the hero
   location, not cursor location. Do not auto-activate when a hero crosses a marker.
5. The director supplies all collision/path callbacks from legacy `world.ts`.
   New biomes must supply identical semantics for obstacles and hazards; do not
   assume every biome is indexed 0–3.
6. For combat encounters, only spawn within `MAX_MOBS` and tag those mobs with
   their origin event ID. Report each confirmed, unique death with
   `director.reportKill(isElite, sourceEventId)`. Unrelated kills must never
   count toward an event objective. Clear tags on reset/scene change.
7. Implement `WorldEventTransaction` externally **as one atomic operation**,
   idempotent by `transaction.id`. Its `symbolic-loot` IDs are placeholders
   to map into the separately owned relic/loot branch; never create duplicate
   relic implementations here. `createLegacyEventCommit` handles XP/HP only and
   intentionally rejects unsupported external rewards until a complete handler
   is provided. A failed handler must return false with *no* side effects.
8. Connect existing `audioCue` names and `visualCueId` identifiers to
   appropriate art or sound, with bounded asset caches and accessible UI labels.
   The existing `ContentRegistry.addEffect` will reject unregistered IDs;
   do not push these cue IDs there without integration-defined renderers.

## Contract properties

12 distinct definitions, multiple explicit choices per event, cost preflight,
max 2 active markers, 24-second marker expiry, 64-unit inclusive interaction
radius, no auto-claims, 150-unit separation, 12 deterministic spawn attempts,
one pending objective, bounded timeouts, scene reset, combat-tagged objective
progress, retryable rejected atomic transactions, symbolic loot only.

Performance: only the bounded active set/objective is checked on play ticks;
terrain queries run at scheduled spawn attempts rather than per-frame.
There is no new `GameState` field or persistent save migration.

## Verify on the integration branch

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```
