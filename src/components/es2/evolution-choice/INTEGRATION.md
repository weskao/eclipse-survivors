# Evolution2 choice UI integration (host-owned)

This is a standalone recipe overview and choice adapter; it does not replace the existing five legacy evolutions or edit the shared main menu/engine.

## Host hookup

```vue
<script setup lang="ts">
import EvolutionChoicePanel from '@/components/es2/evolution-choice/EvolutionChoicePanel.vue'
import { applyUpgrade } from '@/game/progression'
import type { ContentId } from '@/game/types'
// 'state', 'hooks' and 'registry' are provided by the existing game host.
function chooseEvolution(id: ContentId) {
  // The registry makes the final prerequisite and duplicate claim decision.
  applyUpgrade(state, id, hooks, registry)
}
</script>
<template>
  <EvolutionChoicePanel :state="state" :active="showEvolutionChoices"
    @choose="chooseEvolution" />
</template>
```

Use the existing game upgrade flow, not direct mutations of `state.content.levels`. In particular, host code must supply the same `ContentRegistry` that contains the `WEAPONS_PACK` and `EVOLUTION2_PACK`. The current shared `pickUpgrades` / `applyUpgrade` flow already handles Evolution2 abilities through that registry; this panel is optional additional discovery UI until integrated by the UI owner. Set `active` only when an evolution selection can be accepted. Recompute/publish `state` to Vue after level changes if the host uses non-reactive game state.

## Ownership and limitations

- This branch deliberately does not modify App.vue, the menu implementation, the shared registry, or the shared simulation step.
- Current `ContentRegistry` validates foreign prerequisite *levels* but does not validate that an optional weapon pack is registered. Forged in-run level maps can bypass that presence check. Integration owner must add registration validation if it is a trust-boundary requirement.
- The shared simulation step already skips the registry when the game is paused; the Evolution2 executor also avoids damage/effects when called directly while paused.
- The shared `moveShots` resolves Spectral Volley projectiles and credits damage/kills through `hit`; its current native arrow behavior terminates at the first contact.
- The shared registry owns cooldown decrements: if a host calls `registry.tick` directly while already paused and a cooldown is in progress, that cooldown can still decrease. Hosts should only call from the normal playing step.
- The twelve recipes remain tied to level-three weapons and passives, leaving the five original evolutions unchanged.

## Verification

Run `pnpm install --frozen-lockfile && pnpm test && pnpm typecheck && pnpm build && pnpm check-release` on a checked-out branch. The existing `es2-evolution-synergies-ci.yml` has a branch-limited push trigger for `feature/es2-evolution-synergies`, not this remediation branch. Its `workflow_dispatch` action must be explicitly dispatched by an authorized Actions client; do not alter CI ownership to force a run.
