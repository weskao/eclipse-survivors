<script setup lang="ts">
import { t } from '../../../i18n'
import type { AccountNotice } from '../../../cloud/use-cloud-wallet'
defineProps<{ notice: AccountNotice; inline?: boolean }>()
</script>
<template>
  <div class="es2-account-toast" :class="{ 'es2-account-toast-inline': inline }" :data-es2-account-toast="notice" role="status" aria-live="polite" aria-atomic="true">
    <span class="es2-account-toast-symbol" aria-hidden="true">{{ notice === 'success' ? '✓' : '!' }}</span>
    <div class="es2-account-toast-copy">
      <strong>{{ t(notice === 'success' ? '登入成功' : '登入失敗') }}</strong>
      <span>{{ t(notice === 'success' ? 'Google 帳號已連結。' : 'Google 登入失敗，請重試。') }}</span>
    </div>
  </div>
</template>
<style scoped>
.es2-account-toast { --notice-accent: #94d5ad; position: fixed; z-index: 340; inset-block-start: max(12px, env(safe-area-inset-top)); inset-inline-end: max(12px, env(safe-area-inset-right)); width: min(360px, calc(100% - max(12px, env(safe-area-inset-left)) - max(12px, env(safe-area-inset-right)))); box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #98714c; border-inline-start: 3px solid var(--notice-accent); border-radius: 9px; background: linear-gradient(120deg, #233142, #101a27); box-shadow: 0 8px 30px #0008; color: #f5e9d5; text-align: start; pointer-events: none; animation: account-toast-enter 180ms ease-out both; }
.es2-account-toast[data-es2-account-toast="error"] { --notice-accent: #f6a58f; }
.es2-account-toast-inline { position: static; width: 100%; box-shadow: none; padding: 7px 10px; }
.es2-account-toast-symbol { flex: 0 0 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--notice-accent); border-radius: 50%; color: var(--notice-accent); font: 800 1.2rem/1 system-ui,sans-serif; }
.es2-account-toast-copy { min-width: 0; display: grid; gap: 3px; overflow-wrap: anywhere; }
.es2-account-toast-copy strong { color: var(--notice-accent); font-size: max(.9rem, calc(1rem * var(--es2-ui-scale, 1))); line-height: 1.3; }
.es2-account-toast-copy span { color: #d6cdbf; font-size: max(.75rem, calc(.85rem * var(--es2-ui-scale, 1))); line-height: 1.35; }
@keyframes account-toast-enter { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .es2-account-toast { animation: none; } }
@media (orientation: landscape) and (max-height: 520px) { .es2-account-toast { padding: 7px 9px; } }
@media (forced-colors: active) { .es2-account-toast, .es2-account-toast-symbol { border-color: CanvasText; color: CanvasText; } .es2-account-toast-copy strong, .es2-account-toast-copy span { color: CanvasText; } }
</style>
