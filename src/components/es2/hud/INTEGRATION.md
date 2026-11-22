# ES2 Combat HUD — isolated integration contract

Base: 9fd59c85e355909a6973cf93c116b8de5f9ca0df
Branch owner: feature/es2-combat-hud
Scope: src/components/es2/hud/, src/styles/es2/hud.css and HUD tests ONLY.
No App.vue, store.ts, engine.ts, content index, save/profile or shared CSS change.

## Delivered

- CombatHud.vue: dark Gothic, responsive, keyboard-focusable HUD.
- model.ts: pure projection from existing HudView with optional typed CombatHudFeed.
- fixtures.ts: fake *demo-only* data never imported into the production component.
- Tests: model projection, percentage safety, optional-data gating, selection/reset, cooldown and title, callback behavior, minmap lifetime and unmount.
- CSS: prefixed local selectors, common/rare/epic/legendary visual distinctions, touch-friendly buttons, and reduced-motion handling.

## Live data already present in Foundation

Inputs to use directly:
- engine.ui.hud.who / hpPct / hpLabel / xpPct / kill / timer / bossPct / quest / skills
- engine.ui.choice for the existing WebP hero portrait
- engine.ui.musicOn, musicVolume, sfxOn, sfxVolume if audio actions are enabled
- engine.togglePause / openSettings / toggleMusic / toggleSfx
- Canvas minimap: the component exposes minimap and always renders the canvas, even when inactive, because engine.mount captures it on first mount.

The component does not simulate statistics, invent phases or run a timer. Skill cooldowns come from HudView and are updated on the engine's existing HUD cadence. Selection opens contextual details; it does NOT activate a combat skill or mutate the GameState.

## Integration-owned edit (DO NOT make in this feature branch)

1. Replace the import of GameHud in src/App.vue with an import of
   src/components/es2/hud/CombatHud.vue.
2. Keep the existing hudRef template ref and engine.mount(canvas, hudRef.value?.minimap ?? null).
3. Provide the actual callbacks using a stable object (in App.vue setup):

   const combatActions = {
     pause: engine.togglePause,
     settings: engine.openSettings,
     toggleMusic: engine.toggleMusic,
     toggleSfx: engine.toggleSfx,
     setMusicVolume: engine.setMusicVolume,
     setSfxVolume: engine.setSfxVolume,
   }

4. Replace the old GameHud markup with:

   <CombatHud
     ref="hud"
     :active="ui.mode !== 'menu'"
     :choice="ui.choice"
     :hud="ui.hud"
     :music-on="ui.musicOn && ui.musicVolume > 0"
     :sfx-on="ui.sfxOn && ui.sfxVolume > 0"
     :music-volume="ui.musicVolume"
     :sfx-volume="ui.sfxVolume"
     :audio-active="ui.mode === 'play' && !ui.settingsOpen"
     :actions="combatActions"
     :feed="combatFeed"
   />

5. This component reuses the existing AudioControl popover so real mute toggles, volume sliders and outside-click/Escape cleanup survive the HUD swap. All four audio callbacks are required before that control is displayed.
6. Leave SettingsOverlay and the engine keyboard listener unchanged. Pause shortcut P is implemented by the existing engine; the visible pause button calls engine.togglePause.
7. If the existing GameHud toast is being retired, project actual engine.ui.toastText / toastVisible to notices in combatFeed, giving stable notice IDs only when the message changes. Do not generate IDs at every render.
8. Feed is generated at the existing HUD snapshot cadence, not from a per-frame polling timer. GameState is not a deeply reactive Vue object: rely on engine.ui.hud snapshot replacement as the reactive signal when deriving supplementary state. Never expose speculative values.

Example of an integration-only computed adapter (explicitly *not* included in this branch):

   const combatFeed = computed<CombatHudFeed>(() => {
     void ui.hud // 8 Hz reactive signal; game.state is not reactive
     const boss = engine.state.mobs.find(m => m.type === 'boss' && m.hp > 0)
     return {
       boss: boss ? {
         name: '首領', // replace only when an actual boss-name contract exists
         phase: boss.bossPhase,
       } : undefined,
       notices: ui.toastVisible && ui.toastText
         ? [{ id: ui.toastText, kind: 'message', text: ui.toastText }]
         : [],
     }
   })

The adapter must import CombatHudFeed from ./model. It must not synthesize wave numbers, combo counters, status durations, relic inventories, or treasure rewards.

## Source-of-truth owners for future optional fields

| Feed | Required real source |
| --- | --- |
| boss.name / phase / totalPhases | Boss encounter runtime metadata/actual Mob.bossPhase |
| wave.number / announcement | Wave director state + real encounter event |
| combo.count | Combat combo system's measured counter |
| relics | Run-owned equipped relic inventory |
| statuses | Active buff/debuff runtime entries and their remaining simulation time |
| objectives | Mode objectives / WorldEvent progress |
| notices.damage / critical | Actual applied hit/critical events, with stable event ID |
| notices.treasure | Actual confirmed treasure acquisition event |

If any source does not yet exist, OMIT that property. Empty arrays mean no current items, not an empty mocked inventory.
The integrator owns bounded notification expiration and IDs, sourced from simulation events, not CSS/JS timers in the HUD.

## Integration verification

