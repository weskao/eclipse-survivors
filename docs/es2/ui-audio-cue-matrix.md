# ES2 UI sound/music cue matrix

Implementation branch: `feature/es2-release-readiness-integration`. One Web Audio owner; prefer shared synth SFX and existing menu/battle tracks.

| Interaction | Cue | Ownership |
| --- | --- | --- |
| Ordinary click, toggle, dropdown trigger, HUD info open/close, close or cancel dialog | `ui` | Delegated DOM click, including keyboard |
| Desktop hover across a new button (not its children) | `hover` | Delegated pointerover; limited by shared cooldown |
| Hero selection (original and special), run mode change | `select` | Engine validated command |
| Local archive tabs, dropdown option, and non-gameplay selection | `select` | `data-ui-sfx="select"` |
| Shadowblade — Shadow Assault (影襲), Q / touch | `shadowblade-special` | Successful hero cast; paired blade accents, dark pulse |
| Spirit Summoner — 靈潮集結, Q / touch | `spirit-summoner-special` | Successful hero cast; rising spectral resonance |
| Crimson Paladin — 血誓屏障, Q / touch | `crimson-paladin-special` | Successful hero cast; shield impact and protective chord |
| Start / retry expedition | `start` | Engine |
| Pause / resume / game-home request | `pause` / `resume` | Engine |
| Level-up opening | `level` | Engine |
| Accepted upgrade/treasure/research/equipment/bonus/world-event choice | `upgrade` | Engine |
| Successful cosmetic equip | `select` | Engine |
| Failed transaction or out-of-range world event | `deny` | Engine |
| World event opening, returning home, irreversible progress reset | `scene` | Engine |
| Victory / defeat | `victory` / `defeat` | Engine |
| Volume slider drag, movement joystick, scroll, disabled buttons | Silent | Deliberate restraint |

## Integration rules

- `data-ui-sfx="managed"` suppresses generic click for semantic gameplay events; without it the default is `ui`.
- `data-ui-sfx="select"` / `scene` / `pause` is only for actions **without** a second engine-owned cue.
- `data-ui-sfx="silent"` disables generic click and hover.
- Teleported ES2 dialogs and native keyboard clicks use document-level capture; do not add local audio listeners.
- Separate music and SFX gain/mute/volume settings remain authoritative. A muted cue remains silent.
- Existing menu overture and battle BGM stay the only active media score per screen. Keep UI actions as short one-shot SFX, not new looping songs.
- The opt-in `src/game/audio/es2/adapter.ts` soundtrack is not automatically mixed into the legacy BGM; enabling it requires a deliberate one-track-per-scene handoff.

## QA

- Mouse/touch/keyboard: one click, one audible UI cue; no duplicate `ui` with `start`, `pause`, `upgrade`, or `select`.
- Disabled buttons and unaffordable choices stay silent. Valid purchases play success; failed transactions play `deny`.
- Hover on nested SVG/text does not retrigger the parent sound.
- Selector `role="option"` also speaks on mouse click; arrows and Enter should not double-play.
- UI on/off and music on/off remain independent; sliders never chirp per input step.
- Check desktop, portrait/landscape mobile, tablet, foldable and browser interruption with accessible UI and no stuck sound.
