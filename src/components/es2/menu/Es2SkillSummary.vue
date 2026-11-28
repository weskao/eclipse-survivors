<script setup lang="ts">
import { vImageShimmer } from '../../shared/image-shimmer'
defineProps<{
  icon: string; title: string; detail?: string; detailLabel?: string; description?: string
  eyebrow?: string; owner?: string; compact?: boolean; iconAlt?: string
}>()
</script>
<template>
  <span class="es2-active-summary" :data-compact="compact ? 'true' : undefined" :data-has-detail="detail ? 'true' : undefined">
    <span class="es2-active-summary__main">
      <img v-image-shimmer="icon" data-hero-skill-icon class="es2-active-summary__icon" :src="icon" :alt="iconAlt ?? ''"
        width="44" height="44" decoding="async" loading="lazy" draggable="false" />
      <span class="es2-active-summary__copy">
        <span v-if="owner" class="es2-active-summary__hero">{{ owner }}</span>
        <span v-if="eyebrow && !compact" class="es2-active-summary__hero">{{ eyebrow }}</span>
        <span class="es2-active-summary__head"><strong data-active-skill-name>{{ title }}</strong></span>
        <span v-if="description && !compact" class="es2-active-summary__desc">{{ description }}</span>
      </span>
    </span>
    <span v-if="detail" data-active-skill-cooldown class="es2-active-summary__cooldown" :aria-label="detailLabel ?? detail">
      <span v-for="(part, index) in detail.split(' · ')" :key="index">{{ part }}</span>
    </span>
  </span>
</template>
<style scoped>
.es2-active-summary { display:grid; grid-template-columns:minmax(0,1fr); align-items:stretch; min-width:0; width:100%; box-sizing:border-box; text-align:start; border:1px solid color-mix(in srgb,var(--es2-special-accent, #bda473) 55%,transparent); border-radius:8px; background:linear-gradient(135deg,var(--es2-special-panel, #172638),#101521); box-shadow:inset 0 1px #ffffff15; }
.es2-active-summary[data-has-detail] { grid-template-columns:minmax(0,1fr) fit-content(40%); }
.es2-active-summary__main { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:7px; min-width:0; box-sizing:border-box; }
.es2-active-summary .es2-active-summary__icon { display:block; flex:0 1 44px; width:44px; max-width:100%; height:auto; aspect-ratio:1; padding:0; object-fit:contain; border-radius:6px; border:1px solid var(--es2-special-accent, #bda473); background:#090e17; }
.es2-active-summary__copy { display:grid; min-width:0; flex:1 1 4.5rem; gap:3px; }
.es2-active-summary__head { display:flex; align-items:baseline; min-width:0; color:var(--es2-special-light, #ffe4a6); }
.es2-active-summary__head strong { font-size:.85rem; line-height:1.2; overflow-wrap:anywhere; hyphens:auto; }
.es2-active-summary__cooldown { display:flex; flex-direction:column; align-items:flex-end; justify-content:center; align-self:stretch; min-width:0; box-sizing:border-box; gap:4px; padding:6px 5px; border-start-end-radius:7px; border-end-end-radius:7px; background:#090e1740; text-align:end; font:600 .75rem/1.3 var(--es2-font-numeric), system-ui,sans-serif; color:#e5d9c9; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.es2-active-summary__cooldown > span { min-width:0; max-width:100%; }
.es2-active-summary__hero { color:var(--es2-special-accent, #bda473); font-size:.72rem; overflow-wrap:anywhere; }
.es2-active-summary__desc { color:#e8ded3; font-size:.8rem; line-height:1.45; overflow-wrap:anywhere; }
.es2-active-summary[data-compact="true"] .es2-active-summary__main { gap:4px; padding:4px; }
.es2-active-summary[data-compact="true"] .es2-active-summary__copy { flex-basis:2.25rem; }
.es2-active-summary[data-compact="true"] .es2-active-summary__icon { flex-basis:26px; width:26px; }
.es2-active-summary[data-compact="true"] .es2-active-summary__head strong { font-size:.72rem; }
.es2-active-summary[data-compact="true"] .es2-active-summary__cooldown { padding:4px 3px; font-size:.7rem; }
/* Narrow cards: the name spans the row above the icon, so long single words stay whole. */
@media (max-width:610px) {
  .es2-active-summary[data-compact="true"] .es2-active-summary__main { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; }
  .es2-active-summary[data-compact="true"] :is(.es2-active-summary__copy,.es2-active-summary__head) { display:contents; }
  .es2-active-summary[data-compact="true"] .es2-active-summary__head strong { grid-column:1 / -1; grid-row:1; }
}
</style>
