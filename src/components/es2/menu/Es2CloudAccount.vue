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
const failedPhoto = ref('')
const photoUrl = computed(() => props.cloud.user.value?.photoURL ?? '')
watch(photoUrl, () => { failedPhoto.value = '' })
const avatarUrl = computed(() => photoUrl.value.startsWith('https://') && photoUrl.value !== failedPhoto.value ? photoUrl.value : '')
const avatarInitial = computed(() => {
  const user = props.cloud.user.value
  const name = user?.displayName?.trim() || user?.email?.trim() || '?'
  return Array.from(name)[0]?.toLocaleUpperCase() || '?'
})
const accountStatus = computed(() => props.cloud.status.value === 'synced' && !props.cloud.confirmed.value
  ? 'syncing' : props.cloud.status.value)
const statusGlyph = computed(() => {
  switch (accountStatus.value) {
    case 'synced': return '✓'
    case 'error': case 'conflict': return '!'
    case 'syncing': case 'loading': return '…'
    case 'playtest': return '◇'
    default: return '·'
  }
})
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
    :class="{ 'es2-cloud-profile-trigger': cloud.user.value }"
    :aria-haspopup="cloud.user.value ? 'dialog' : undefined" :aria-expanded="cloud.user.value ? open : undefined"
    :aria-label="t(cloud.user.value ? 'Google 帳號與雲端存檔' : '使用 Google 登入')"
    :aria-description="cloud.user.value ? t(statusLabels[accountStatus]) : undefined"
    :title="t(cloud.user.value ? statusLabels[accountStatus] : resultMessage)" :data-es2-cloud-state="cloud.status.value"
    :disabled="!cloud.user.value && (!cloud.available.value || cloud.busy.value)" @click="activate">
    <template v-if="cloud.user.value">
      <span class="es2-cloud-avatar" data-es2-profile-avatar aria-hidden="true">
        <img v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" alt="" referrerpolicy="no-referrer" @error="failedPhoto = photoUrl" />
        <span v-else>{{ avatarInitial }}</span>
      </span>
      <span class="es2-cloud-status-mark" data-es2-profile-status :data-state="accountStatus" aria-hidden="true">{{ statusGlyph }}</span>
    </template>
    <template v-else>
      <img :src="googleSignInIcon" class="es2-cloud-emblem" alt="" aria-hidden="true" /><span class="es2-cloud-trigger-label">{{ t('Google 登入') }}</span>
    </template>
  </button>
  <Es2Dialog v-if="!result && cloud.user.value" :active="open" :title="t('帳號')" :subtitle="t('目前僅同步暮光餘燼，其他進度與設定保存在此裝置。')" @cancel="close">
    <div class="es2-cloud-card">
      <div v-if="cloud.user.value" class="es2-cloud-identity">
        <span class="es2-cloud-avatar es2-cloud-avatar-large" aria-hidden="true">
          <img v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" alt="" referrerpolicy="no-referrer" @error="failedPhoto = photoUrl" />
          <span v-else>{{ avatarInitial }}</span>
        </span>
        <div class="es2-cloud-identity-copy">
          <strong>{{ cloud.user.value.displayName?.trim() || t('Google 帳號') }}</strong>
          <small v-if="cloud.user.value.email">{{ cloud.user.value.email }}</small>
          <span class="es2-cloud-provider"><img :src="googleSignInIcon" alt="" aria-hidden="true" />{{ t('Google 帳號') }}</span>
        </div>
      </div>
 
      <div class="es2-cloud-balance"><span>{{ t('暮光餘燼') }}</span><strong>✧ {{ formatNumber(embers) }}</strong></div>
      <p class="es2-cloud-status-line" role="status" aria-live="polite" data-es2-cloud-status>
        <span class="es2-cloud-status-mark" :data-state="accountStatus" aria-hidden="true">{{ statusGlyph }}</span>
        {{ t(statusLabels[accountStatus]) }}
      </p>
      <p v-if="cloud.status.value === 'conflict'">{{ t('本機未同步餘燼仍保留。重試或明確選擇使用雲端餘燼。') }}</p>
      <div v-if="confirmRestore" class="es2-cloud-confirm">
        <p>{{ t('使用雲端餘燼將捨棄本機未同步的餘燼變更，其他本機進度不會重置。') }}</p>
        <button type="button" class="es2-secondary" data-ui-sfx="select" @click="confirmRestore = false">{{ t('取消') }}</button>
        <button type="button" class="es2-secondary" data-ui-sfx="select" :disabled="cloud.busy.value" @click="restore">{{ t('確認使用雲端餘燼') }}</button>
      </div>
    </div>
    <template #actions>
        <button v-if="cloud.status.value !== 'playtest'" type="button" class="es2-secondary" data-es2-cloud-sync data-ui-sfx="select" :disabled="cloud.busy.value" @click="cloud.sync()">{{ t('立即同步') }}</button>
        <button v-if="cloud.status.value === 'conflict' && !confirmRestore" type="button" class="es2-secondary" data-ui-sfx="select" @click="confirmRestore = true">{{ t('使用雲端餘燼') }}</button>
        <button type="button" class="es2-secondary es2-cloud-logout" data-es2-cloud-logout data-ui-sfx="select" :disabled="cloud.busy.value" @click="cloud.logout">{{ t('登出') }}</button>
    </template>
  </Es2Dialog>
