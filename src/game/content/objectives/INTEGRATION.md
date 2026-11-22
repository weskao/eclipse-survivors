# ES2 Run Modes — integration contract and remaining hooks

This branch implements deterministic, independently testable rules and gameplay-evidence
adapters for **Boss Rush, Endless Eclipse, Relic Hunt, Cursed Expedition and Chaos Arena**.
It deliberately does not modify shared `RunModeId`, `src/meta/modes.ts`,
`src/game/engine.ts`, `src/game/step.ts`, `src/App.vue`, or profile persistence.
**The five modes cannot appear as playable options in the shipped game until the
integration owner connects the hooks below.** No simulated encounter is a completed quest.

## Public API

- `src/game/content/modes/definitions.ts`: `objectiveModeIds`, `getObjectiveMode`,
  immutable schedules, modifiers, reward and achievement metadata.
- `src/game/content/objectives/evaluator.ts`: `createObjectiveState`,
  `advanceObjective`, `evaluateObjective`, `getObjectiveDifficulty`.
  Standalone deterministic/serializable reducer. `withdrawn` is a distinct
  terminal outcome; `defeatReason: 'abandoned'` remains available.
- `src/game/content/objectives/runtime.ts`: `createObjectiveRuntime(mode, onComplete?)`
  with `snapshot()`, `plan()`, `difficulty()`, `evaluate()`, `tick(dt, playing)`,
  `spawnBoss(stage, mob)`, `spawnWave(index, mobs)`, `registerRelic(index, pickup)`,
  `registerEvent(index, event)`, `defeatMob(mob)`, `collectRelic(pickup)`,
  `damageRelic(amount)`, `resolveEvent(event, committed)`, `heroDefeated(hero)`,
  `withdraw()`, and `reset()`.
- `src/components/es2/modes/ModeChooser.vue`: controlled `value` prop
  (`ObjectiveModeId | null`), `disabled`, `select(mode)` event. All five modes have
  accessible, visible descriptions and reward previews.
- `src/components/es2/modes/ModeProgress.vue`: controlled `state` prop,
  accessible finite/Endless HUD progress, modifier, relic integrity and terminal outcomes.

The runtime owns only **one** active boss, wave, relic and major-event reference at a time.
Each wave tracks at most `MAX_MOBS=130` concrete actor references; relic receipt
history is at most four objects. There is no unbounded per-tick event log or global
mutable state. It does not spawn or reward entities itself.

## Integration work in the shared files (not owned by this branch)

1. **Mode selection and compatibility**
   - Coordinate extending `src/meta/types.ts:RunModeId` and `src/meta/modes.ts`.
     Both currently accept exactly `quick | standard | endless | challenge`.
   - Add the new `ModeChooser.vue` to the actual menu (`MenuScreen.vue` or
     `Es2MenuSystem.vue`) and forward the `select` event to a typed mode selection.
   - Keep all four legacy choices and their unchanged `hasWonRun` semantics.
     Never silently map a new ES2 mode to `quick` as a fallback.
2. **Per-run lifetime and active clock**
   - Construct a fresh `createObjectiveRuntime(chosenMode, onComplete)` on run
     start in `engine.ts` (or reset existing instance). Discard all old pending
     entity references on replay, scene teardown and restart.
   - Only call `runtime.tick(dt, s.mode === 'play')` for real simulation time,
     never the ambient UI clock. Freeze the runtime when `paused`, `level`,
     `result` or settings overlays are active. The existing
     `engine.advance` only runs `step` during `play`; update the bridge's
     playing flag when the screen changes, not only when the next frame advances.
   - Do not let the legacy `step.ts:hasWonRun` result handler end an ES2 run.
     Existing time-based win rules still apply to legacy modes only.
