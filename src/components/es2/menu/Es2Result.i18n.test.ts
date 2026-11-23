import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setLocale, t } from '../../../i18n'
import type { RunStats } from '../../../meta/types'
import Es2Result from './Es2Result.vue'

const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => { setLocale('zh-TW', storage); document.body.innerHTML = '' })

const result = {
  id: 'localization-01', mode: 'quick', hero: 'knight', victory: true,
  seconds: 68, kills: 12, level: 4,
  damageDealt: 2000, damageTaken: 200, remainingHp: 50,
} as RunStats

describe('localized expedition results', () => {
  it('renders a natural English summary and localized reward names, not internal IDs', async () => {
    setLocale('en', storage)
    const wrapper = mount(Es2Result, {
      props: {
        active: true, ending: '🏆 遠征勝利！',
        summary: '存活 68 秒 · 擊敗 12 隻魔物 · 等級 4',
        result,
        rewards: { embers: 20, newAchievements: ['first-blood'], newCosmetics: ['knight-gilded'] },
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.es2-dialog-header p')?.textContent).toContain(
      'Survived 68s · Defeated 12 enemies · Lv.4',
    )
    expect(wrapper.text()).toContain(t('初臨戰場'))
    expect(wrapper.text()).toContain(t('曙光鎏金'))
    expect(wrapper.text()).not.toContain('first-blood')
    expect(wrapper.text()).not.toContain('knight-gilded')
    setLocale('zh-TW', storage)
    await nextTick()
    expect(document.body.querySelector('.es2-dialog-header p')?.textContent).toContain(
      '存活 68 秒 · 擊敗 12 隻魔物 · 等級 4',
    )
    expect(wrapper.text()).toContain('初臨戰場')
    wrapper.unmount()
  })
})
