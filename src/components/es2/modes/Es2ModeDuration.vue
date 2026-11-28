<script setup lang="ts">
import { computed } from 'vue'
import { modeDurationMinutes, modeDurationLabel } from './mode-duration'

const props = withDefaults(defineProps<{ duration: number | null; compact?: boolean }>(), { compact: false })
const minutes = computed(() => modeDurationMinutes(props.duration))
</script>

<template>
  <span class="es2-mode-time" :class="{ 'es2-mode-time--endless': duration === null, 'es2-mode-time--compact': compact }"
    :aria-label="modeDurationLabel(duration)">
    <span data-es2-mode-time-value aria-hidden="true">{{ duration === null ? '∞' : minutes }}</span>
    <span v-if="duration !== null" data-es2-mode-time-unit aria-hidden="true">MIN</span>
  </span>
</template>

<style scoped>
.es2-mode-time {
  display:grid; place-items:center; align-content:center; flex:none; align-self:center;
  box-sizing:border-box; min-width:38px; min-height:44px; padding:3px 5px; gap:1px;
  border:1px solid #788a9b80; border-radius:4px 10px 4px 10px;
  background:linear-gradient(145deg,#26374c,#101b2a 85%);
  color:var(--es2-mode-accent,#f3d5a1);
  font:800 18px/1.05 var(--es2-font-numeric),system-ui,sans-serif;
  font-variant-numeric:lining-nums tabular-nums; text-align:center; white-space:nowrap;
}
[data-es2-mode-time-value] { font-size:clamp(18px,calc(1.15rem * var(--es2-ui-scale,1)),28px); }
[data-es2-mode-time-unit] { font-size:11px; font-weight:700; letter-spacing:.045em; color:#d4dfec; }
.es2-mode-time--endless {
  display:flex; align-items:center; justify-content:center; align-content:normal;
  padding-block:0; gap:0;
}
.es2-mode-time--endless [data-es2-mode-time-value] {
  display:block; flex:none; margin:0; padding:0;
  font-size:clamp(26px,calc(1.65rem * var(--es2-ui-scale,1)),36px); line-height:1;
}
@media(orientation:landscape) and (max-height:520px) {
  .es2-mode-time { min-width:34px; padding-inline:4px; }
}
/* Borderless typography on cards; the compact dock keeps its existing chip. */
.es2-mode-time:not(.es2-mode-time--compact) {
  border:0; background:none; padding:0; min-height:0; gap:3px;
}
.es2-mode-time:not(.es2-mode-time--compact):not(.es2-mode-time--endless) [data-es2-mode-time-value] {
  font-size:clamp(22px,calc(1.375rem * var(--es2-ui-scale,1)),30px);
}
.es2-mode-time:not(.es2-mode-time--compact) [data-es2-mode-time-unit] {
  letter-spacing:.08em; line-height:1.1;
}
/* Same palette and markup as the cards, inline variant for the short lobby dock. */
.es2-mode-time--compact {
  display:inline-flex; align-items:center; justify-content:center; vertical-align:middle;
  min-width:0; min-height:24px; margin-inline-start:6px; padding:2px 5px; gap:4px;
}
.es2-mode-time--compact [data-es2-mode-time-value] {
  font-size:clamp(13px,calc(.9rem * var(--es2-ui-scale,1)),18px); line-height:1;
}
.es2-mode-time--compact [data-es2-mode-time-unit] { font-size:11px; line-height:1; }
.es2-mode-time--compact.es2-mode-time--endless [data-es2-mode-time-value] {
  font-size:clamp(20px,calc(1.25rem * var(--es2-ui-scale,1)),24px);
}
@media(forced-colors:active) {
  .es2-mode-time { background:Canvas; color:CanvasText; border-color:CanvasText; }
  [data-es2-mode-time-unit] { color:CanvasText; }
}
</style>