Run in the integration branch:
- pnpm install --frozen-lockfile
- pnpm test
- pnpm typecheck
- pnpm build
- pnpm check-release

Also inspect at 1440x900, 768x1024 and 390x844, both mouse and touch.
Check skill tab/focus, settings/pause, live cooldown decrement, status expiration,
boss removal, no interaction while hidden, minimap drawing, and no covering
touch controls / gameplay targets. Accessibility: validate focus ring, descriptive
labels, screen-reader announcement frequency, and prefers-reduced-motion.
No claim of screenshot testing is made in this branch unless executed.

---

## ES2 live-feed remediation (feature/es2-remediate-hud-live-data)

**Owned implementation:** `model.ts`, `live-feed.ts`, `CombatHud.vue` and co-located tests.
The original HUD component remains installable; this branch does **not** wire `App.vue`, the engine, the shared store, or a second loop.

### Typed host contract

```ts
import type { CombatHudSnapshot } from './model'
import { buildLiveCombatHudFeed, type LiveHudSources } from './live-feed'

// These identity values must be owned by the integration host, not made up here.
const snapshot: CombatHudSnapshot = {
  runId: actualRunId, // new ID on each real run/reset
  sequence: actualHudRevision, // increment ONLY on engine HUD snapshot replacement
}
const sources: LiveHudSources = {
  snapshot,
  state: engine.state,
  bossName: actualBossDefinition?.title, // optional; no fake boss identity
  totalBossPhases: actualBossDefinition?.phases.length,
  wave: installedDirectorDecision
    ? {
        cycle: installedDirectorDecision.cycle,
        startsAt: installedDirectorDecision.startsAt,
        endsAt: installedDirectorDecision.endsAt,
        events: installedDirectorDecision.events,
      }
    : undefined,
  objective: actualObjectiveEvaluation, // after confirmed objectives only
  comboCount: realComboCounter, // omit if system not connected
  relicInventory: installedRelics ? inventorySnapshot(engine.state) : undefined,
  statuses: liveRuntimeEffects, // remaining simulation time; no wall-clock countdown
  notices: activeEventNoticeRing, // stable event IDs + host-side expiration
}
const feed = buildLiveCombatHudFeed(sources)
// Host passes BOTH :feed="feed" and :expected-feed="snapshot" to CombatHud.
```

`engine.ui.hud` is already refreshed by the engine around 8 Hz, but `engine.state` is not deeply reactive. Build both `snapshot` and `feed` at the SAME existing HUD update boundary; do not increment `sequence` in a Vue computed getter or create a new `setInterval`/`requestAnimationFrame`. A feed with a different `runId` or `sequence` is treated as absent. Without `expectedFeed`, legacy optional-feed behavior is retained for compatibility, but integration MUST use snapshot checking to prevent stale notices across runs. Hide the HUD when leaving gameplay. The component clears selected skill and keyboard focus when `active=false`.

### Reality/authority guarantees

- Health, XP, skill levels, cooldowns, elapsed timer and kills are still taken directly from the existing `HudView`; no copied second simulation.
- Boss data uses a **living** `GameState.mobs` boss and its real `bossPhase`; the title/phase count require actual boss metadata. The generic label `首領` is used when that metadata is not supplied.
- Wave number is derived only from the active director's zero-based `cycle`. Wave percentage uses `state.time` against the director's `startsAt/endsAt`; pause freezes naturally, invalid intervals omit progress. The `WaveDirector` module being present does NOT prove it is wired.
- Objective progress comes only from the authoritative `ObjectiveEvaluation`. The green completion state is `status === 'victory'`, not a fabricated count-based win.
- Relic icons, rarity and stacks are resolved against `RELIC_BY_ID` only for confirmed `inventorySnapshot` items. No relic inventory is inferred from options, discovery records or the catalogue alone.
- Statuses, combos and notices are passed through only when the host supplies active runtime evidence. The component cannot invent hit events, status time remaining, XP rewards or combo hits.
- The projection shows at most **10 relics, 12 statuses, 8 objectives, 4 deduplicated recent notices**. No timers or notification histories are kept by the component. The host expires notices and stable event IDs; the HUD merely renders the active ring.
- One polite, atomic screen-reader live region announces the newest event, or the current wave/boss phase when there is no event. Frequent cooldown and progress updates are exposed on demand without 8 Hz ARIA spam. Screen transitions hide the live region and blur focused HUD controls.
- Mobile HUD overrides are local to the Vue file, including safe-area insets, independent objective/status columns and reduced-motion wave bars. The shared stylesheet and legacy UI are unmodified.

### Remaining integration ownership

This feature-owned code **cannot** make the game use the new HUD or wire missing gameplay features without modifying forbidden files. A later integration branch must replace the existing `GameHud` mount, supply `actualRunId`/`actualHudRevision`, and forward live director decisions, evaluated objectives, combo hooks, active status effects and confirmed combat/treasure notices. In the exact base commit, these systems are not all connected as authoritative live UI sources; until they are, absent feed properties remain absent. Verify minimap ownership and keyboard/touch controls after the host swaps the HUD.

### Verification criteria

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

Test fresh, missing and stale feed (run + revision), pause/resume, boss exit, wave transitions, empty inventory, duplicate notices, screen changes, active focus, 390×844 touch layout, screen-reader announcements and reduced-motion presentation. Results must be recorded from actual commands/CI, not inferred from source review.
