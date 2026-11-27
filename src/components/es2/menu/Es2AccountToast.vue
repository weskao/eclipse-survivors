<script setup lang="ts">
import { t } from '../../../i18n'
import Es2CloudSymbol from './Es2CloudSymbol.vue'
import type { AccountNotice } from '../../../cloud/use-cloud-wallet'
defineProps<{ notice: AccountNotice; inline?: boolean }>()
</script>
<template>
  <div class="es2-account-toast" :class="{ 'es2-account-toast-inline': inline }" :data-es2-account-toast="notice" role="status" aria-live="polite" aria-atomic="true">
    <span class="es2-account-toast-symbol" aria-hidden="true"><Es2CloudSymbol :state="notice" /></span>
    <div class="es2-account-toast-copy">
      <strong>{{ t(notice === 'success' ? '登入成功' : '登入失敗') }}</strong>
      <span>{{ t(notice === 'success' ? 'Google 帳號已連結。' : 'Google 登入失敗，請重試。') }}</span>
    </div>
  </div>
</template>
<style scoped>
.es2-account-toast { --notice-accent: #94d5ad; position: fixed; z-index: 340; inset-block-start: calc(max(12px, env(safe-area-inset-top)) + 58px); inset-inline-end: max(12px, env(safe-area-inset-right)); width: min(330px, calc(100% - max(12px, env(safe-area-inset-left)) - max(12px, env(safe-area-inset-right)))); box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #9e87637a; border-radius: 10px; background: radial-gradient(ellipse at 0% 30%, color-mix(in srgb, var(--notice-accent) 10%, #192532), transparent 85%), linear-gradient(120deg, #1f2b3a, #101923); box-shadow: 0 12px 28px #0008, inset 0 1px #e8d1a51c; color: #f5e9d5; text-align: start; pointer-events: none; animation: account-toast-enter 220ms ease-out both; }
.es2-account-toast[data-es2-account-toast="error"] { --notice-accent: #f6a58f; }
.es2-account-toast-inline { position: static; width: 100%; box-shadow: none; padding: 6px 8px; border: 0; background: transparent; gap: 8px; }
.es2-account-toast-symbol { flex: 0 0 38px; height: 38px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--notice-accent) 65%, transparent); border-radius: 50%; background: color-mix(in srgb, var(--notice-accent) 12%, #121d2b); color: var(--notice-accent); }
.es2-account-toast-symbol svg { width: 24px; height: 24px; }
.es2-account-toast-inline .es2-account-toast-symbol { flex-basis: 26px; height: 26px; border: 0; background: transparent; }
.es2-account-toast-inline .es2-account-toast-symbol svg { width: 22px; height: 22px; }
.es2-account-toast-copy { min-width: 0; display: grid; gap: 3px; overflow-wrap: anywhere; }
.es2-account-toast-copy strong { color: var(--notice-accent); font-size: max(.9rem, calc(1rem * var(--es2-ui-scale, 1))); line-height: 1.3; }
.es2-account-toast-copy span { color: #d6cdbf; font-size: max(.75rem, calc(.85rem * var(--es2-ui-scale, 1))); line-height: 1.35; }
.es2-account-toast-inline .es2-account-toast-copy { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
@keyframes account-toast-enter { from { opacity: 0; transform: translateY(-7px) scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .es2-account-toast { animation: none; } }
@media (orientation: landscape) and (max-height: 520px) { .es2-account-toast { padding: 7px 9px; } .es2-account-toast-symbol { flex-basis: 30px; height: 30px; } }
@media (forced-colors: active) { .es2-account-toast, .es2-account-toast-symbol { border-color: CanvasText; color: CanvasText; } .es2-account-toast-copy strong, .es2-account-toast-copy span { color: CanvasText; } }
</style>
