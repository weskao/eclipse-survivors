<script setup lang="ts">
import { ref } from 'vue'
import { t, formatNumber } from '../../../i18n'
import type { useCloudWallet } from '../../../cloud/use-cloud-wallet'
import Es2Dialog from './Es2Dialog.vue'
const props = defineProps<{ cloud: ReturnType<typeof useCloudWallet>; embers: number }>()
const open = ref(false), confirmRestore = ref(false)
const statusLabels = {
  unavailable: '雲端存檔尚未設定', loading: '正在連線', guest: '訪客・本機存檔',
  syncing: '正在同步暮光餘燼', synced: '暮光餘燼已同步', error: '無法同步，請重試', conflict: '雲端餘燼已在其他裝置變更',
} as const
function close() { open.value = false; confirmRestore.value = false }
function restore() { confirmRestore.value = false; void props.cloud.sync(true) }
</script>
<template>
  <button type="button" class="es2-icon-button es2-cloud-trigger" data-es2-cloud-account data-ui-sfx="select"
    aria-haspopup="dialog" :aria-label="t('Google 帳號與雲端存檔')" @click="open = true">
    <span aria-hidden="true" class="es2-cloud-emblem">G</span><span>{{ t(cloud.user.value ? '帳號' : 'Google 登入') }}</span>
  </button>
  <Es2Dialog :active="open" :title="t('Google 帳號與雲端存檔')" :subtitle="t('目前僅同步暮光餘燼，其他進度與設定保存在此裝置。')" @cancel="close">
    <div class="es2-cloud-card">
      <div v-if="cloud.user.value" class="es2-cloud-identity">
        <span class="es2-cloud-emblem" aria-hidden="true">G</span>
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
      <button v-if="!cloud.user.value" type="button" class="es2-primary es2-google-signin" data-es2-google-login data-ui-sfx="select"
        :disabled="!cloud.available.value || cloud.busy.value" @click="cloud.login"><span class="es2-cloud-emblem" aria-hidden="true">G</span>{{ t('使用 Google 登入') }}</button>
      <template v-else>
        <button type="button" class="es2-secondary" data-ui-sfx="select" :disabled="cloud.busy.value" @click="cloud.sync()">{{ t('立即同步') }}</button>
        <button v-if="cloud.status.value === 'conflict' && !confirmRestore" type="button" class="es2-secondary" data-ui-sfx="select" @click="confirmRestore = true">{{ t('使用雲端餘燼') }}</button>
        <button type="button" class="es2-secondary" data-ui-sfx="select" :disabled="cloud.busy.value" @click="cloud.logout">{{ t('登出') }}</button>
      </template>
    </template>
  </Es2Dialog>
</template>
<style scoped>
.es2-cloud-trigger { min-height: 44px; white-space: normal; }
.es2-cloud-emblem { display: inline-grid; place-items: center; flex: 0 0 auto; width: 1.65rem; height: 1.65rem; border-radius: 50%; background: #fff; color: #4285f4; font: 700 1.1rem/1 Arial, sans-serif; }
.es2-cloud-card { display: grid; gap: .7rem; overflow-wrap: anywhere; }
.es2-cloud-card p { margin: 0; }
.es2-cloud-identity { display: flex; align-items: center; gap: .65rem; min-width: 0; }
.es2-cloud-identity small { display: block; color: #ddc6a2; }
.es2-cloud-balance { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; padding: .75rem; border: 1px solid #98714c; border-radius: .6rem; background: #21172c; color: #ffdf9e; }
.es2-cloud-confirm { display: flex; flex-wrap: wrap; gap: .5rem; }
.es2-google-signin { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 44px; }
</style>
