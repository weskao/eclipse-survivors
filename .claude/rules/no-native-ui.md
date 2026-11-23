---
paths:
  - "src/components/**/*.vue"
  - "src/**/*.css"
  - "src/main.ts"
---
# No native browser dropdowns or blocking dialogs

Eclipse Survivors uses in-game controls; its settings and menus must not open OS-native picker UI.

- Use the shared `src/components/es2/menu/Es2Select.vue` for dropdown choices. Never add a visible `<select>` or `<datalist>`, and never use `data-native-select`. Keep existing IDs and semantic choice values.
- The combobox button and teleported page listbox must be keyboard-operable (arrow keys, Home/End, Enter/Space, Escape, Tab), use `aria-expanded`, `aria-controls`, and selection state, and dismiss when the player clicks elsewhere. Do not steal the game controls' keys while open.
- Float the list above any scrolling or clipped settings panel and constrain it to the visual viewport; keep touch targets at least 44px tall, independent option scrolling, safe contrast and focus rings, reduced-motion behavior, and responsive portrait/landscape layouts.
- Keep all displayed option labels reactive to locale changes, and always emit through the existing settings handlers for persistence.
- Use the existing `Es2Dialog.vue` / `Es2Message.vue` for in-game confirmations. Never invoke `alert()`, `prompt()`, or `confirm()` from player-facing flows.
- Guard both integration and interactions with `src/components/es2/menu/Es2Select.test.ts`, `src/components/es2/accessibility/accessibility.test.ts` and `src/i18n.test.ts`.
