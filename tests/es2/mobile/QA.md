# ES2 mobile browser + accessibility QA

Base: `7d7517752466d0a835525d53cebb1b915c5f10bc`. Scope: `src/game/content/accessibility/**`, `src/components/es2/accessibility/**`, `tests/es2/mobile/**`.

## Reproduced risks and fixes

| Risk in original code | Regression | Scoped repair |
| --- | --- | --- |
| Failed `setPointerCapture`: release/movement outside the stick could remain stuck/frozen | `mobile-a11y-regressions.test.ts`: outside move/up, mismatched pointer, exact-once release | Window pointer move/up/cancel fallback, with bubble de-duplication |
| Browser `pagehide` and raw `touchcancel` could leave held input | Cancellation test | Release on pagehide and touchcancel |
| Stick group offered an inert keyboard Tab stop | Focus regression | Remove group tabindex; leave native arrow/WASD game controls intact |
| Focused dash received both game-level Space and native button activation | Keyboard regression | Stop Space key propagation only at the native dash button; preserve arrow bubbling |
| Multiple switch buttons exposed only indistinguishable “on/off” names | Accessibility label regression | Named flash/colorblind/damage switches and motion group |
| Narrow zoom could crowd the settings header; landscape could shrink a touch target under 44 CSS px | Manual viewport inspection | Wrap header on narrow widths; use 44px landscape floor where space allows |

The existing tests in `src/game/content/accessibility/*.test.ts` already cover preference persistence, denied storage, system reduced motion, flashing, symbol policy, LOW/MEDIUM/HIGH/AUTO and simulation-independent quality settings. Do not change the simulation to meet a visual policy.

## Required automated verification

Run on this branch with Node 24 / pnpm 11.22.0:

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run tests/es2/mobile/mobile-a11y-regressions.test.ts src/components/es2/accessibility/accessibility.test.ts src/game/content/accessibility/joystick.test.ts src/game/content/accessibility/preferences.test.ts
pnpm test
pnpm typecheck
pnpm build
pnpm check-release
```

The `es2-mobile-accessibility-ci.yml` workflow watches `feature/es2-mobile-accessibility`, **not** this QA branch. Changing CI workflow ownership is outside this branch; the integration owner must run the commands or trigger a suitable workflow explicitly. No CI pass should be inferred from an empty check list.

## Real-browser and hardware matrix — evidence required before sign-off

Use the running game from the **same branch** (not the public `main` deployment). Capture a viewport screenshot and document browser version, OS, CSS viewport size, devicePixelRatio, zoom and a test timestamp for every row:

| Browser / environment | Size / orientation | Must validate |
| --- | --- | --- |
| Chromium desktop mobile emulation | 320×640 portrait, 375×812 portrait | No horizontal overflow; joystick and dash visible; menu/settings scroll; reachable keyboard focus |
| Chromium desktop mobile emulation | 640×320, 812×375 landscape | Hit targets >=44 CSS px where feasible, HUD/control non-overlap, no clipped focus ring |
| Chromium desktop | 200% browser zoom and 320 CSS px equivalent | No lost settings toggle, clipped header or blocked game controls |
| iOS Safari **real device when available** | Portrait + landscape, Home indicator/notch | Correct safe-area spacing; drag beyond pad; app switch/interruption; native touchcancel |
| Android Chrome **real device when available** | Portrait + landscape, gesture navigation | Rotation, pointer capture/loss, interrupts, focus, touch dash |
| Browser accessibility prefs | reduced motion/flashing, colorblind symbols, LOW | Verify actual visual effects; warnings remain legible; combat rate and hitboxes unchanged |

Interactive scenarios:
1. While holding stick, drag outside the pad and release. Player movement must stop immediately; mismatched secondary touches must not release the first pointer.
2. Hold stick and open settings/pause, rotate, switch tabs, background the app and navigate away. No sticky input on return.
3. Navigate with Tab, Enter, Space, WASD and arrow keys; no dead Tab stop and no double dash with focus on dash.
4. Test system `prefers-reduced-motion` on/off, in-app motion/flashing preferences, colorblind indicators and LOW quality while preserving boss warnings.
5. Repeat in both pointer-capture-success and pointer-capture-failure environments if possible.

## Evidence status at branch creation

- Regression tests: **authored; not yet executed in a repo-installed Vitest environment**.
- Full pnpm suite / typecheck / build / release: **not yet executed**.
- GitHub Actions for this branch: **not triggered by the existing workflow**.
- Browser screenshots: **not captured from this branch**.
- Physical iOS Safari / Android Chrome: **not tested**.

Do not mark this branch integration-ready until these gates have actual recorded output.
