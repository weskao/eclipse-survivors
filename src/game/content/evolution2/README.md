# Evolution2 — independent evolution synergy pack

Branch: `feature/es2-evolution-synergies`, based on the immutable foundation commit
`9fd59c85e355909a6973cf93c116b8de5f9ca0df`.

## Design and integration plan

This pack is **additive**. It registers 12 legendary, max-level-one evolutions through the
existing `ContentPack` contract. No original weapon, legacy evolution, player profile,
shared type, registry, engine, progression, or manifest is modified. Each ability's
`requires` entries point to a separately owned `weapons:...` ability and one built-in
passive. The prerequisite weapon and passive remain owned after evolving.

The integration owner must register the weapon pack and `EVOLUTION2_PACK` via the
integration-owned `src/game/content/packs/index.ts`. There is no side-effect import.
Use `createContentRegistry([EVOLUTION2_PACK])` to test this pack independently.
The existing five evolutions in `src/game/evolutions.ts` remain unchanged.

### Exact unlock requirements

| Evolution | Registered weapon level | Built-in passive level | Cooldown |
| --- | --- | --- | --- |
| Nightfall Torrent | `weapons:shadow-daggers` Lv.3 | `haste` Lv.3 | 2.2s |
| Dawn Judgment | `weapons:holy-lance` Lv.3 | `shield` Lv.3 | 4s |
| Crimson Reaper | `weapons:blood-scythe` Lv.3 | `heal` Lv.3 | 4.8s |
| Singularity Minefield | `weapons:arcane-mines` Lv.3 | `vortex` Lv.3 | 5.8s |
| Toxic Permafrost | `weapons:poison-cloud` Lv.3 | `frost` Lv.3 | 3.3s |
| Infinite Rebound | `weapons:ricochet-blades` Lv.3 | `multi` Lv.3 | 2.6s |
| Wild Hunt | `weapons:spirit-wolves` Lv.3 | `speed` Lv.3 | 3.7s |
| Solar Tempest | `weapons:solar-beam` Lv.3 | `chain` Lv.3 | 4.4s |
| Celestial Collapse | `weapons:gravity-orbs` Lv.3 | `meteor` Lv.3 | 7s |
| Spectral Volley | `weapons:spectral-bow` Lv.3 | `chain` Lv.3 | 3.3s |
| Bonefire Barrage | `weapons:bone-spears` Lv.3 | `blaze` Lv.3 | 5.4s |
| Verdant Snare | `weapons:thorn-chain` Lv.3 | `magnet` Lv.3 | 5s |

`chain` is the Foundation's canonical Lightning/Chain skill; do not invent
`lightning` as an UpgradeId. All built-in passives are within the caps in
`src/game/constants.ts`. The weapon agent must confirm that each weapon
supports level **at least 3**; if a weapon's cap is lower, do not silently alter
the level gate in this parallel branch: coordinate an integration change.

## Gameplay contract

All twelve evolutions add real attacks or defensive effects, not presentation-only
modifiers. Every owned evolution has an independent cooldown. Skills are never
consumed or replaced. Nightfall chains damage; Dawn pierces a corridor and grants
brief invulnerability; Crimson drains health from **actual** damage; Mines pull
in three localized explosions; Permafrost slows and damages; Rebound chains
neighboring victims; Hunt hits and repels distant enemies; Tempest chains strikes
with brief slows; Collapse combines meteor impacts with gravity; Volley launches
five real native arrow projectiles; Bonefire produces three AoE detonations; Snare
slows and staggers nearby foes.

All target selection uses a deterministic distance-and-index tie break and happens
**only when the cooldown fires**. Each cast can apply at most 12 unique damage
hits; the target candidate list is limited to 24; Volley limits the total native
projectile array to 80. Audio reuses the game's valid SFX cues; the
`EVOLUTION2_CUES` map binds an effect and sound to every evolution. Visuals use
the existing four-second/96-instance bounded content-effect system and precomputed
spoke directions; their lifetime is 0.75s. No new dependencies or unbounded
per-run caches.

## Foundation interface gap / integration note

`ContentAbility.requires` validates levels from `GameState.content.levels`;
the Foundation registry does **not** expose registration-presence validation for
foreign prerequisites. Without the optional weapon pack, normal fresh runs have
no matching weapon levels and safely expose no Evolution2 unlocks. However a
manually forged or hydrated runtime level for an unregistered foreign weapon
could satisfy `requires` even if its pack is absent. Requiring that the ID is
registered as a weapon needs a coordinated change to `ContentRegistry`, not an
unauthorized edit here. Persisted *discovery IDs* in Profile v2 do not automatically
grant run levels. Integration should verify the complete weapon ID/cap matrix,
and may choose to add a Foundation-level registered-prerequisite check in a
separate reviewed contract revision.

The ContentEffect contract carries only position, life and max. Effects therefore
represent individual colored glyph pulses instead of continuous projectile trails,
and no new render fields or SFX names are introduced.

## RED → GREEN → REFACTOR / validation

1. RED: `evolution2.test.ts` was committed before its corresponding pack and
   implementation files; it specifies all twelve, prerequisites, invalid
   selections, cooldowns, combat effects, original evolution coexistence,
   multiple combinations, reset behavior, and bounded crowd effects.
2. GREEN: `recipes.ts`, `cues.ts`, `combat.ts`, and `packs/evolution2.ts`
   supply the contract and mechanics independently of other packs.
3. REFACTOR: remove dead calculation and correct strict TypeScript test types.

Required verification at an environment with a checked-out repository and network:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

Do not mark these commands as passed without their actual outputs. The existing
Foundation verification GitHub Actions workflow only runs on its own named branch,
not automatically on this feature branch. Do not modify CI workflows or shared
files in order to circumvent branch ownership.
