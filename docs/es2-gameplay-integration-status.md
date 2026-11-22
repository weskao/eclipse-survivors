# Eclipse Survivors 2.0 — gameplay integration handoff (incomplete)

This is a **verified partial integration**, not a 2.0 release or authorization to merge into `main`.

## Foundation and ownership

- Immutable integration parent: `9fd59c85e355909a6973cf93c116b8de5f9ca0df`.
- Only `feature/es2-gameplay-integration` may modify shared gameplay adapters and `src/game/content/packs/index.ts`.
- No PR, main merge, release, deployment, engine rewrite, save format change, or force push.
- Preserve the original Vue 3 / TypeScript / Canvas 2D architecture, existing gameplay, mobile controls and legacy profile v2.
- Each future source must be re-checked against its **current** HEAD, ancestry and CI; the SHA table below is a snapshot, not a moving ref.

## Source audit (2026-11-22)

| Source branch suffix (`feature/es2-`) | Audited source SHA | Source HEAD CI at audit | Integration result |
| --- | --- | --- | --- |
| weapon-arsenal | `32eec87f5dad94b6fbe7c185cb73d5cf65d98273` | success (44991039802) | merged and registered |
| evolution-synergies | `35814c3fe3fa6086b6304df3cbb07f00cb2f2fe1` | no run found | blocked |
| relics-loot | `78f3c32cc9baa0587d13d45ab79c5babc9794074` | no run found | blocked |
| enemy-factions | `6c3343ae0298c30c9d7295cd0590edb3f8ae0f1b` | no run found | blocked |
| boss-encounters | `33fab4293d388f7be6c524eafedd7dfebb2222bd` | success (44990924521) | merged, registered, runtime wired |
| wave-director | `cabc00a9c4699f91745c922a9463c787c76da6cd` | no run found | blocked |
| biome-expansion | `78fd73c2b7b355d21ff67d7a8dec42b4e5c9191c` | no run found | blocked |
| world-events | `4b6915d30a7decdbaf997af47b3dc823a70b1889` | no run found | blocked |
| hero-specializations | `1a75ee441a4a767582c03daad1dee36d39e35e68` | no run found | blocked |
| run-objectives | `7e9273635e7c10792813372a7001d77bc4b811e0` | no run found | blocked |
| meta-progression | `acc2dc69ddae960a242c88fcbb8c181807b491ac` | queued (44991391777), not passed | blocked |

At audit time every listed source was ahead of and had the exact Foundation SHA as its merge base. A missing CI result is **not** a pass.

## Verified implementation

- `WEAPONS_PACK` is in the production content manifest. Twelve weapon abilities participate in actual acquisition, simulated combat, bounded effects and HUD progression.
- `BOSS_PACK` is in the production content manifest. Its event bridge is attached per engine, and the four authored bosses rotate on the real timed-boss spawn path, with controller updates after legacy enemy AI, telegraphs in the Canvas renderer, kill notifications and legacy fallback when the pack is absent.
- Original hero/skill definitions, profile version and `SAVE_KEY` remain unchanged.
- `src/game/content/packs/integration.test.ts` and `src/game/content/bosses/live-integration.test.ts` provide deterministic integration assertions.
- The integration-only GitHub Actions workflow runs frozen install, tests, typecheck, build and check-release.

## TDD and merge evidence

1. Weapon RED: 44990933332 failed as expected because production manifest had zero weapons.
2. Weapon GREEN: registered WEAPONS_PACK and fixed the incompatible source expectation.
3. Regression fix: original HUD test accepted only legacy skill maps, so the content ability map was added to its assertion; **44991102879 passed all five commands**.
4. Boss source merged with two-parent merge commit, no overlapping changed files (all seven new).
5. Boss RED: 44991260015 showed that the engine spawned a legacy 2480-HP boss instead of Abyss Monarch 2600 HP.
6. Boss GREEN: wired controller/spawn/step/renderer without rewriting the engine; **44991375980 passed all five commands**.
7. Updated weapon source HEAD with a conflict-resolved merge preserving the integration-specific test assertion. Verify the new integration HEAD separately.

## Remaining gates (required before any completion claim)

- Verify each missing source HEAD with source CI; do not treat a queued, absent, cancelled or failed run as successful.
- Review module interfaces, then merge verified sources individually, retaining both their features and existing behavior.
- Integrate twelve evolution recipes with realistic eligibility, actual weapon behavior, and selection.
- Integrate 24 normal + 8 cursed relics with loot, inventory, damage/cooldown modifiers and rewards.
- Integrate ten enemy archetypes into spawns, AI, hit/collision and crowd budgets.
- Integrate wave director with mode-specific pacing while retaining deterministic simulation and existing difficulty.
- Integrate four biome environments with actual collisions, hazards, scenes, camera and persistence rules.
- Integrate twelve world events with interactions, effects and rewards.
- Integrate three heroes into selection, correct stats, art and real gameplay.
- Integrate five new modes into UI, spawn policy, victory/defeat objectives and persistence.
- For meta-progression, design atomic v3 save migration, single reward writer and replay-safe receipts **before** replacing legacy v2; never grant double currency or silently discard saves.
- Run deterministic combat/AI/boss/evolution/save migration, crowded-battle regression, long Endless, and mobile-browser checks.
- Run the exact full command suite at the final integration HEAD and inspect GitHub Actions.
- Do not deploy, create a PR or merge main.

## Performance and compatibility review

Runtime changes avoid per-frame registry construction, keep boss AI controllers per engine, reuse existing spawns/combat and render warnings from the exact hit geometry. This is not a benchmark result. No FPS or mobile speedup claim may be made without device measurements. Keep cache ownership, limits and invalidation explicit when adding further content.
