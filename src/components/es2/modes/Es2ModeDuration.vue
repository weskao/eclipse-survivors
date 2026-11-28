<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../../i18n'

const props = defineProps<{ duration: number | null }>()
const minutes = computed(() => Math.ceil((props.duration ?? 0) / 60))
</script>

<template>
  <span class="es2-mode-time" :class="{ 'es2-mode-time--endless': duration === null }"
    :aria-label="duration === null ? t('無時間限制') : t('{minutes} 分鐘', { minutes })">
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
.es2-mode-time--endless [data-es2-mode-time-value] { font-size:clamp(26px,calc(1.65rem * var(--es2-ui-scale,1)),36px); line-height:1; }
@media(orientation:landscape) and (max-height:520px) {
  .es2-mode-time { min-width:34px; padding:2px 4px; }
}
@media(forced-colors:active) {
  .es2-mode-time { background:Canvas; color:CanvasText; border-color:CanvasText; }
  [data-es2-mode-time-unit] { color:CanvasText; }
}
</style>
