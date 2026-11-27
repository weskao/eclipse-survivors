import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref, shallowRef, nextTick } from 'vue'
import type { User } from '../../../cloud/firebase-wallet'
import type { useCloudWallet } from '../../../cloud/use-cloud-wallet'
import { setLocale } from '../../../i18n'
import Es2CloudAccount from './Es2CloudAccount.vue'
import Es2Result from './Es2Result.vue'
type Cloud = ReturnType<typeof useCloudWallet>
function fixture() {
  const status = ref<Cloud['status']['value']>('guest')
  const user = shallowRef<User | null>(null)
  const login = vi.fn(async () => {})
  const sync = vi.fn(async () => {})
  const available = ref(true)
  const confirmed = ref(false)
  const signingIn = ref(false)
  const cloud: Cloud = { status, user, login, sync, signingIn, logout: vi.fn(async () => {}), available: computed(() => available.value), busy: computed(() => false), confirmed: computed(() => confirmed.value) }
  return { cloud, status, user, login, sync, available, confirmed, signingIn }
}
afterEach(() => { setLocale('zh-TW'); document.body.innerHTML = '' })
describe('Google OAuth entry points', () => {
  it('replaces the Google entry with the signed-in avatar and opens the existing account dialog', async () => {
    const { cloud, user, status, confirmed, login, sync } = fixture()
    user.value = { uid: 'a', displayName: 'Avery', email: 'avery@example.test', photoURL: 'https://example.test/avatar.png' } as User
    status.value = 'synced'
    confirmed.value = true
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 50 }, attachTo: document.body })
    const button = wrapper.get('[data-es2-cloud-account]')
    expect(button.get('[data-es2-profile-avatar] img').attributes('src')).toBe('https://example.test/avatar.png')
    expect(button.find('.es2-cloud-trigger-label').exists()).toBe(false)
    expect(button.text()).not.toContain('avery@example.test')
    expect(button.get('[data-es2-profile-status]').attributes('data-state')).toBe('synced')
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(login).not.toHaveBeenCalled()
    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Avery')
    expect(dialog.textContent).toContain('avery@example.test')
    expect(dialog.querySelector('.es2-cloud-provider img')?.getAttribute('src')).toMatch(/google-sign-in\.webp/)
    expect(dialog.textContent).toContain('暮光餘燼已同步')
    setLocale('en')
    await nextTick()
    expect(dialog.textContent).toContain('Twilight Embers synced')
    ;(dialog.querySelector('[data-es2-cloud-sync]') as HTMLButtonElement).click()
    expect(sync).toHaveBeenCalledTimes(1)
    ;(dialog.querySelector('[data-es2-cloud-logout]') as HTMLButtonElement).click()
    expect(cloud.logout).toHaveBeenCalledTimes(1)
    user.value = null
    await nextTick()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(button.get('img').attributes('src')).toMatch(/google-sign-in\.webp/)
    wrapper.unmount()
  })
  it('uses a name initial when the photo fails and a new photo when the account changes', async () => {
    const { cloud, user } = fixture()
    user.value = { uid: 'a', displayName: '  星蝕', photoURL: 'https://example.test/broken.png' } as User
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 0 } })
    const avatar = wrapper.get('[data-es2-profile-avatar]')
    await avatar.get('img').trigger('error')
    expect(avatar.find('img').exists()).toBe(false)
    expect(avatar.text()).toBe('星')
    user.value = { uid: 'b', displayName: 'Beta', photoURL: 'https://example.test/new.png' } as User
    await nextTick()
    expect(avatar.get('img').attributes('src')).toBe('https://example.test/new.png')
    user.value = { uid: 'c', email: 'private@example.test', photoURL: null } as User
    await nextTick()
    expect(avatar.text()).toBe('P')
    expect(avatar.find('img').exists()).toBe(false)
    wrapper.unmount()
  })
  it('never shows a confirmed profile status for an unconfirmed save or playtest', async () => {
    const { cloud, user, status, confirmed } = fixture()
    user.value = { uid: 'a' } as User
    status.value = 'synced'
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 0 } })
    const marker = wrapper.get('[data-es2-profile-status]')
    expect(marker.attributes('data-state')).toBe('syncing')
    confirmed.value = true
    await nextTick()
    expect(marker.attributes('data-state')).toBe('synced')
    for (const state of ['error', 'conflict', 'playtest'] as const) {
      status.value = state
      await nextTick()
      expect(marker.attributes('data-state')).toBe(state)
    }
    wrapper.unmount()
  })

  it('opens OAuth directly from the homepage and uses the original local WebP', async () => {
    const { cloud, login } = fixture()
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 50 }, attachTo: document.body })
    const button = wrapper.get('[data-es2-cloud-account]')
    expect(button.get('img').attributes('src')).toMatch(/google-sign-in\.webp/)
    await button.trigger('click')
    expect(login).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })
  it('shows a direct login button inside the result without nesting a second dialog', async () => {
    const { cloud, login } = fixture()
    const wrapper = mount(Es2Result, { props: { active: true, ending: '戰敗', summary: '' },
      slots: { cloud: () => mountSlot(cloud) }, attachTo: document.body })
    await nextTick()
    const button = document.querySelector<HTMLButtonElement>('[data-es2-result-google-login]')!
    expect(button).not.toBeNull()
    button.click()
    await nextTick()
    expect(login).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    wrapper.unmount()
  })
  it('only reports a confirmed cloud save, localizes it and offers retry after failure', async () => {
    const { cloud, status, user, confirmed, sync } = fixture()
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 50, result: true }, attachTo: document.body })
    user.value = { uid: 'a', email: 'a@example.test' } as User
    status.value = 'synced'
    await nextTick()
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).not.toContain('已儲存至')
    confirmed.value = true
    await nextTick()
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).toContain('暮光餘燼已儲存至 Google 帳號')
    setLocale('en')
    await nextTick()
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).toContain('Twilight Embers saved to your Google account.')
    confirmed.value = false
    status.value = 'error'
    await nextTick()
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).not.toContain('saved to your Google account')
    await wrapper.get('[data-es2-result-cloud-retry]').trigger('click')
    expect(sync).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-es2-result-google-login]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('does not claim a live save or offer sync for unlocked phone sign-in', async () => {
    const { cloud, status, user } = fixture()
    status.value = 'playtest'
    user.value = { uid: 'test' } as User
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 100_000, result: true } })
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).toContain('測試模式')
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).not.toContain('已儲存至')
    expect(wrapper.find('[data-es2-result-cloud-retry]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('keeps Google login clickable while a closed popup is still pending in Firebase', async () => {
    const { cloud, login, signingIn } = fixture()
    signingIn.value = true
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 0 } })
    const button = wrapper.get('[data-es2-cloud-account]')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    expect(login).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
  it('does not launch OAuth when Firebase is unavailable', async () => {
    const { cloud, available, login, status } = fixture()
    available.value = false
    status.value = 'unavailable'
    const wrapper = mount(Es2CloudAccount, { props: { cloud, embers: 0, result: true } })
    expect(wrapper.get('[data-es2-result-google-login]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-es2-result-google-login]').trigger('click')
    expect(login).not.toHaveBeenCalled()
    expect(wrapper.get('[data-es2-result-cloud-status]').text()).toContain('雲端存檔尚未設定')
    wrapper.unmount()
  })
})
import { h } from 'vue'
function mountSlot(cloud: Cloud) { return h(Es2CloudAccount, { cloud, embers: 50, result: true }) }
