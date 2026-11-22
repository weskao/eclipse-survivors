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
