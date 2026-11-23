# Premium Boss Encounters — isolated integration contract

This branch starts at foundation commit `9fd59c85e355909a6973cf93c116b8de5f9ca0df`.
It does **not** modify legacy spawn, enemy AI, save data, victory conditions,
`src/game/content/packs/index.ts`, or the game's existing HUD.

## Available content

- Abyss Monarch: three phases with shadow fans, persistent darkness, bounded summons, and a rotating arena-pressure wedge.
- Frost Sovereign: three phases with ice fans, freezing zones, defensive intermissions, and rotating safe wedges.
- Infernal Titan: three phases with slow telegraphed melee, molten eruptions, fire waves, and rage attacks.
- Eclipse Seraph: light, dark, and eclipse phases, projectile/circle/beam patterns, and a three-beat cinematic-finisher event sequence.

All four use `type: 'boss'` mobs for the unchanged `victoryConditionMet` and
`hasWonRun` rules. The namespaced content pack registers **metadata and effects**;
it does not install AI or replace any legacy boss simply by registration.

## Explicit adapter wiring (integration branch ONLY)

```ts
import { createBossEncounterController } from './content/bosses/controller'
import { createBossEncounterPack } from './content/packs/bosses'
import { drawBossTelegraphs } from './content/bosses/render'

const boss = createBossEncounterController({
  emit: event => handleBossEvent(event),
  cue: cueId => playBossCue(cueId),
})
const pack = createBossEncounterPack(boss)
// Pass pack to the existing createContentRegistry / createEngine contentPacks
// separately, in the integration-owned manifest or explicit engine construction.

// After the existing tickEnemies(), and before any victory decision:
boss.tick(state, dt, hooks)

// Choose ONE boss in the run flow, not alongside the legacy timed boss spawn:
const spawned = boss.spawn(state, 'abyss-monarch', { x: 300, y: 0 }, hooks)

// After existing game world rendering, using its world-to-screen offset:
drawBossTelegraphs(ctx, boss.snapshot(state), offsetX, offsetY)
// HUD: boss.hud(state) returns title, color, phase, percentage and exact HP.
```

**Integration ownership caveat:** Legacy `tickEnemies` has no plugin hook.
Always call `boss.tick` **after** it to lock the controlled Mob's legacy
brain to `recover`. Do not also call the old `spawnMob(state, 'boss')` for
this encounter. The existing `hit` emits `ContentEvent.kill` after boss
death, XP and victory flags, so the content registry's event bridge must
forward it to `boss.onContentEvent` via `createBossEncounterPack`. For
manual tests without a content registry, route `hooks.content` there.

`boss.snapshot` returns the exact warning/hazard geometry and the bounded
projectiles used for collision checks. The optional renderer uses the same
geometry. Warning positions and directions are frozen at attack selection,
so leaving them during the windup is viable counterplay. Projectile attacks
have line-of-fire warnings and perform swept collision. Arena attacks paint
only the dangerous area, leaving a safe wedge that rotates 90 degrees with
each subsequent arena pattern. Every pattern has a windup, cooldown or safe
region. Bosses stop their new attacks when the game is paused or the hero
dies; pause/resume should avoid handing catch-up elapsed wall time to tick.

Scene change cancels telegraphs, active hazards, encounter projectiles and
encounter-owned minions; it **never despawns the living required boss**.
Reset clears controller-owned run state. Standard combat already gives 45 XP
and sets `bossDefeated` once; the custom `reward` callback is a
notification, **not** a second XP grant.

For cinematic finishing, `finale` publishes three frames with relative
`at` timestamps and audio/VFX IDs. The integration-owned UI must schedule
their display on the result transition, because the unchanged victory gate
may finish the run immediately after the last hit. IDs such as
`bosses:seraph-fracture` are cues for asset mapping, not claimed audio
files; the existing `boss`/`bossDefeat` SFX still play through combat hooks.

## Deterministic checks

`controller.test.ts` exercises registration, three-phase thresholds, geometry
boundaries, dodgeable telegraphs, projectile caps, minion caps, death/reward
idempotence, boss-gated victory, scene/reset cleanup and replay identity.
The four boss pursuit profiles are independently configurable in `src/game/balance/bosses.json` via `movement` and `phaseMovementMultipliers`. Each boss now pursues the live hero through its post-attack recovery (the original windup hitboxes stay locked); close-range Abyss, Frost and Seraph orbit, while the heavier Titan advances to a melee standoff. Status slow/stagger effects also reduce chase speed. Pausing stops movement. `Mob.bossMoving` drives lightweight, reduced-motion-aware movement poses using the existing formal phase art; this is **not** a newly drawn multi-direction sprite atlas and does **not** approve any separate QA-PENDING native-3x candidate. No new gameplay textures, per-frame bitmap allocations or collision shapes are introduced.

No realtime random calls or unbounded per-tick caches are added. Minion
placement reuses the existing `summonBossMinions` helper; pursuit math runs
only while idle, projectiles use squared-distance swept collision.

Run in a checked-out branch with `pnpm install --frozen-lockfile`, then
`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`.
This branch does not create a PR, deployment or merge.
