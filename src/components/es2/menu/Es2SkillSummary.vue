<script setup lang="ts">
defineProps<{
  icon: string; title: string; detail?: string; detailLabel?: string; description?: string
  eyebrow?: string; owner?: string; compact?: boolean; iconAlt?: string
}>()
</script>
<template>
  <span class="es2-active-summary" :data-compact="compact ? 'true' : undefined">
    <img data-hero-skill-icon class="es2-active-summary__icon" :src="icon" :alt="iconAlt ?? ''"
      width="44" height="44" decoding="async" loading="lazy" draggable="false" />
    <span class="es2-active-summary__copy">
      <span v-if="owner" class="es2-active-summary__hero">{{ owner }}</span>
      <span v-if="eyebrow && !compact" class="es2-active-summary__hero">{{ eyebrow }}</span>
      <span class="es2-active-summary__head">
        <strong data-active-skill-name>{{ title }}</strong>
        <span v-if="detail" data-active-skill-cooldown class="es2-active-summary__cooldown" :aria-label="detailLabel">{{ detail }}</span>
      </span>
      <span v-if="description && !compact" class="es2-active-summary__desc">{{ description }}</span>
    </span>
  </span>
</template>
<style scoped>
.es2-active-summary { display:flex; align-items:center; gap:8px; min-width:0; width:100%; box-sizing:border-box; text-align:start; border:1px solid color-mix(in srgb,var(--es2-special-accent, #bda473) 55%,transparent); border-radius:8px; padding:7px; background:linear-gradient(135deg,var(--es2-special-panel, #172638),#101521); box-shadow:inset 0 1px #ffffff15; }
.es2-active-summary .es2-active-summary__icon { display:block; flex:0 0 44px; width:44px; height:44px; padding:0; object-fit:contain; border-radius:6px; border:1px solid var(--es2-special-accent, #bda473); background:#090e17; }
.es2-active-summary__copy { display:grid; min-width:0; flex:1; gap:3px; }
.es2-active-summary__head { display:flex; align-items:baseline; flex-wrap:wrap; gap:3px 7px; min-width:0; color:var(--es2-special-light, #ffe4a6); }
.es2-active-summary__head strong { font-size:.85rem; line-height:1.2; overflow-wrap:anywhere; }
.es2-active-summary__cooldown { margin-inline-start:auto; font:600 .7rem/1.15 system-ui,sans-serif; color:#e5d9c9; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.es2-active-summary__hero { color:var(--es2-special-accent, #bda473); font-size:.72rem; }
.es2-active-summary__desc { color:#e8ded3; font-size:.8rem; line-height:1.45; overflow-wrap:anywhere; }
.es2-active-summary[data-compact="true"] { gap:4px; padding:4px; }
.es2-active-summary[data-compact="true"] .es2-active-summary__icon { flex-basis:26px; width:26px; height:26px; }
.es2-active-summary[data-compact="true"] .es2-active-summary__head strong { font-size:.72rem; }
@media (max-width:610px) { .es2-active-summary[data-compact="true"] .es2-active-summary__head { flex-direction:column; gap:1px; } .es2-active-summary[data-compact="true"] .es2-active-summary__cooldown { margin:0; font-size:.64rem; } }
</style>
