# Responsive ES2 gameplay UI contract

- Check desktop, mobile portrait, mobile landscape, tablets, short screens, safe areas, English/Traditional Chinese and browser zoom.
- Prioritize combat: HP, real boss health, timer and input controls stay visible. Do not permanently obscure the center battlefield with secondary objectives or status details.
- Mobile portrait <=700px: use the single existing CombatHud information drawer; start collapsed and allow explicit expand, close, outside-pointer dismissal, Escape, resize/orientation dismissal.
- On touch tablets up to 1100 CSS px, reuse the same information drawer so the permanent equipment bar never competes with joystick, dash or hero special actions. Pointer-capable desktops retain their full HUD.
- Do not clone UI projections, notices, timers or simulation systems. Reuse authoritative HUD content and modal components.
- Respect the configured joystick side and touch scale. Touch targets should reach at least 44 CSS px; the special action stays clear of dash/joystick.
- Use existing ES2 accessible dialogs and custom dropdowns rather than browser-native picker popups. Modal layering must exceed combat HUD and protect keyboard focus.
- Use flex/grid, safe-area insets and 100dvh. Keep panels internally scrollable, translated strings wrap and art remains fully visible.
- Honor interfaceScale, reduced-motion and reduced-flashing settings. Avoid extra per-frame UI computations.
- Avoid touching character identity, character assets or combat engine for HUD-only layout changes.
- Add regression tests before production code, confirm RED, then GREEN and review. Verify portrait expanded/collapsed, boss/wave, simultaneous notices, touch controls both joystick sides, home/pause and real viewport bounds.
- Generated UI mockups are conceptual, not browser evidence. Do not claim runtime visual QA, video or full CI success without actual outputs. Never weaken production-art acceptance tests.

## Universal UI and player-focused visual design

These requirements are mandatory for **every** new/edited player-facing feature, not just HUD changes.

- **Devices:** Review desktop (compact and large), mobile portrait, short mobile landscape, tablet in both orientations, and foldable phones both folded and unfolded. Test safe areas, notches, home indicator, keyboard overlays, browser zoom, bilingual text and potential foldable **hinge** or segmented-screen occlusion.
- **Human visual perspective:** Review real screenshots at normal viewing scale as a player would. Use mature game UX principles: recognizable and adequately large character/item artwork, a clear visual focal point, sensible hierarchy, contrast, typography, meaningful selection feedback and consistent button affordances. Avoid a sterile "everything technically fits" layout.
- **Use unused space:** When vertical or horizontal space is available, expand the important hero portraits, selectable art and primary information naturally; prefer flexible grid/flex remaining-space allocation to tiny fixed thumbnail heights and large blank areas. Preserve aspect ratio, full-art visibility and original asset identity; do not crop, distort, or hide core text to compensate.
- **No occlusion:** Primary UI content, buttons, dialogs, selections and essential gameplay must not overlap, obstruct each other, clip or extend beneath a safe-area inset, touch surface, popover or device fold. Keep all primary interactions visible without scroll when realistically possible. For long content, an obvious internal scroll is better than unreadably small text or targets.
- **Responsive implementation:** Base rules on available width **and height**, including orientation and foldable changes. Reuse shared HTML classes, component architecture and style tokens; never maintain parallel copies of the same game behavior merely to support a device. Touch controls need at least 44 × 44 CSS px hit targets.
- **Real browser evidence:** Verify representative viewport sizes such as 320×640, 375×812, 640×320, 812×375, 360×800 (folded), 720×850 (unfolded), 768×1024, 1024×768 and 1440×900, with hinge/window segments if supported. Add screenshots and assert start/primary action visibility, art scaling when space exists, no horizontal overflow, no text/image clipping, no unwanted element intersections and bilingual usability; visually inspect screenshots before claiming QA success.
