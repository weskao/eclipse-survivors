---
paths:
  - "src/App.vue"
  - "src/components/es2/menu/**"
  - "src/components/es2/hero-roster/**"
  - "src/components/es2/modes/**"
  - "src/components/es2/progression/**"
  - "src/components/MenuScreen.vue"
  - "src/styles/es2/menu.css"
  - "src/cursor-accent.ts"
  - "src/meta/**"
  - "src/game/content/heroes/**"
---

# Hero lobby and hall — selection, navigation, cosmetics

Extends the always-loaded `ui-responsive-layout.md` for the home lobby and Adventurer Hall.

## Last expedition selection

- Keep the last explicit hero ID (not the legacy art job) and mode ID in browser localStorage independently of account progression.
- Restore silently on boot, Home, and account changes in the menu; do not alter a live run or completed result.
- Validate against the same current availability rules as explicit selection and fall back independently to the first selectable hero/mode (currently knight/quick). Future account-specific entitlement rules must be enforced by those same checks, not by separate storage-only logic.
- A storage failure keeps the latest in-memory choice and must not block play.
- Never overwrite or merge account saves to restore a UI preference.

## Hero cosmetic cards

Mandatory for every new or updated hero.

- The Hero Cosmetics section must include an initial and an unlockable aura option using the same reusable card UI, the actual selected `HeroId`'s canonical production portrait (native 3× WebP, never a different hero's legacy art), and the runtime cosmetic palette.
- Locked cards must retain a recognizable preview, a clear localized lock state and the actual achievement/unlock requirement as readable inline text on desktop and touch; do not hide it behind hover, native tooltips or a disabled click.
- Derive conditions from the authoritative active save-system achievement catalog, not duplicate thresholds.
- Preserve locked/equipped/available behavior, existing save entitlement compatibility, and cosmetic-only effects.
- New heroes must explicitly define their cosmetic options/ownership and provide matching portraits; if sharing an existing legacy entitlement, reuse that exact runtime mapping rather than inventing separate unlocks or IDs.
- Test every hero, both locales, unlock/account changes and application of the real palette.
- Check responsive wrapping and minimum 11px text; a locked card remains silent and cannot equip anything.

## Lobby and hall

- **Hero-first lobby:** All six heroes are visible on the initial selection page without category filtering; the nine expedition modes use a separate in-menu page. Keep the five Adventurer Hall entries directly accessible above the selection board on every device. The fixed action dock keeps the selected hero/mode and Start visible, including while scrolling; changing pages must not change the selected hero/mode or start a run. On very short displays allow vertical scroll instead of clipping or shrinking interactive targets below 44px.
- **Expedition brief and visual hierarchy:** Keep the current localized mode name, concise objective summary, selected hero and duration visible in the fixed lobby dock on both pages. The expedition brief is itself the change-mode action; the portal Start remains the strongest visual action, with a full 44px+ semantic button hit area. Prefer theme-specific asymmetry, restrained ornament and distinct silhouettes over uniform boxed controls. Decorative geometry must not clip text or focus outlines. Use static CSS paint and bounded transform/opacity effects, respect reduced motion/flashing, and avoid an extra Canvas/WebGL context or JS animation loop for decorative menu UI.
- **Desktop contextual details:** Fine-pointer hover and keyboard focus expose hero/expedition dossiers using one shared anchored detail surface; no redundant information button on desktop. Touch retains the existing explicit detail action and modal. Hover must not select a hero or mode, start a run, or clip at viewport edges. Keep one content source for hover and modal, dismiss on Escape/leave, and preserve focus and real click actions.
- **Hall navigation:** Persistent destinations (progression, relics, monster/skill compendia and achievements) share the same top navigation and replace the lobby content in-place. Do not add a duplicate tab row or open an archive-sized modal. Preserve the selected hero and expedition page when returning; hide the Start dock while browsing. Reserve modal dialogs for confirmations, settings and genuinely interruptive tasks.
- **Contextual card descriptions:** Keep compendium cards concise and expose longer descriptions through the shared detail surface (desktop hover/focus; touch info action). Never reveal undiscovered entries. Preserve purchase-critical effect values, prices, lock state and rank inline; do not require opening details before every purchase.
- **Single resource chrome and native cursor:** Reuse the ember wallet across lobby and standalone progression; when progression is embedded in the hall, omit its duplicate title and wallet. Keep a single authoritative balance and allow long localized values to wrap. Custom desktop cursors use native CSS image cursors with correct hotspots and OS fallbacks; never hide the real pointer or run another renderer for it. Optional short decorative accents may use one reusable pointer-events:none DOM node, triggered only on actionable hover (rate limited) or primary click; no pointermove tracking, RAF or continuous animation. Respect reduced motion/flashing, touch, text input, disabled and forced-colors behavior.

