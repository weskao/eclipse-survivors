# ES3 combat, power, encounter and reward implementation evidence

Scope: Waves 0, 1, 2, 4 and 7. Target branch `feature/es3-combat-juice-power-pacing-rewards`. Date 2026-11-26 Taiwan time. This is an evidence record, not a blanket acceptance claim.

## Measured comparison

Two actual GitHub Actions diagnostic runs with the same 130 actors, 96 player shots, 64 hostile shots and 96 initial particles, 120 measured ticks and 120 recorded frames per viewport. [Earlier diagnostic](https://github.com/weskao/eclipse-survivors/actions/runs/45693471092), [later diagnostic at f9ca7928](https://github.com/weskao/eclipse-survivors/actions/runs/45696301552). These are single-run samples from different hosted runners, not controlled performance guarantees. Recorded Canvas calls are NOT GPU draw calls or browser FPS.

| Metric | Earlier | Later |
|---|---:|---:|
| Simulation median ms/tick | .2232 | .1878 |
| Simulation p95 | .3451 | .3488 |
| Simulation p99 | .4941 | .4688 |
| Mobile low recorded Canvas median ms | .2245 | .1760 |
| Mobile low recorded Canvas p95 | .4089 | .3650 |
| Mobile low recorded Canvas p99 | .5140 | .5370 |
| Desktop high recorded Canvas median ms | .3303 | .2618 |
| Desktop high recorded Canvas p95 | .5655 | .4793 |
| Desktop high recorded Canvas p99 | .7131 | .7237 |
| Mobile/desktop paint commands per frame | 829/1055 | 829/1055 |
| Observed heap delta bytes | 977280 | 744816 |
| 10-minute simulated Endless p95 ms/tick | .1252 | .0631 |
| 10-minute simulated Endless p99 ms/tick | .1479 | .1196 |
| 10-minute observed heap change bytes | 25147240 | -2088472 |
| Actor checkpoints | all 130 | all 130 |

Heap endpoints depend on GC; they do not prove allocation volume or a memory leak is absent. GPU draw calls, physical device temperature, measured mobile battery use and production FPS are not established by these tests.

## Deterministic 30-second opening fixture

Knight, seed 20261126, standing still with invulnerability, no interactive upgrade selection. These are workload probes, not human playtime guarantees.

| Mode | XP earlier → later | Kills earlier → later | DPS earlier → later | Live enemies earlier → later | First upgrade (s), later |
|---|---:|---:|---:|---:|---:|
| Quick | 172 → 199 | 59 → 69 | 65.26 → 73.83 | 32 → 36 | 2.43 |
| Standard | 140 → 143 | 46 → 47 | 52.10 → 54.84 | 29 → 36 | 2.43 |
| Endless | 192 → 219 | 66 → 72 | 78.22 → 81.35 | 31 → 39 | 2.43 |
| Challenge | 239 → 257 | 75 → 81 | 110.31 → 123.93 | 40 → 52 | 4.68 |

The later diagnostic passed all five tests, including deterministic opening, low/medium/high simulation parity and ten simulated minutes of Endless. The real Chromium matrix passed six profiles before finding hero-card clipping on 1024×768 tablet landscape. A targeted CSS fix is in 99b12c5f; the new browser result must be checked.

## Integration evidence and limitations

- Full integrated run [45696301536](https://github.com/weskao/eclipse-survivors/actions/runs/45696301536) at f9ca7928: 1,942 passed, 1 skipped, 1 failed. Failure is the unchanged owner-acknowledged manual art gate for Shadowblade, Spirit Summoner and Crimson Paladin; it remains red, not approved.
- Earlier test-first batches sometimes had CI cancelled by later implementation commits under the owner's implementation-first instruction. Do not describe unobserved RED steps as observed. The explicit historical RED/GREEN pairs remain in TODO.md.
- Later implementation adds typed damage/healing feedback, direction/material-dependent enemy death timing, preserves authored boss identity after death, result telemetry presentation, direct-particle caps and compact landscape layout. Final integrated verification is separate.
- All five chest tiers use existing production artwork; Epic shares the Rare source with distinct styling. Celestial Lens was promoted from Epic to Legendary without stat changes to permit a non-cursed Legendary offer. Existing hero and enemy source sheets are not newly authored. Bespoke enemy hit/death/dissolve sheets are not produced in this delivery.
- Scope does not include Waves 3, 5 or 6. Manual-only visual/audio/device acceptance, screenshots, MP4 and physical thermals explicitly waived by owner. The existing asset acceptance gate is unchanged.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm test
ES2_PERF_LONG=1 pnpm exec vitest run tests/es2/performance/benchmark.test.ts
pnpm typecheck
pnpm build
pnpm check-release
```

Use the ES3 automated gameplay and performance acceptance workflow for Chromium responsive/layout and live-browser diagnostics. Never equate simulation/recording Canvas timing with real GPU performance.

## Follow-up evidence at ba34d948

- [Full regression 45702064115](https://github.com/weskao/eclipse-survivors/actions/runs/45702064115): 1,965 passed, 1 skipped, 1 failed (unchanged human art gate). Typecheck, production build and release check passed. Opening terrain regression: RED 45701540066, GREEN 45702064115. Faction living-pressure, camera direction and typed contact regressions: RED 45701923875, GREEN 45702064115. Audio signature table also passed; its CI RED was not observed.
- [Diagnostics 45702064486](https://github.com/weskao/eclipse-survivors/actions/runs/45702064486): all five simulation/recorded Canvas diagnostics passed. Chromium passed 11/12 profiles; remaining 640×360 (200%-zoom equivalent) hover dossier intercepted the hero card. Normal desktops and tablet landscape passed. Fix 01883573 adds adaptive side sizing before vertical fallback; browser acceptance remains pending.
- Latest hosted-run simulation median/p95/p99: .202269/.378615/.511911 ms; mobile/desktop recorded Canvas median .213744/.334501 ms; paint operations 829/1055 per frame. Ten-minute simulated Endless p95/p99 .138258/.153493 ms; all ten actor checkpoints 130; observed heap endpoint change −2,644,584 bytes. This runner was slower than the earlier later sample; no performance improvement claim or real-device/GPU inference.
- Opening fixture after terrain placement correction (XP/kills/DPS/first upgrade seconds): Quick 209/71/80.69/1.92; Standard 138/45/54.10/2.43; Endless 205/71/79.02/2.43; Challenge 259/83/123.20/4.68.
- Additional test-first commit b7bdd9f2 and implementation 786d1405 add objective-specific ordinary encounter cycles and rarity-specific claim audio; exact-HEAD results pending. No new artwork or human approval is claimed.