3. **Boss encounter proof — avoid phantom kills**
   - Read `runtime.plan().bossStage`. When non-null, schedule and **actually**
     spawn the relevant boss using `createBossEncounterController.spawn`.
     Only if a real `Mob` was returned, call `runtime.spawnBoss(stage, mob)`.
   - On finalized `ContentEvent { type: 'kill', mob, damage }`, after combat
     XP/death attribution and boss-controller reward handling, call
     `runtime.defeatMob(mob)`. It requires object identity and `hp <= 0`;
     ordinary mobs, unregistered bosses, duplicate callbacks and summoned
     minions are rejected. A boss ID or time gate alone is insufficient.
   - Sequence: Boss Rush 5 staged bosses; Relic Hunt one guardian only **after**
     four real relics; Cursed Expedition two wardens; Chaos Arena a final boss
     only **after** all eight waves. Respect boss controller's single-live-boss
     rule and shared `130 + 1 boss` budget.
4. **Wave, relic and world-event evidence**
   - Use `runtime.plan().waveIndex` to create each Chaos Arena encounter.
     Register the actual `Mob[]` from completed spawn transactions using
     `runtime.spawnWave(index, actors)`. Empty batches and batches above
     the 130-actor cap are rejected. Report each real final kill through
     `defeatMob(mob)`; only all tracked kills can clear the wave. The wave
     director's stage change, time or an empty world array is NOT proof.
   - At each `plan().relicIndex`, create a real unique collectible with
     collision and world visuals; after a successful **pickup consumption**
     call `collectRelic(theExactPickupObject)`. The existing
     `claimTreasure` is a different inventory flow; do not count an offered
     treasure or mere presence of a relic. Apply `damageRelic(amount)`
     only when a real active, collected artifact suffers damage.
   - At `plan().eventIndex`, spawn an actual Endless Eclipse major event.
     Register its unique object, finish its objective and commit its
     transaction atomically; only then call `resolveEvent(event, true)`.
     `resolveEvent(event, false)` grants no progress. Integrate with
     the world-event director's objective/deadline and transaction callbacks.
5. **Difficulty and terminal outcomes**
   - Read `runtime.difficulty()` when an encounter phase changes (not on
     each mob render). Apply `enemyHp`, `enemyDamage`, `spawnFrequency`
     to the actual spawn/combat system. Map `blood-price`, `nightfall`,
     `frenzy`, `swarm`, `armor`, `berserk` to real, visible effects;
     a text-only modifier is **not** implemented combat behavior.
   - Report `runtime.heroDefeated(s.hero)` only when actual HP reaches
     zero. The withdraw button calls `runtime.withdraw()`.
     On first terminal callback, `victory` -> `hooks.end(true)`,
     `defeat` / `withdrawn` -> `hooks.end(false)`.
     The callback fires once per run; terminal inputs are ignored.
   - Use `evaluate().rewards` only once after actual run completion, when
     the versioned profile award writer is updated to accept mode-specific
     achievement IDs and Embers. Do not grant these rewards separately in
     both the runtime and `recordRun`; the runtime only *proposes* rewards.
     Endless has **no time-based victory**, but bounded survival/event
     rewards on death/withdrawal.
6. **Presentation and final E2E**
   - Feed `runtime.snapshot()` to `ModeProgress.vue` at the HUD's normal
     refresh cadence (8 Hz in current engine). Do not bind an unbounded
     reactive history or create a new HUD component every animation frame.
   - Add actual selection -> game -> boss/wave/item/event -> result -> payout
     E2E tests on the integration branch, including mobile/pointer/keyboard,
     pause, restart, deadline boundary, rewards exactly once and legacy
     Quick/Standard/Endless/Challenge.

## Acceptance scenarios already covered in this branch's unit/component tests

- Five independent mode rules, ordered readiness and real actor identity,
  duplicate rejection, empty or oversize waves, death vs withdrawal,
  failed transaction, protected relic loss and boss prerequisites.
- Endless progress with no finite `progress` bar and no auto-victory.
- Cursed Expedition deadline has priority over late victory.
- Run reset, referentially pure deterministic replay and pause gating.
- Accessible mode selection and explicit progress display.

## Verification commands

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

The existing `.github/workflows/es2-run-objectives-ci.yml` only listens for
`feature/es2-run-objectives` pushes, **not**
`feature/es2-remediate-run-modes`. The integration maintainer needs to
run a manual `workflow_dispatch` against this branch (if available) or
include the work in an integration workflow with branch coverage; do not
misrepresent absent CI runs as passed.
