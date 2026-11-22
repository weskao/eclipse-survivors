# Eclipse Survivors ES2 — audio pack

This feature branch intentionally modifies **only** `src/game/audio/es2/` and its tests.
It does not install another Web Audio engine, rewrite `src/game/audio/engine.ts`, or touch the integration-owned game engine.

## Original deliverables

- Eight original, deterministic synthesized compositions: menu, exploration,
  combat, high-intensity battle, elite, boss, victory and defeat.
- A bounded lookahead scheduler with 1.2-second musical crossfades, combat
  accents and one-shot ending themes. Resets its clock after mobile interruption.
- 19 distinctive semantic SFX cue recipes (including blade, bow, magic,
  explosion, critical, hit, defense, rewards, UI and boss calls). Each cue
  falls back to a real legacy `SfxCue` in the existing audio engine.
- An opt-in typed adapter delegating mute, separate volume, saved settings,
  AudioContext wake/suspension and legacy SFX to the existing `AudioSystem`.
  No new dependencies, external music or unauthorized copyrighted samples.

## Required integration by shared-file owner

1. Keep exactly one `createAudioSystem(...)` instance in `src/game/engine.ts`.
2. Export/inject a **ToneFn from that existing audio engine** into
   `createEs2AudioAdapter({ audio, now: () => audioContext.currentTime, tone })`.
   The tone callback must use the existing `musicBus`/`master` Web Audio
   buses and gain envelopes; do **not** create a second `AudioContext`.
   If `tone` is omitted, new cues use legacy SFX and `tick` uses legacy music.
3. Replace *only* the legacy music tick with `adapter.tick(mode)`. Do not
   call both music tick functions (that doubles scores). Call
   `adapter.setScene('exploration' | 'combat' | 'battle' | 'elite' | 'boss')`
   based on gameplay transitions, and `menu`, `victory` or `defeat`
   when those screens are entered.
4. Call `adapter.wakeFromGesture()` only in an existing trusted input handler.
   On visibility loss call `adapter.interrupt()`; on foreground return,
   wait until the *next user gesture* to call `adapter.resumeFromGesture()`.
   Do not automatically wake the audio context in a visibility callback.
5. Replace gameplay SFX callbacks selectively with `adapter.play(cue)`;
   keep existing SFX for unaffected systems. Do not schedule loops on RAF
   for each monster, and keep no separate audio event listeners or timers.
6. Keep current `starMusic`, `starSfx`, `eclipseMusicVolume` and
   `eclipseSfxVolume` keys. Existing `AudioControl.vue` already has
   separate music/SFX sliders and mute buttons. Do not duplicate controls.
7. Retire or silence the legacy `bgm.mp3` playback when using the
   standalone ES2 procedural score, unless its license is verified and
   deliberately layered. The extension does not claim the provenance of
   existing MP3 media. Existing `audio.onScreen` still manages the MP3.
8. When unmounting, `adapter.dispose()` first and call the original
   `audio.dispose()` once from its **existing owner**.

**Timing:** ES2 receives context time from integration. Its crossfade is
per-note amplitude interpolation across themes, not a new sound bus; already
scheduled notes cannot be unscheduled. For sample-level fades, integrate the
existing music gain bus rather than creating a parallel audio graph.

No generated binary audio is required: the scores and cues are authored
programmatically in TypeScript and played through the host synthesizer.

## Verification

Tests: `score.test.ts`, `adapter.test.ts`.
Run from the repository root:
```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

This branch provides **integration-ready audio**. It does not activate ES2 music
in the live game because that would require modifying shared engine files
owned by the integration branch.
