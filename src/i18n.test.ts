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
  })
})

describe('live language switching', () => {
  it('switches settings without page reload and persists the selected language', async () => {
    const s = storage()
    setLocale('zh-TW', s)
    const wrapper = mount(Es2Settings, { props: { active: true, upgradeEffect: 'soft', cameraShake: false } })
    expect(wrapper.text()).toContain('遊戲設定')
    const select = wrapper.get<HTMLSelectElement>('#es2-language')
    await select.setValue('en')
    await nextTick()
    expect(wrapper.text()).toContain('Game Settings')
    expect(s.getItem('eclipse-survivors-locale')).toBe('zh-TW')
    expect(currentLocale.value).toBe('en')
    wrapper.unmount()
  })
})
