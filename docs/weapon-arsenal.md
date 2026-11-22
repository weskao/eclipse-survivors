# Weapon Arsenal — feature/es2-weapon-arsenal

Base commit: `9fd59c85e355909a6973cf93c116b8de5f9ca0df`.

Import `WEAPONS_PACK` from `src/game/content/packs/weapons.ts`. The integration owner may add it to `CONTENT_PACKS` (the feature branch deliberately does **not** edit that file). All three heroes may acquire every weapon through the existing rarity-weighted upgrade flow. Each ability has five levels. Old upgrades, profile version and boss gating remain unchanged.

## Weapons, attacks, effects, and existing sound cues

| Weapon ID (prefix `weapons:`) | Attack and scaling | Trade-off | Audio cue / VFX |
| --- | --- | --- | --- |
| shadow-daggers | 1–6 homing knives; reselect fresh targets after hits; damage rises by level | Shorter 510-unit targeting, limited jump count | `ranger` / violet blades |
| holy-lance | 880-units/s long-range piercing lance (3–7 penetrations), increasing damage | Narrow direction; long 2.15s base cooldown | `bolt` / golden shaft |
| blood-scythe | Wide directional close-range arc, bounded lifesteal from actual damage | 140–185 radius, depends on missing HP | `knight` / crimson sweep |
| arcane-mines | Ground traps arm for 0.85s, then hit everyone within the blast radius | Stationary, delayed, possible misses | `meteor` / purple arming circle |
| bone-spears | Successive 0.16s-separated spears, each piercing several targets | Narrow lane and staggered delivery | `ranger` / bone darts |
| poison-cloud | 3.15s hazard with 0.45s interval DOT | Stationary, low individual tick damage | `vortex` / green fog rings |
| ricochet-blades | Fast disc redirects to previously unhit targets after each strike | Limited jumps; needs clustered enemies | `chain` / azure disc |
| spirit-wolves | 1–3 persistent summoned companions, pursue and bite with individual cooldowns | Short-range physical chase; capped summons | `knight` / spectral wolf silhouettes |
| solar-beam | Charge 0.55–0.71s, then deal high damage along a 690+ unit ray | Telegraph and long 3.6s recovery | `bolt` / golden beam |
| gravity-orbs | 1–3 rotating cores pull ordinary mobs and pulse on contact | Close radius; boss is immune to pull | `vortex` / violet orbit cores |
| spectral-bow | Powerful 640-units/s piercing ghost arrow | Low rate of fire, narrower than AoE | `ranger` / spectral shaft |
| thorn-chain | Links a nearby group and repeats damage along surviving links | Link breaks on death; limited cluster/range | `chain` / green thorn threads |

All damage is routed through `hit(state, mob, damage, hooks)`, preventing duplicate kill/XP rewards. If the player equips multiple weapons, each ability owns an independent timer and object behavior. No pack calls `Math.random`: only `ContentContext.random` is used for mine jitter. No dependencies added.

## Runtime, cleanup and frame budget

- All pack-private objects are keyed by `GameState.content` in a `WeakMap`. `resetRun` replaces that object; reset events explicitly delete any fresh run state. No global mutable active-run array remains reachable across resets.
- Hard bounds: 64 live weapon projectiles, 12 mine/cloud zones, 3 wolves and 6 chain links. Missile collisions use first-contact swept-circle segments and per-projectile visited sets. Dead enemies are skipped.
- Per-tick logic updates only the equipped weapon's objects; nearest-single-target searches are allocation-free, while small-K multi-target selection avoids full sorting. Comparisons use squared distance until a direction must be normalized. All visual effects share one bounded `weapons:arsenal-vfx` registry entry with a four-second TTL that the active pack refreshes. Offscreen objects are not drawn, but still simulate.
- Geometry is inexpensive native Canvas primitives; no per-frame canvas gradients, DOM objects, textures, libraries, full-crowd sorting or unbounded particles. Orbit angles and moving-entity positions cannot be cached safely without invalidation; no speculative entity pool added.
- The integration owner's empty index means **this branch does not activate weapons in production by itself**. A test or integrator can pass `createContentRegistry([WEAPONS_PACK], seeded(42))` or `createEngine({ contentPacks: [WEAPONS_PACK] })`.

## Foundation interface gaps / integration notes

The ContentPack v1 contract has `onTick` only on abilities; setting a positive `cooldownSeconds` prevents the ability from advancing in-flight projectiles, clouds and summons. Therefore these 12 abilities use `cooldownSeconds: 0` plus independent per-run attack timers. This is intentional; the **actual attack cadences** are in `WEAPON_SPECS` and the runtime timer map.

A future *coordinated* contract upgrade could add `ContentPack.onTick(context, dt)` and a namespaced `GameState.content.runtime` container, so moving objects can update once per simulation step without zero-cooldown ability callbacks. It could also expose per-pack audio-ID registration for bespoke cues (the current `SfxCue` union is shared-owned and only supports existing cues). Neither interface is required to run these weapon mechanics, so **this branch does not modify** `contracts.ts`, `types.ts`, `registry.ts`, `step.ts`, `combat.ts`, or `packs/index.ts`.

## Verification

Test source: `src/game/content/weapons/weapons.test.ts` covers registration, unlock levels and damage scaling, individual mechanics, homing, swept collisions, delayed explosions, DOT, healing, summoning, linking, crowd/boss workloads, simultaneous weapons, reset and seeded reproducibility.

Required checks:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

The feature-owned `.github/workflows/es2-weapon-arsenal.yml` triggers these five checks on pushes to `feature/es2-weapon-arsenal`. Inspect the latest run against the actual HEAD before reporting validation. No production/Pages release workflow or deployment is modified.