## Hero selection panel contract

**Mandatory for every existing and future playable hero**, including classic heroes, specializations, new hero CRUD, portraits, cosmetics, and any lobby/hero-selection UI or CSS change. Adding a hero is not complete until its selection panel conforms.

- **Single card template:** Both the classic lobby and specialization roster must render `src/components/es2/hero-roster/HeroSelectionCard.vue`. Supply the stable hero ID, localized name/subtitle, authoritative stats and selection/cosmetic state as inputs; resolve specialization artwork and ability metadata from the existing catalog. Keep one card DOM, details action, selection ribbon and shared keyboard navigation helper; do not create per-hero templates or duplicate interaction logic. Preserve each family's existing navigation group and public selection event.
- **Single visual owner:** Reuse the common `.es2-hero-select-card` surface in `src/styles/es2/menu.css`. All heroes share the same dark base gradient, radial glow position and falloff, panel geometry, rounded corners, border treatment, text/stat surface, selection ribbon and interaction styling. Do not duplicate the gradient, create per-hero panel components or stylesheets solely for coloration, or layer independent portrait/cosmetic background gradients on top. Remove obsolete overrides instead of adding another cascade.
- **Shared hero display name:** Every hero card must render its localized name as a direct `<strong>` child of the shared `.es2-hero-copy` wrapper. Keep typography, scaling, wrapping, alignment and selected-state name styling in the common menu CSS; do not add hero-family-specific name or copy-panel selectors. Hero-specific descriptive content remains independent.
- **Hero identity in idle state:** Supply a single `--es2-hero-idle-glow` value per stable hero ID, derived from the canonical portrait, costume or role. Keep it subdued (current palette uses 8-digit hex with alpha `28`, approximately 16%). New heroes must register their own artwork-aligned tint in the same shared palette. Keep the artwork itself fully legible; do not dim unselected portraits. Cosmetics may subtly tint the idle panel, but must never compete with selection or introduce a separate panel gradient.
- **Fine-pointer hover:** An enabled, unselected hero uses the same radial gradient with its own idle/cosmetic tint strengthened to approximately 30% opacity, a restrained border and soft halo. Do not add a separate gradient, gold selection accents, or selection events. Touch does not retain hover glow; leaving restores the idle tint. Keep keyboard focus independent.
- **Gold is reserved for actual selection:** The shared `--es2-hero-glow` defaults to `var(--es2-hero-idle-glow)` and switches to the common gold `#ffd16b80` only for `[aria-pressed="true"]`. The selected card alone receives the strong golden gradient, gold outline, inset corner accents, external glow and localized selected-status ribbon. Hover, focus, press, cosmetic changes and disabled states must not falsely suggest selection; keep a distinct accessible keyboard focus indicator. Never allow a hero-specific or cosmetic override to replace the selected gold or give unselected cards comparable brightness. Switching selection must restore the former hero's own subtle tint.
- **Consistent behavior and performance:** Preserve card dimensions, portrait aspect ratio, readable stats, detail controls, keyboard/touch activation, accessible semantics, bilingual labels, forced-colors and reduced-motion/flashing behavior at all supported sizes. Use static shared CSS, not additional animation loops, renderers, dependencies or duplicated assets for background illumination.
- **Acceptance gate:** Extend the existing hero selection regression tests (including `src/components/es2/hero-roster/hero-roster.test.ts` and the homepage responsive tests) whenever a hero or panel changes. Cover every registered hero, including new IDs, and verify exactly one selected card across classic/specialization switching, idle tint restoration, cosmetic precedence, non-selecting hover/focus, shared gradient ownership and no independent portrait background overrides. Perform real-browser visual review in desktop, mobile portrait/landscape, tablet and foldable layouts under both locales, and follow the repository's full test/build gate before claiming completion. Do not claim visual or CI approval without evidence.

## Adventurer Hall growth motion
- Keep all research, equipment, blessing and legacy growth nodes on the shared HallGrowthBoard template. Derive effects, ranks, costs and real prerequisites from the authoritative catalog; never fabricate a progression edge or change balance for visuals.
- Inspection (hover, focus, touch) must not spend. Animate only accepted local transactions: interpolate the rank/XP fill, sweep the shared metallic highlight once, and reveal only newly satisfied prerequisite routes. Bound particle bursts and milestones; no perpetual animation or per-frame JS updates. Respect both reduced motion and reduced flashing (including pseudo-elements); keep accessible rank and state text visible.
- Reuse authored 3x WebP icons and the managed audio bus. Verify actual English/Traditional Chinese layouts and art loading across the existing responsive matrix. Do not waive runtime or art/audio acceptance merely because source changes are committed.
