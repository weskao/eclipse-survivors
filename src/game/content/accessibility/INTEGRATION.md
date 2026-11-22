# ES2 mobile/accessibility — isolated integration contract

Foundation: 9fd59c85e355909a6973cf93c116b8de5f9ca0df. This parallel branch deliberately changes **no** shared input, engine, renderer, profile, manifest, App.vue, SettingsOverlay.vue or TouchControls.vue files.

## Design / boundaries
- Default settings keep existing touch movement and UI behavior: left joystick, native keyboard handled by the engine, damage numbers visible, full VFX, no forced reductions.
- The new preference store uses its own localStorage key and validates all persisted values; it never touches profile v2. No new dependencies.
- Quality LOW / MEDIUM / HIGH / AUTO is a **visual policy**, never a simulation knob. AUTO uses supplied hardware hints, evaluated on changes, not each game frame. Changing quality must not affect damage, encounter pacing, enemy counts, hitboxes, rewards or victory.
- Existing input normalization is reused in joystick.ts; browser pointer capture/loss and blur/focus cancellation belong to MobileControls only. No requestAnimationFrame or timers run in the UI.

## Integration steps (ONLY by integration branch owner)
1. In App.vue, initialize a reactive/ref value with createAccessibilityPreferencesController().current. On setting changes call controller.update(changes) and **replace** the reactive/ref value. No new engine state is needed.
2. Replace the **single** existing TouchControls instance with components/es2/accessibility/MobileControls.vue, not both. Use :active="touchActive", :blocked="ui.settingsOpen || ui.mode !== 'play'", :preferences="accessibilityPreferences"; keep @stick="engine.setStick" and @dash="engine.dash". Do not alter src/game/input.ts or keyboard listeners. Existing TouchControls remains intact until integration.
3. Mount AccessibilitySettings.vue within the existing SettingsOverlay scrollable content, bind :model-value and @update:model-value. Integrator should choose which component owns the dialog focus trap (existing SettingsOverlay already traps Tab); never nest modal dialogs. Keep overlay above controls and pass blocked while visible.
4. Import presentation.css once in App.vue and call applyPresentation(document.documentElement, resolvePresentationPolicy(preferences, { prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, deviceMemory: optional navigator.deviceMemory, hardwareConcurrency: navigator.hardwareConcurrency, coarsePointer: ui.coarsePointer }), preferences) on changes. Run the returned cleanup before applying the next policy and on unmount. Handle media-query changes as well as preferences changes; avoid per-frame recomputation.
5. Renderer integration is **required** for non-CSS effects: consume VisualPresentationPolicy to cap render DPR and ambient-only effects, reduce flash/glow intensity, hide damage-number text when requested, and respect user VFX intensity. Do not suppress hit telegraphs or critical combat cues. Do not change the simulation tick, spawn counts or enemy/world behavior. Until this integration step, these controls are standalone UI + policy only, **not yet an active renderer setting**.
6. Regression-test portrait/landscape incl. display cutouts, 320px widths, touch start/move/end/cancel, pointer capture loss, pause/settings overlay, blur/visibility/resize/orientation, keyboard WASD/arrows/Space, storage denied, browser zoom, iOS Safari and Android Chrome.

## Review checklist
- No duplicate joystick mount or overlapping action controls.
- Visual updates occur immediately and persist only in eclipse-survivors.accessibility.v1.
- Integration-owned files remain untouched by this branch; old save format and gameplay remain unchanged.
- Tests: pnpm install --frozen-lockfile; pnpm test; pnpm typecheck; pnpm build; pnpm check-release.
