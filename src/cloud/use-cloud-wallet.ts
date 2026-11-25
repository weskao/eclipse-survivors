import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Engine } from '../game/engine'
import type { User, createCloudClient } from './firebase-wallet'

type Status = 'unavailable' | 'loading' | 'guest' | 'syncing' | 'synced' | 'error' | 'conflict'
export function useCloudWallet(engine: Engine) {
  const config = import.meta.env.VITE_ES2_FIREBASE_CONFIG as string | undefined
  const status = ref<Status>(config && engine.cloudWallet ? 'loading' : 'unavailable')
  const user = shallowRef<User | null>(null)
  const client = shallowRef<ReturnType<typeof createCloudClient> | null>(null)
  const busy = ref(false)
  let unsubscribe: (() => void) | undefined
  let disposed = false, observed = false, selected: string | null = null, running = false, queued = false
  const safeScreen = () => engine.ui.mode === 'menu' || engine.ui.mode === 'result'

  async function sync(restoreOnly = false): Promise<void> {
    if (disposed || !observed || !client.value || !engine.cloudWallet || !safeScreen()) return
    if (running) { queued = true; return }
    const account = user.value
    const uid = account?.uid ?? null
    if (uid !== selected) {
      if (!engine.cloudWallet.select(uid)) { status.value = 'error'; return }
      selected = uid
    }
    if (!uid) { status.value = 'guest'; return }
    const state = engine.ui.metaState
    if (!state) { status.value = 'error'; return }
    running = true
    status.value = 'syncing'
    try {
      const result = await client.value.sync(uid, state.cloudWallet ?? null, state.embers, restoreOnly)
      if (disposed || user.value?.uid !== uid || selected !== uid) return
      if (result.kind === 'conflict') { status.value = 'conflict'; return }
      const applied = engine.cloudWallet.apply(result.wallet, state.embers, result.kind === 'upload')
      if (!applied) { status.value = 'error'; return }
      status.value = 'synced'
      if (engine.ui.metaState?.embers !== result.wallet.embers) queued = true
    } catch {
      if (!disposed && user.value?.uid === uid) status.value = 'error'
    } finally {
      running = false
      if (queued || (user.value?.uid ?? null) !== selected) {
        queued = false
        if (!disposed && status.value !== 'conflict') void sync()
      }
    }
  }
  async function login(): Promise<void> {
    if (!client.value || busy.value || running) return
    busy.value = true
    try { await client.value.login() }
    catch (error) {
      const code = (error as { code?: string })?.code
      status.value = code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ? 'guest' : 'error'
    } finally { busy.value = false }
  }
  async function logout(): Promise<void> {
    if (!client.value || busy.value || running) return
    busy.value = true
    try { await client.value.logout() }
    catch { status.value = 'error' }
    finally { busy.value = false }
  }
  const online = () => { if (status.value !== 'conflict') void sync() }
  onMounted(async () => {
    if (!config || !engine.cloudWallet) return
    try {
      const { createCloudClient: create } = await import('./firebase-wallet')
      if (disposed) return
      const instance = create(config)
      client.value = instance
      unsubscribe = instance.watch(account => {
        observed = true
        user.value = account
        void sync()
      }, () => { status.value = 'error' })
      window.addEventListener('online', online)
    } catch { if (!disposed) status.value = 'error' }
  })
  watch(() => [engine.ui.mode, engine.ui.profile.embers] as const, () => {
    if (status.value !== 'conflict' || (user.value?.uid ?? null) !== selected) void sync()
  })
  onBeforeUnmount(() => {
    disposed = true
    unsubscribe?.()
    if (typeof window !== 'undefined') window.removeEventListener('online', online)
  })
  return { status, user, busy: computed(() => busy.value || status.value === 'syncing' || status.value === 'loading'),
    available: computed(() => !!client.value && observed), login, logout, sync }
}
