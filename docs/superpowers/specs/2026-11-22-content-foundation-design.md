# Eclipse Survivors Content Foundation — Design (2026-11-22)

## Intent
Prepare the existing Vue 3 + TypeScript + Vite + Canvas 2D game for parallel expansions without redesigning the existing combat engine. Its original fifteen upgrades, five evolutions, boss-gated victory, input, rendering, audio, and v2 profile remain authoritative.

## Selected approach and trade-offs
**Selected: static, strongly typed ContentPack definitions, registered exactly once per Engine.** Pack callbacks receive a per-run state and explicit hooks. The central integration-owned list imports optional packs; standalone tests inject packs directly.

Alternative A (rejected): global mutable event bus / runtime module discovery. It allows late loading but can mutate registrations mid-run, hides ordering, and costs complexity.
Alternative B (rejected): rewrite the combat engine around an entity-component system. It would require mass migration of all original rules and introduce high regression risk.
Alternative C (selected): conservative adapter to existing step, combat, events, progression, rendering and profile; no new framework and no hot-path registry reconstruction.

## Architecture and exact boundaries
- src/game/content/contracts.ts: ContentPack, ContentAbility, ContentRequirement, ContentEntry, ContentEffectDefinition, ContentContext.
- src/game/content/registry.ts: createContentRegistry(packs, rng), ID validation, immutable snapshots, ability eligibility/acquisition, bounded FX, deterministic event forwarding, tick and draw.
- src/game/content/packs/index.ts: the sole integration-owned static pack manifest (empty initially). Parallel branches MUST NOT edit it.
- src/game/types.ts and state.ts: GameState.content belongs to one run, with levels/cooldowns/effects. Reset discards all of it.
- src/game/progression.ts and store.ts: optional registered ability choices use the existing weighted rarity algorithm and HUD display.
- src/game/engine.ts: creates registry once; bridges lifecycle, offers, upgrades, save stats and renderer; exposes opt-in development showcase API.
- src/game/combat.ts, step.ts, events.ts, scene.ts: optional hooks forward real events while preserving legacy rules.
- src/game/render/index.ts: Canvas draws registered effects in insertion order, isolated by context save/restore.
- src/meta/profile.ts: existing version 2 SAVE_KEY and schema remain. Valid namespaced ability IDs are persisted and retained even without their packs.
- src/components/ContentShowcase.vue: development only via ?content-showcase=1. Production behavior does not enable this UI.

## Data flow
1. Engine construction reads CONTENT_PACKS or injected packs, sorts by pack id and validates all entries. Duplicate pack or entry IDs fail immediately.
2. start/reset creates new content runtime maps and effect array; legacy run reset remains intact. Hooks send reset, start, scene-change.
3. A level-up combines original eligible UP / EVOLUTIONS with the registry's eligible optional abilities, and uses existing rarity weights.
4. Selected optional content upgrades go to GameState.content.levels, not Hero.skills. Each registered cooldown is stored by content ID in the same run's cooldowns. Original skills still use their existing fields.
5. A simulation tick decrements owned cooldowns, calls onTick only for owned abilities, ages registered bounded effects, then continues the existing game simulation.
6. Real hit/kill/damage/pickup/scene/run-complete events call onEvent in stable pack-id order. Undefined optional hooks are safe.
7. RenderAssets references the already-created registry. Each live effect uses its registered Canvas 2D draw callback; a finite TTL and count limit guard effects.
8. Profile migration accepts strict namespaced optional ability IDs without changing version. Missing packs do not erase discoveries.

## Invariants
- Content IDs are lowercase namespace:slug; namespace must equal the pack id; duplicate IDs across every category are rejected.
- Packs and their entries are copied/frozen at registration time. No registration mutation during play.
- Required legacy mechanics and balance remain untouched; extra content cannot be selected unless a pack is integrated.
- Runtime levels, cooldowns and effects are recreated per run. No shared mutable per-run data.
- Content effects: maximum 96 active, finite lifetime strictly greater than 0 and no longer than 4 seconds; expired effects removed in ticks.
- Pack ordering is sorted by namespace; within each pack, explicit declaration order is preserved; effects draw in emission order.
- RNG enters via createContentRegistry(packs, rng), defaulting to the game's seedable random source; tests can inject seeded(42).
- Optional enemies/stages/world events are registered as metadata, not silently auto-spawned. Their behavioral integration belongs to feature branches and the final integration.
- Feature branches use the SAME immutable foundation SHA; they must not branch from each other's WIP branches or modify the integration-owned manifest.

## Non-goals and anti-goals
No gameplay redesign, ECS, dynamic plugin discovery, dependency injection container, runtime filesystem scanning, UI theme framework, save-format version bump, or speculative generic event hierarchy. No changes to legacy upgrade cooldowns or boss victory predicates.

## Risks and mitigation
Callback code can mutate GameState intentionally; teams must preserve damage and victory rules and make callbacks deterministic. Registration guards ownership and ID collisions, but cannot sandbox arbitrary feature code. Runtime callbacks must remain synchronous and low allocation. Unknown pack IDs stay in storage for forward compatibility; malformed or unnamespaced IDs are still rejected. Empty CONTENT_PACKS is the default compatibility mode.

## Validation and review
Unit tests explicitly exercise registration collisions, defensive snapshots, eligibility, cooldown reset, zero optional packs, bounded FX, deterministic ordering, save compatibility, original upgrades/evolutions, and boss-gated victory. CI on this feature branch runs install, tests, typecheck, build, release check. Independently review event ordering, false repeated-kill rewards, corrupt save parsing, pack import ownership, and disabled developer UI before adopting the SHA as the parallel branch baseline.
