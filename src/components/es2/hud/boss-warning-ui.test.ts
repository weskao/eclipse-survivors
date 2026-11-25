import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyHud } from '../../../game/store'
import CombatHud from './CombatHud.vue'
import { t } from '../../../i18n'
import { BOSS_DEFINITIONS } from '../../../game/content/bosses/definitions'

const mountHud = (seconds: number, name = 'Frost Sovereign', color = '#9cddff') => mount(CombatHud, {
  props: {
    active: true, choice: 'knight', hud: emptyHud(),
    actions: { pause: vi.fn(), settings: vi.fn() },
    feed: { bossWarning: {
      name, seconds, progress: (15 - seconds) / 15,
      urgent: seconds <= 5, color,
    } },
  },
})

describe('responsive boss arrival warning', () => {
  it.each(Object.values(BOSS_DEFINITIONS))('uses $title accent in both warning states', ({ title, color }) => {
    for (const seconds of [12, 4]) {
      const wrapper = mountHud(seconds, title, color)
      try {
        const warning = wrapper.get('[data-es2-boss-warning]')
        expect(warning.text()).toContain(t(title))
        expect((warning.element as HTMLElement).style.getPropertyValue('--es2-warning-accent')).toBe(color)
      } finally { wrapper.unmount() }
    }
  })
  it('is informational and accessible, with no gameplay-blocking controls', async () => {
    const wrapper = mountHud(12)
    try {
      const warning = wrapper.get('[data-es2-boss-warning]')
      expect(warning.text()).toContain(t('Frost Sovereign'))
      expect(warning.text()).toContain('12')
      expect(warning.find('button').exists()).toBe(false)
      expect(warning.attributes('aria-label')).toContain('12')
      expect(warning.classes()).not.toContain('es2-hud__boss-warning--urgent')
    } finally { wrapper.unmount() }
  })

  it('intensifies only in the final five seconds and disappears when a boss takes over', async () => {
    const wrapper = mountHud(4)
    try {
      expect(wrapper.get('[data-es2-boss-warning]').classes()).toContain('es2-hud__boss-warning--urgent')
      await wrapper.setProps({ hud: { ...emptyHud(), bossPct: 80 } })
      expect(wrapper.find('[data-es2-boss-warning]').exists()).toBe(false)
      expect(wrapper.find('[data-es2-boss]').exists()).toBe(true)
    } finally { wrapper.unmount() }
  })
})
