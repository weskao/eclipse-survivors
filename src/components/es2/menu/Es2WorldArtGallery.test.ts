import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { setLocale } from '../../../i18n'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import Es2Archive from './Es2Archive.vue'

const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => setLocale('zh-TW', storage))
const fakeDialog = { template: '<div><slot /></div>' }
const render = (view: 'monsters' | 'achievements') => mount(Es2Archive, {
  props: { active: true, view, profile: emptyProfile(), hero: 'knight' },
  global: { stubs: { Es2Dialog: fakeDialog } },
})

describe('ES2 accessible in-game world-art gallery', () => {
  it('shows all ten new enemies with attack previews, all four bosses and all four biomes', () => {
    const wrapper = render('monsters')
    expect(wrapper.findAll('[data-es2-world-enemy]')).toHaveLength(10)
    expect(wrapper.findAll('[data-es2-world-telegraph]')).toHaveLength(10)
    expect(wrapper.findAll('[data-es2-world-boss]')).toHaveLength(4)
    expect(wrapper.findAll('[data-es2-world-biome]')).toHaveLength(4)
    expect(wrapper.text()).toContain('尚待美術驗收')
    wrapper.unmount()
  })

  it('displays all 17 review-state UI illustrations without awarding achievements', () => {
    const wrapper = render('achievements')
    expect(wrapper.findAll('[data-es2-world-ui]')).toHaveLength(17)
    expect(wrapper.text()).toContain('已通過人工美術驗收')
    wrapper.unmount()
  })

  it('shows localized names for all 17 UI art assets, with stable IDs retained for QA selectors', async () => {
    const items: [string, string, string][] = [
      ['treasure-common', '普通寶箱', 'Common Chest'],
      ['treasure-rare', '稀有寶箱', 'Rare Chest'],
      ['treasure-legendary', '傳說寶箱', 'Legendary Chest'],
      ['treasure-cursed', '詛咒寶箱', 'Cursed Chest'],
      ['rarity-common', '普通品質徽記', 'Common Rarity Badge'],
      ['rarity-rare', '稀有品質徽記', 'Rare Rarity Badge'],
      ['rarity-legendary', '傳說品質徽記', 'Legendary Rarity Badge'],
      ['hud-health', '生命值圖示', 'Health HUD Icon'],
      ['hud-xp', '經驗值圖示', 'Experience HUD Icon'],
      ['hud-cooldown', '冷卻時間圖示', 'Cooldown HUD Icon'],
      ['hud-quest', '任務目標圖示', 'Quest HUD Icon'],
      ['achievement-boss', '首領討伐徽章', 'Boss Slayer Badge'],
      ['achievement-survivor', '生存達人徽章', 'Survivor Badge'],
      ['achievement-evolution', '能力進化徽章', 'Evolution Badge'],
      ['achievement-explorer', '冒險探索徽章', 'Explorer Badge'],
      ['achievement-collector', '收藏家徽章', 'Collector Badge'],
      ['achievement-flawless', '完美挑戰徽章', 'Flawless Badge'],
    ]
    setLocale('zh-TW', storage)
    const wrapper = render('achievements')
    for (const [id, chinese] of items) {
      const card = wrapper.get(`[data-es2-world-ui="${id}"]`)
      expect(card.get('strong').text(), id).toBe(chinese)
      expect(card.get('img').attributes('alt'), id).toBe(chinese + ' 裝飾圖案')
      expect(card.attributes('data-es2-world-ui')).toBe(id)
    }
    expect(wrapper.text()).toContain('已通過人工美術驗收')

    setLocale('en', storage)
    await nextTick()
    for (const [id, , english] of items) {
      const card = wrapper.get(`[data-es2-world-ui="${id}"]`)
      expect(card.get('strong').text(), id).toBe(english)
      expect(card.get('img').attributes('alt'), id).toBe(english + ' decorative artwork')
    }
    expect(wrapper.text()).toContain('passed human visual review')
    wrapper.unmount()
  })
})
