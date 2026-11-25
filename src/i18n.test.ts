import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { currentLocale, detectLocale, resolveInitialLocale, setLocale, t } from './i18n'
import Es2Settings from './components/es2/menu/Es2Settings.vue'

const storage = () => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

afterEach(() => setLocale('zh-TW', storage()))

describe('language preference', () => {
  it('chooses first supported system language and defaults to English', () => {
    expect(detectLocale(['fr-FR', 'zh-HK', 'en-US'])).toBe('zh-TW')
    expect(detectLocale(['en-US', 'zh-TW'])).toBe('en')
    expect(detectLocale(['fr-FR'])).toBe('en')
  })

  it('prefers a valid saved choice to system, ignoring corrupted storage', () => {
    const s = storage()
    expect(resolveInitialLocale(s, ['zh-TW'])).toBe('zh-TW')
    s.setItem('eclipse-survivors-locale', 'en')
    expect(resolveInitialLocale(s, ['zh-TW'])).toBe('en')
    s.setItem('eclipse-survivors-locale', 'invalid')
    expect(resolveInitialLocale(s, ['zh-TW'])).toBe('zh-TW')
  })

  it('only saves explicit choices and survives unavailable storage', () => {
    const s = storage()
    expect(s.data.size).toBe(0)
    setLocale('en', s)
    expect(s.getItem('eclipse-survivors-locale')).toBe('en')
    expect(currentLocale.value).toBe('en')
    expect(t('遊戲設定')).toBe('Game Settings')
    expect(() => setLocale('zh-TW', {
      getItem: () => { throw Error('blocked') },
      setItem: () => { throw Error('blocked') },
    })).not.toThrow()
    expect(t('遊戲設定')).toBe('遊戲設定')
    expect(t('Dawnsteel Knight')).toBe('曙鋼騎士')
  })
})

describe('live language switching', () => {
  it('localizes the hero low-health setting and description', () => {
    setLocale('en', storage())
    expect(t('英雄低血量警示')).toBe('Low Health Warning')
    expect(t('血量偏低時顯示畫面邊緣、英雄資訊框及危急警示')).toBe('Highlight screen edges and the hero HUD when health is low')
    setLocale('zh-TW', storage())
    expect(t('英雄低血量警示')).toBe('英雄低血量警示')
    expect(t('血量偏低時顯示畫面邊緣、英雄資訊框及危急警示')).toBe('血量偏低時顯示畫面邊緣、英雄資訊框及危急警示')
  })
  it('switches settings without page reload and persists the selected language', async () => {
    const s = storage()
    setLocale('zh-TW', s)
    const wrapper = mount(Es2Settings, { props: { active: true, upgradeEffect: 'soft', cameraShake: false } })
    expect(document.body.textContent).toContain('遊戲設定')
    const select = document.querySelector<HTMLButtonElement>('#es2-language')!
    expect(select).not.toBeNull()
    select.click()
    await nextTick()
    document.querySelector<HTMLElement>('[data-es2-value="en"]')!.click()
    await nextTick()
    expect(document.body.textContent).toContain('Game Settings')
    expect(s.getItem('eclipse-survivors-locale')).toBe('zh-TW')
    expect(currentLocale.value).toBe('en')
    wrapper.unmount()
  })
})
