<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import googleSignInIcon from '../../../assets/ui/google-sign-in.webp'
import { t, formatNumber } from '../../../i18n'
import type { useCloudWallet } from '../../../cloud/use-cloud-wallet'
import Es2Dialog from './Es2Dialog.vue'
const props = defineProps<{ cloud: ReturnType<typeof useCloudWallet>; embers: number; result?: boolean }>()
const open = ref(false), confirmRestore = ref(false)
const statusLabels = {
  unavailable: '雲端存檔尚未設定', loading: '正在連線', guest: '訪客・本機存檔',
  playtest: '測試模式：餘燼僅保存在本次測試。', syncing: '正在同步暮光餘燼', synced: '暮光餘燼已同步', error: '無法同步，請重試', conflict: '雲端餘燼已在其他裝置變更',
} as const
const resultMessage = computed(() => {
  if (props.cloud.user.value) {
    if (props.cloud.status.value === 'playtest') return statusLabels.playtest
    if (props.cloud.confirmed.value) return '暮光餘燼已儲存至 Google 帳號。'
    if (props.cloud.status.value === 'conflict') return '雲端餘燼發生衝突，尚未同步。'
    if (props.cloud.status.value === 'error') return '暮光餘燼尚未同步，請重試。'
    return '正在同步暮光餘燼…'
  }
  if (props.cloud.busy.value || props.cloud.signingIn.value) return '正在連線 Google 帳號…'
  if (props.cloud.status.value === 'unavailable') return '雲端存檔尚未設定'
  if (props.cloud.status.value === 'error') return 'Google 登入失敗，請重試。'
  return '訪客餘燼保存在本機；登入後可跨裝置同步帳號餘燼。'
})
function activate() {
  if (props.cloud.user.value) open.value = true
  else if (props.cloud.available.value && !props.cloud.busy.value) void props.cloud.login()
}
function close() { open.value = false; confirmRestore.value = false }
watch(() => props.cloud.user.value, user => { if (!user) close() })
function restore() { confirmRestore.value = false; void props.cloud.sync(true) }
</script>
<template>
  <div v-if="result" class="es2-result-cloud" data-es2-result-cloud>
    <p role="status" aria-live="polite" data-es2-result-cloud-status :data-confirmed="cloud.confirmed.value">{{ t(resultMessage) }}</p>
    <button v-if="!cloud.user.value" type="button" class="es2-secondary es2-google-signin" data-es2-result-google-login data-ui-sfx="select"
      :disabled="!cloud.available.value || cloud.busy.value" @click="activate"><img :src="googleSignInIcon" class="es2-cloud-emblem" alt="" aria-hidden="true" />{{ t('使用 Google 登入') }}</button>
    <button v-else-if="cloud.status.value === 'error' || cloud.status.value === 'conflict'" type="button" class="es2-secondary" data-es2-result-cloud-retry data-ui-sfx="select"
      :disabled="cloud.busy.value" @click="cloud.sync()">{{ t('立即同步') }}</button>
  </div>
  <button v-else type="button" class="es2-icon-button es2-cloud-trigger" data-es2-cloud-account data-ui-sfx="select"
     :aria-haspopup="cloud.user.value ? 'dialog' : undefined" :aria-label="t(cloud.user.value ? 'Google 帳號與雲端存檔' : '使用 Google 登入')" :title="t(cloud.user.value ? statusLabels[cloud.status.value] : resultMessage)" :data-es2-cloud-state="cloud.status.value"
    :disabled="!cloud.user.value && (!cloud.available.value || cloud.busy.value)" @click="activate">
    <img :src="googleSignInIcon" class="es2-cloud-emblem" alt="" aria-hidden="true" /><span class="es2-cloud-trigger-label">{{ t(cloud.user.value ? '帳號' : 'Google 登入') }}</span>
  </button>
  <Es2Dialog v-if="!result && cloud.user.value" :active="open" :title="t('Google 帳號與雲端存檔')" :subtitle="t('目前僅同步暮光餘燼，其他進度與設定保存在此裝置。')" @cancel="close">
    <div class="es2-cloud-card">
      <div v-if="cloud.user.value" class="es2-cloud-identity">
        <img :src="googleSignInIcon" class="es2-cloud-emblem" alt="" aria-hidden="true" />
        <div><strong>{{ cloud.user.value.displayName || t('Google 帳號') }}</strong><small>{{ cloud.user.value.email }}</small></div>
      </div>
      <p v-else>{{ t('不登入也能遊玩。訪客餘燼與 Google 帳號分開保存。') }}</p>
      <div class="es2-cloud-balance"><span>{{ t('暮光餘燼') }}</span><strong>✧ {{ formatNumber(embers) }}</strong></div>
      <p role="status" aria-live="polite" data-es2-cloud-status>{{ t(statusLabels[cloud.status.value]) }}</p>
      <p v-if="cloud.status.value === 'conflict'">{{ t('本機未同步餘燼仍保留。重試或明確選擇使用雲端餘燼。') }}</p>
      <div v-if="confirmRestore" class="es2-cloud-confirm">
        <p>{{ t('使用雲端餘燼將捨棄本機未同步的餘燼變更，其他本機進度不會重置。') }}</p>
        <button type="button" class="es2-secondary" data-ui-sfx="select" @click="confirmRestore = false">{{ t('取消') }}</button>
        <button type="button" class="es2-secondary" data-ui-sfx="select" :disabled="cloud.busy.value" @click="restore">{{ t('確認使用雲端餘燼') }}</button>
      </div>
    </div>
    <template #actions>
        <button v-if="cloud.status.value !== 'playtest'" type="button" class="es2-secondary" data-ui-sfx="select" :disabled="cloud.busy.value" @click="cloud.sync()">{{ t('立即同步') }}</button>
        <button v-if="cloud.status.value === 'conflict' && !confirmRestore" type="button" class="es2-secondary" data-ui-sfx="select" @click="confirmRestore = true">{{ t('使用雲端餘燼') }}</button>
        <button type="button" class="es2-secondary" data-ui-sfx="select" :disabled="cloud.busy.value" @click="cloud.logout">{{ t('登出') }}</button>
    </template>
  </Es2Dialog>
