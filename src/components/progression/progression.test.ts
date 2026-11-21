import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModeSelector from '../modes/ModeSelector.vue'
import ProgressionPanel from './ProgressionPanel.vue'
import ResultOverlay from '../ResultOverlay.vue'
import { emptyProfile } from '../../meta/profile'

describe('progression and mode controls', () => {
  it('emits mode choice and reflects current selection', async () => {
    const w = mount(ModeSelector, { props: { value: 'quick' } })
    const buttons = w.findAll('[role="radio"]')
    expect(buttons).toHaveLength(4)
    expect(buttons[0]?.attributes('aria-checked')).toBe('true')
    await buttons[2]!.trigger('click')
    expect(w.emitted('select')).toEqual([['endless']])
  })
  it('shows the profile and requires two actions to reset', async () => {
    const p = emptyProfile()
    p.embers = 100
    const w = mount(ProgressionPanel, { props: { profile: p, hero: 'knight' } })
    expect(w.text()).toContain('冒險者殿堂')
    expect(w.text()).toContain('魔物圖鑑')
    await w.find('.progression-upgrade button').trigger('click')
    expect(w.emitted('purchase')).toEqual([['power']])
    await w.find('.progression-reset>.ghost').trigger('click')
    expect(w.emitted('reset')).toBeUndefined()
    await w.find('.reset-confirm button').trigger('click')
    expect(w.emitted('reset')).toHaveLength(1)
  })
  it('renders detailed run statistics with the original result buttons', async () => {
    const w = mount(ResultOverlay, { props: {
      active: true, ending: '勝利', summary: '總結', runResult: {
        id: 'u1', mode: 'quick', hero: 'knight', victory: true, seconds: 151, kills: 60, level: 9,
        damageDealt: 3456, damageTaken: 80, remainingHp: 40, bossDefeated: true,
        enemies: { slime: 59, boss: 1 }, abilities: ['orb', 'frost'],
      }, rewards: { embers: 40, newAchievements: ['first-victory'], newCosmetics: ['knight-gilded'] },
    } })
    expect(w.findAll('.result-stats>div')).toHaveLength(6)
    expect(w.text()).toContain('02:31')
    expect(w.text()).toContain('3,456')
    expect(w.text()).toContain('破曉之光')
    await w.find('#again').trigger('click')
    await w.find('#home').trigger('click')
    expect(w.emitted('again')).toHaveLength(1)
    expect(w.emitted('home')).toHaveLength(1)
  })
})
