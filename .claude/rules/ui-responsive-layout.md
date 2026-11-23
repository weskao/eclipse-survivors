# Responsive ES2 gameplay UI contract

- Check desktop, mobile portrait, mobile landscape, tablets, short screens, safe areas, English/Traditional Chinese and browser zoom.
- Prioritize combat: HP, real boss health, timer and input controls stay visible. Do not permanently obscure the center battlefield with secondary objectives or status details.
- Mobile portrait <=700px: use the single existing CombatHud information drawer; start collapsed and allow explicit expand, close, outside-pointer dismissal, Escape, resize/orientation dismissal.
- Do not clone UI projections, notices, timers or simulation systems. Reuse authoritative HUD content and modal components.
- Respect the configured joystick side and touch scale. Touch targets should reach at least 44 CSS px; the special action stays clear of dash/joystick.
- Use existing ES2 accessible dialogs and custom dropdowns rather than browser-native picker popups. Modal layering must exceed combat HUD and protect keyboard focus.
- Use flex/grid, safe-area insets and 100dvh. Keep panels internally scrollable, translated strings wrap and art remains fully visible.
- Honor interfaceScale, reduced-motion and reduced-flashing settings. Avoid extra per-frame UI computations.
- Avoid touching character identity, character assets or combat engine for HUD-only layout changes.
- Add regression tests before production code, confirm RED, then GREEN and review. Verify portrait expanded/collapsed, boss/wave, simultaneous notices, touch controls both joystick sides, home/pause and real viewport bounds.
- Generated UI mockups are conceptual, not browser evidence. Do not claim runtime visual QA, video or full CI success without actual outputs. Never weaken production-art acceptance tests.
