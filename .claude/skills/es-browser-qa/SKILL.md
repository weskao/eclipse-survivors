---
name: es-browser-qa
description: Verify Eclipse Survivors in a real browser when menus, touch controls, accessibility, Canvas art, audio lifecycle, or measured performance changes.
---

# Verify the built game in browsers

1. Build the target revision with `pnpm build` and test that output. Reuse the [responsive capture script](../../../scripts/capture-v1-responsive.py) with the Playwright setup in its [CI workflow](../../../.github/workflows/v1-visual-evidence.yml). Run `python3 scripts/capture-v1-responsive.py` from the root to collect the baseline menu and gameplay captures in `artifacts/v1-responsive/`.
2. Exercise the affected flow from the menu through gameplay. Check desktop keyboard and mobile touch, then cover the relevant mobile edge cases at 320×640 and 375×812 portrait and 640×320 and 812×375 landscape. Check for overflow, HUD/control overlap, usable touch targets and uncaught errors. See the [historical Chromium smoke implementation](https://github.com/weskao/eclipse-survivors/blob/6591875be69f5a53cc9293beec2dc16d9260d861/scripts/es2-mobile-browser-smoke.mjs) for viewport and layout assertions.
3. Match scenarios to the change. For input, try the first Start tap, dragging off the joystick and releasing, cancellation, single-fire dash and pause/resume. For settings and visuals, check keyboard focus, reduced motion and warning legibility. For audio, check gesture unlock and recovery after interruption. On physical iOS Safari and Android Chrome, check the relevant safe areas, rotation and foreground/background behavior.
4. Record the revision, OS, browser, viewport, DPR, scenarios, screenshots or clips, and results. List Vitest, Chromium emulation and physical devices separately with pass, fail or untested status. For performance comparisons, use the same workload and follow the [measurement rules](../../rules/realtime-performance.md#6-required-test-driven-workflow-and-performance-evidence).
