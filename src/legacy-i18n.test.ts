import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setLocale } from './i18n'
import SettingsButton from './components/SettingsButton.vue'
import ModeSelector from './components/modes/ModeSelector.vue'
import LevelUpOverlay from './components/LevelUpOverlay.vue'

const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => setLocale('zh-TW', storage))

describe('existing screens remain bilingual', () => {
  it('updates the existing settings trigger when the player switches language', async () => {
    setLocale('zh-TW', storage)
    const wrapper = mount(SettingsButton)
    expect(wrapper.get('button').attributes('aria-label')).toBe('開啟遊戲設定')
    setLocale('en', storage)
    await nextTick()
    expect(wrapper.get('button').attributes('aria-label')).toBe('Open game settings')
    expect(wrapper.text()).toContain('Settings')
    wrapper.unmount()
  })

  it('translates the legacy mode selector and level-up copy without changing gameplay IDs', async () => {
    setLocale('en', storage)
    const mode = mount(ModeSelector, { props: { value: 'quick' } })
    const level = mount(LevelUpOverlay, { props: { active: true, upgrades: [] } })
    await nextTick()
    expect(mode.text()).toContain('Swift Expedition')
    expect(mode.find('[data-mode="quick"]').exists()).toBe(true)
    expect(level.text()).toContain('A New Mark of Destiny')
    mode.unmount()
    level.unmount()
  })
})