</template>
<style scoped>
.es2-cloud-trigger { min-height: 44px; white-space: normal; }
.es2-cloud-emblem { display: block; flex: 0 0 auto; width: 1.65rem; height: 1.65rem; object-fit: contain; }
.es2-result-cloud { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 12px; min-width: 0; margin: 8px auto 0; padding: 6px 8px; border-top: 1px solid var(--es2-line, #806342); font-size: max(.75rem, calc(.85rem * var(--es2-ui-scale, 1))); }
.es2-result-cloud p { flex: 1 1 220px; min-width: 0; margin: 0; line-height: 1.35; overflow-wrap: anywhere; color: #ddc6a2; }
.es2-result-cloud [data-confirmed="true"] { color: #bde6b2; }
.es2-result-cloud button { flex: 0 1 auto; min-height: 44px; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 480px) { .es2-result-cloud { flex-direction: column; gap: 4px; } .es2-result-cloud p { flex: none; } }
@media (orientation: landscape) and (max-height: 520px) { .es2-result-cloud { margin-top: 4px; padding: 3px 4px; } .es2-result-cloud p { flex-basis: 160px; } }
.es2-cloud-card { display: grid; gap: .7rem; overflow-wrap: anywhere; }
.es2-cloud-card p { margin: 0; }
.es2-cloud-identity { display: flex; align-items: center; gap: .65rem; min-width: 0; }
.es2-cloud-identity small { display: block; color: #ddc6a2; }
.es2-cloud-balance { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; padding: .75rem; border: 1px solid #98714c; border-radius: .6rem; background: #21172c; color: #ffdf9e; }
.es2-cloud-confirm { display: flex; flex-wrap: wrap; gap: .5rem; }
.es2-google-signin { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 44px; }
</style>