</template>
<style scoped>
.es2-cloud-trigger { min-height: 44px; white-space: normal; }
.es2-cloud-trigger.es2-cloud-profile-trigger { position: relative; width: 44px; height: 44px; min-width: 44px; padding: 3px; border-radius: 50%; border-color: #96754d; background: #141c2c; }
.es2-cloud-profile-trigger:focus-visible { outline: 2px solid #f5d398; outline-offset: 3px; }
@media (hover: hover) and (pointer: fine) {
  .es2-cloud-trigger.es2-cloud-profile-trigger:hover { border-color: #e7c38b; box-shadow: 0 0 10px #e7c38338; }
}
.es2-cloud-avatar { display: grid; place-items: center; flex: 0 0 auto; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 35% 25%, #51445c, #242236 75%); color: #ffdf9e; font: 700 1rem/1 system-ui, sans-serif; }
.es2-cloud-avatar img { display: block; width: 100%; height: 100%; object-fit: cover; }
.es2-cloud-status-mark { display: inline-grid; place-items: center; flex: 0 0 auto; width: 15px; height: 15px; border-radius: 50%; border: 2px solid #121a28; background: #929ba8; color: #121a28; font: 800 10px/1 system-ui, sans-serif; }
.es2-cloud-profile-trigger .es2-cloud-status-mark { position: absolute; right: -1px; bottom: -1px; }
.es2-cloud-status-mark[data-state="synced"] { background: #94d5ad; }
.es2-cloud-status-mark[data-state="syncing"], .es2-cloud-status-mark[data-state="loading"] { background: #f1cb86; }
.es2-cloud-status-mark[data-state="error"], .es2-cloud-status-mark[data-state="conflict"] { background: #f6a58f; }
.es2-cloud-status-mark[data-state="playtest"] { background: #c3b2ed; }
.es2-cloud-avatar.es2-cloud-avatar-large { width: 58px; height: 58px; border: 1px solid #96754d; font-size: 1.5rem; }
.es2-cloud-identity-copy { min-width: 0; display: grid; gap: .2rem; }
.es2-cloud-provider { display: inline-flex; align-items: center; gap: .35rem; color: #ddc6a2; font-size: max(.75rem, calc(.8rem * var(--es2-ui-scale, 1))); }
.es2-cloud-provider img { width: 1rem; height: 1rem; object-fit: contain; }
.es2-cloud-status-line { display: flex; align-items: center; gap: .45rem; color: #ddc6a2; }
.es2-cloud-status-line .es2-cloud-status-mark { width: 18px; height: 18px; font-size: 12px; }
.es2-cloud-logout { color: #f6b8a4; }
@media (forced-colors: active) {
  .es2-cloud-status-mark { border-color: CanvasText; background: Canvas; color: CanvasText; }
}
.es2-cloud-emblem { display: block; flex: 0 0 auto; width: 1.65rem; height: 1.65rem; object-fit: contain; }
.es2-result-cloud { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 12px; min-width: 0; margin: 8px auto 0; padding: 6px 8px; border-top: 1px solid var(--es2-line, #806342); font-size: max(.75rem, calc(.85rem * var(--es2-ui-scale, 1))); }
.es2-result-cloud p { flex: 1 1 220px; min-width: 0; margin: 0; line-height: 1.35; overflow-wrap: anywhere; color: #ddc6a2; }
.es2-result-cloud [data-confirmed="true"] { color: #bde6b2; }
.es2-result-cloud button { flex: 0 1 auto; min-height: 44px; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 480px) { .es2-result-cloud { flex-direction: column; gap: 4px; } .es2-result-cloud p { flex: none; } }
@media (orientation: landscape) and (max-height: 520px) { .es2-result-cloud { margin-top: 4px; padding: 3px 4px; } .es2-result-cloud p { flex-basis: 160px; } }
.es2-cloud-card { display: grid; gap: .7rem; overflow-wrap: anywhere; }
.es2-cloud-card p { margin: 0; }
.es2-cloud-identity { display: flex; align-items: center; gap: .85rem; min-width: 0; padding: .85rem; border: 1px solid var(--es2-line, #806342); border-radius: .7rem; background: linear-gradient(120deg, #252237, #141c2c); }
.es2-cloud-identity small { display: block; color: #ddc6a2; }
.es2-cloud-balance { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; padding: .75rem; border: 1px solid #98714c; border-radius: .6rem; background: #21172c; color: #ffdf9e; }
.es2-cloud-confirm { display: flex; flex-wrap: wrap; gap: .5rem; }
.es2-google-signin { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 44px; }
</style>
