---
paths:
  - "src/App.vue"
  - "src/components/es2/menu/**"
  - "src/components/es2/hero-roster/**"
  - "src/meta/**"
  - "src/game/content/heroes/**"
---

# Hero lobby — last expedition selection and cosmetic cards

Panel layout, gradients and selection styling live in `ui-responsive-layout.md` (hero selection panel contract).

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
