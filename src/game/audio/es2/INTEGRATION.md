# ES2 adaptive audio — typed integration contract

This is an **opt-in adapter**, not a second audio engine. Everything in this
branch lives under `src/game/audio/es2/`. The shared game engine and
`src/game/audio/engine.ts` remain unchanged. ES2 themes and SFX are original
procedural compositions; there are no extra assets, browser timers or packages.

## Delivered surfaces

- `ES2_SCENES` / `Es2Scene`: `menu`, `exploration`, `combat`, `battle`,
  `elite`, `boss`, `victory`, `defeat`.
- `ES2_CUES` / `Es2Cue`: 19 typed semantic gameplay events, all mapped to
  existing valid `SfxCue` identifiers in `CUE_MAP`.
- `createEs2Score()`: 1.2-second per-note crossfade, bounded lookahead of
  120 ms and at most three beats per layer per tick. Result themes play once.
- `createEs2AudioAdapter(options): Es2AudioAdapter`: passes through existing
  mute, volume, interruption and wake; never instantiates or disposes
  `AudioContext`, registers another animation/timer loop or owns media.
- New SFX use **one** synthesis path. With a valid `tone` callback they
  play ES2 notes only; without it, or if it throws, they use a legacy cue.
  A throwing tone port is disabled for the rest of the adapter's lifetime.
- When the supplied `AudioContext.currentTime` restarts at zero, ES2
  clears stale SFX cooldowns and re-anchors its score scheduling.

## Installable typed host port (integration branch only)

```ts
import {
  createEs2AudioAdapter,
  type Es2AudioAdapter,
  type Es2AudioOptions,
} from './audio/es2/adapter'
import type { Es2Scene } from './audio/es2/score'
import type { Es2Cue } from './audio/es2/cues'
import type { ToneFn } from './audio/music'

// All three callbacks MUST come from the existing AudioSystem's ONE
// AudioContext and its existing music/SFX gain buses.
// The shared-file owner must expose them; this branch cannot do so.
declare const existingAudio: import('./audio/types').AudioSystem
declare const sharedContext: AudioContext
declare const hostTone: ToneFn

const port: Es2AudioOptions = {
  audio: existingAudio,
  now: () => sharedContext.currentTime,
  isRunning: () => sharedContext.state === 'running',
  tone: hostTone,
}
const es2Audio: Es2AudioAdapter = createEs2AudioAdapter(port)

function onAudioScene(scene: Es2Scene): void { es2Audio.setScene(scene) }
function onGameplaySfx(cue: Es2Cue): void { es2Audio.play(cue) }
```

The example is the type-level contract, not a new runtime module. The host
`ToneFn` has the exact signature
`(midi, at, duration, volume, wave, bus: 'sfx' | 'music') => void`.
It must target the **already-existing** Web Audio buses. Music and SFX
gain buses already enforce the users' 0–100 volume settings; do not apply
the volume a second time inside the port. When `tone` is provided,
`isRunning` is required by the TypeScript union to prevent scheduling
into Safari/iOS suspended contexts.

If a direct host tone port is not yet available, install the **fallback
variant** `createEs2AudioAdapter({ audio: existingAudio, now: () =>
sharedContext.currentTime })`. It retains the existing music and legacy
SFX, but **does not play the ES2 themes**. This is an intentional safety
fallback, not a replacement audio graph.

## Host integration ownership and lifecycle

1. Maintain exactly one `createAudioSystem(...)` in the existing owner.
   Create one ES2 adapter per owner lifecycle, not one per run or enemy.
2. In the **existing** animation loop, replace `audio.tick(mode)` with
   `es2Audio.tick(mode)` (never call both). The adapter delegates back to
   legacy music when there is no working direct tone port.
3. Map title/menu to `menu`, quiet gameplay to `exploration`, ordinary
   fights to `combat`, intense waves to `battle`, elite encounters to
   `elite`, bosses to `boss`, win to `victory`, loss to `defeat`.
   Call `setScene` only when the phase changes. All phase names are typed.
4. Route the relevant new game events through `play(cue)`; keep unaffected
   legacy events on `audio.playSfx`. Avoid calling **both** for one event.
   Existing cooldowns and the eight-per-100-ms limiter remain bounded.
5. On a **trusted user gesture**, invoke `wakeFromGesture()`. On
   visibility loss call `interrupt()`; do not resume automatically
   when the tab returns. On the next user gesture call
   `resumeFromGesture()`, then wait for `isRunning()` to become true.
6. Keep the existing `starMusic`, `starSfx`,
   `eclipseMusicVolume` and `eclipseSfxVolume` storage keys. The
   shared `AudioControl.vue` already offers separate sliders/toggles:
   call the adapter's `setMusicVolume`, `setSfxVolume`,
   `toggleMusic(mode)` and `toggleSfx()` from those controls.
7. **Do not double-play BGM:** once the direct ES2 synth is activated,
   stop the legacy media BGM and any simultaneous legacy menu score
   through the **shared audio owner**. `audio.onScreen` can still
   play the old MP3, and this isolated branch cannot change it.
   The integrator must choose precisely one music source per scene.
8. On unmount, call `es2Audio.dispose()` first; the existing owner
   alone calls `audio.dispose()`. Disposing the ES2 adapter must never
   close the shared context.

Crossfades are per-note volume interpolations, not cancelable per-sample
AudioParam ramps. Already queued notes may continue briefly; this design
avoids creating competing gain graphs and scheduling loops.

## Verification and current boundaries

Regression tests: `adapter.test.ts`, `score.test.ts`,
`remediation.test.ts`.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

No shared engine entry, existing AudioSystem, main branch, or deployment is
modified here. The integration owner must bind the host port and scene/SFX
events, and retire duplicate BGM before enabling the ES2 score in gameplay.
