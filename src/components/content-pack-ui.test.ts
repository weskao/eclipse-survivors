import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LevelUpOverlay from './LevelUpOverlay.vue'
import GameHud from './GameHud.vue'
import { emptyHud } from '../game/store'
import type { UpgradeDef } from '../game/types'

const optionalAbility: UpgradeDef = {
  id: 'arcane:blast', icon: '✦', title: 'Arcane Blast', desc: 'Magical attack',
  rarity: 'rare', maxLevel: 3, level: 1,
}

describe('content pack ability art fallback', () => {
  it('shows the glyph without requesting a nonexistent built-in upgrade SVG', () => {
    const wrapper = mount(LevelUpOverlay, { props: { active: true, upgrades: [optionalAbility] } })
    expect(wrapper.find('.upgrade .portrait').text()).toContain('✦')
    expect(wrapper.find('.upgrade .portrait img').exists()).toBe(false)
  })

  it('renders a supplied optional pack asset instead of synthesizing a built-in path', () => {
    const wrapper = mount(LevelUpOverlay, { props: {
      active: true, upgrades: [{ ...optionalAbility, iconSrc: './assets/arcane-blast.webp' }],
    } })
    expect(wrapper.find('.upgrade .portrait img').attributes('src')).toBe('./assets/arcane-blast.webp')
  })

  it('shows an owned optional ability in the HUD without broken artwork', () => {
    const hud = emptyHud()
    hud.skills = [{ id: 'arcane:blast', icon: '✦', title: 'Arcane Blast', rarity: 'rare',
      level: 1, maxLevel: 3, cooldown: 0, cooldownPct: 0, evolved: false }]
    const wrapper = mount(GameHud, { props: {
      active: true, hud, choice: 'knight', musicOn: false, sfxOn: false,
      toastText: '', toastVisible: false,
    } })
    expect(wrapper.find('[data-skill="arcane:blast"] .skill-sigil').text()).toContain('✦')
    expect(wrapper.find('[data-skill="arcane:blast"] .skill-sigil img').exists()).toBe(false)
  })
})
