---
paths:
  - "src/components/es2/hud/**"
  - "src/components/GameHud.vue"
  - "src/components/TouchControls.vue"
  - "src/styles/es2/hud.css"
  - "src/styles/es2/low-health.css"
  - "src/game/input.ts"
  - "src/game/content/accessibility/**"
---

# Combat HUD and touch-control layout

Extends the always-loaded `ui-responsive-layout.md` for the in-run HUD.

- Prioritize combat: HP, real boss health, timer and input controls stay visible. Do not permanently obscure the center battlefield with secondary objectives or status details.
- Mobile portrait <=700px: use the single existing CombatHud information drawer; start collapsed and allow explicit expand, close, outside-pointer dismissal, Escape, resize/orientation dismissal.
- On touch tablets up to 1100 CSS px, reuse the same information drawer so the permanent equipment bar never competes with joystick, dash or hero special actions. Pointer-capable desktops retain their full HUD.
- Do not clone UI projections, notices, timers or simulation systems. Reuse authoritative HUD content and modal components.
- Respect the configured joystick side and touch scale. Touch targets should reach at least 44 CSS px; the special action stays clear of dash/joystick.
- Avoid touching character identity, character assets or combat engine for HUD-only layout changes.
