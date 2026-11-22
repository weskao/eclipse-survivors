# ES2 A01–A16 release readiness audit — 2026-11-22

**Decision: BLOCKED. Do not fast-forward `develop`, edit `main`, create a PR or deploy.**

- Repository: https://github.com/weskao/eclipse-survivors
- Exact integration parent: `7d7517752466d0a835525d53cebb1b915c5f10bc`
- Integration branch: `feature/es2-release-readiness-integration` (created at the exact parent)
- `develop` observed at `e1dd8c29ef8a07c6987b211785fe9cb9da0b10c3` at first audit; recheck just before any permitted fast-forward.
- Source evidence: GitHub branch HEADs, base...HEAD file comparisons, per-HEAD check-runs and Actions workflow runs, and the source handoff files. At audit, **all sixteen source HEADs had zero matching check-runs and zero matching Actions workflow runs**. Missing CI evidence is NOT PASS.
- Local full-pnpm verification was unavailable in this session. The non-deploying integration workflow is `es2-release-readiness-integration.yml`. Its run status must be verified at the **current integration HEAD**.
- `tests/es2/integration/release-readiness.test.ts` contains initial genuine engine-session acceptance tests for all 3 new hero IDs and 5 new mode IDs. These tests were committed before shared-runtime changes. Their expected RED must be observed in CI before proceeding to GREEN; do not assert that they ran until a run reports the outcome.

## Sixteen source HEADs and blockers

| Workstream | Source branch suffix after `feature/es2-` | Audited HEAD | Main integration/release blocker |
| --- | --- | --- | --- |
| Adaptive audio | `remediate-adaptive-audio` | `f40711fd4b970ff33fa10be03cce2837a1863171` | Adapter awaits shared AudioContext tone/buses, scene transitions, single BGM ownership |
| Four biomes | `remediate-biome-playability` | `1f1e41cbc11eae2e7a469eb7fbe10750da55ec5a` | Not selectable/playable via live engine; collision, damage, renderer, minimap still host-owned |
| Ten enemy factions | `remediate-enemy-factions` | `963840b38064f6930f8756103a045acceec1064f` | Live spawn, targeting, first-contact damage/XP, shared actor budget not wired |
| Twelve evolutions | `remediate-evolution-synergies` | `0d5b3796a9ae4b53b3860c85cc0a8d9e0454a517` | Actual choice UI, shared combat and eligibility verification still required |
| Three heroes | `remediate-hero-roster` | `6afdaecce265af7048fb970b6d805f601eb9a4b2` | Real new hero identity not supported by current engine/menu; active ability, damage and art hooks missing |
| Live HUD | `remediate-hud-live-data` | `4a9ef24c419463aa9640683ad1a79bbb664a08fa` | Component not mounted; run-accurate snapshots, objective/relic/status notifications not supplied |
| Combat VFX | `remediate-live-vfx` | `df49c0b418f5bd5b00cc9395748d0448b656ef65` | Sixteen confirmed event emitters and renderer layer ordering not host-wired |
| Profile v3/meta | `remediate-meta-progression` | `0456b8ae88728774321c6eb5287bfeeb2a786077` | No authoritative v3 cutover/one writer/atomic real-run receipts; risk of duplicate rewards |
| Relic combat | `remediate-relic-combat` | `e02f83526173d00e6c6ab3c80d3ec76463d0d94e` | Outgoing/incoming damage, chest confirmation, reflection, single-event attribution unconnected |
| Five modes | `remediate-run-modes` | `7e6a68261b2cd311de53e7c9047dbf31f7780a89` | Shared RunModeId, mode chooser, real objective receipts and terminal victory/rewards unconnected |
| Wave director | `remediate-wave-director` | `6acf914e30bede21c771c40f79bdfdffd1427655` | Planner cannot spawn real mobs or report finalized wave-clear/boss-kill evidence alone |
| Twelve world events | `remediate-world-events` | `10c161ec17fd43a6dc4b1a13b24ca4c505b43f8d` | Requires real engine interactions, atomic reward writer and authoritative encounter/kill callbacks |
| Weapon/evolution artwork | `production-weapon-evolution-art` | `a5f1eb3f5eff7c0773e2c8c19050dd03289e590c` | Base...HEAD changed **no** `src/assets/es2/production/weapons/**` or `evolutions/**` assets; 24 required final images not evidenced |
| World/hero artwork | `production-world-hero-art` | `fe2bcc170174fadc8137b15a0e8052597f0ca064` | Manifest is explicitly `incomplete`; 3 hero action sheets pending approval; enemy, boss, biome and UI artwork entries explicitly `not-delivered` |
| Mobile/accessibility QA | `mobile-browser-a11y-qa` | `00c9166ef458acce5ae919526181f47468fee69e` | QA handoff explicitly reports no full pnpm runs, no screenshots and no physical iOS/Android tests |
| Performance profiling | `performance-profiling` | `c5c78b3ea12ff9eb2e16dec4b1af400336d755d9` | Helper-only timing is NOT game FPS; missing full suite, real browser/device traces, memory and thermals |

All 16 rows are **CI-unverified** at the stated HEAD independently of the functional blocker. Review their `INTEGRATION.md`, `README.md`, `ADAPTER.md`, asset manifests and QA reports before wiring.

## Source merge safety

A base-to-source comparison for multiple remediation branches includes shared/unowned files (examples: `src/style.css`, root screenshots, `scripts/capture-biomes.py`, and `.github/workflows/meta-progression-verify.yml`) in addition to each task's owned files. Do not blindly tree-merge all commits. Re-check current source HEADs, isolate each owned path, resolve conflicts deliberately, and preserve the existing original gameplay.

At the exact base, the content manifest already registers several ES2 metadata packs, but registration alone does not supply live behavior. The shipped `src/meta/types.ts` only defines `quick | standard | endless | challenge`; `src/game/engine.ts` selects built-in `JobId` and does not yet install a per-run new-hero specialization or objective runtime. The separate adapters require explicit wiring and deterministic real-event receipts.

## Mandatory integration order after source evidence is available

1. Capture every source HEAD and matching CI/job logs; reject missing/failed/cancelled results; obtain final approved WebP inventory and actual browser/mobile/performance evidence.
2. Import verified branch-owned modules only into this integration branch; confirm source conflict resolution and **observe RED** on behavior tests for hero/mode selection, 10 enemies, 4 biomes, 12 events, relic/evolution damage, wave/boss progress, v3 reward safety, HUD, audio and 18 VFX cues.
3. Implement the smallest shared-host bridges under TDD; wire real input/spawn/collision/damage/reward/render/audio/HUD lifecycle. Keep one reward writer, one AudioContext, shared 130-actor cap, determinism, 96 FX cap, bounded caches, and legacy v2 compatibility/rollback.
4. Validate with `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, browser behavior, mobile accessibility, production-asset inspection and measured performance.
5. Recheck final integration HEAD, latest `develop` HEAD and ancestry. Only if every requirement has actual PASS evidence, perform an expected-SHA-guarded, **non-force fast-forward** of `develop` to the integration HEAD and verify its exact final SHA and CI. Do not touch `main` or deploy.

**Status: this branch is an audited, intentionally RED starting point; not production-integrated or release-ready.**
