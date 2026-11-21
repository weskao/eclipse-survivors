import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyHud } from '../game/store'
import { UP } from '../game/constants'
import GameHud from './GameHud.vue'
import LevelUpOverlay from './LevelUpOverlay.vue'

describe('equipped skill HUD', () => {
  const props = { active: true, choice: 'knight' as const, musicOn: true, sfxOn: true, toastText: '', toastVisible: false }
  it('renders only the skills equipped, levels, evolved status and cooldown', async () => {
    const hud = { ...emptyHud(), skills: [{ id: 'frost' as const, icon: '❄', title: '極寒新星', rarity: 'rare' as const, level: 3, maxLevel: 5, cooldown: 2, cooldownPct: 50, evolved: false }, { id: 'frozen-thunderstorm' as const, icon: '✶', title: '冰霜雷暴', rarity: 'legendary' as const, level: 1, maxLevel: 1, cooldown: 1, cooldownPct: 25, evolved: true }] }
    const w = mount(GameHud, { props: { ...props, hud } })
    expect(w.findAll('.skill-slots .skill')).toHaveLength(2)
    expect(w.find('.skill[data-skill="frost"]').text()).toContain('3')
    expect(w.find('.skill[data-skill="frozen-thunderstorm"]').classes()).toContain('evolved')
    expect(w.find('.skill[data-skill="frost"] .skill-cooldown').attributes('style')).toContain('50%')
    await w.setProps({ hud: emptyHud() })
    expect(w.findAll('.skill-slots .skill')).toHaveLength(0)
  })
})

describe('upgrade cards', () => {
  it('displays rarity, current to next skill level and evolution requirements', () => {
    const picks = [
      { ...UP[0]!, level: 2, maxLevel: 5 },
      { id: 'frozen-thunderstorm' as const, icon: '✶', title: '冰霜雷暴', desc: '冷卻 4.4 秒', rarity: 'legendary' as const, level: 0, maxLevel: 1, requirements: '極寒新星 Lv.3 + 連鎖雷擊 Lv.3', isEvolution: true },
    ]
    const w = mount(LevelUpOverlay, { props: { active: true, upgrades: picks } })
    expect(w.find('.upgrade[data-up="damage"]').text()).toContain('Lv.2 → 3')
    expect(w.find('.upgrade[data-up="frozen-thunderstorm"]').text()).toContain('傳說')
    expect(w.find('.upgrade[data-up="frozen-thunderstorm"]').text()).toContain('極寒新星 Lv.3')
    expect(w.find('.upgrade[data-up="frozen-thunderstorm"]').classes()).toContain('legendary')
  })
})
