import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMetaState } from '../../../game/content/meta/state'
import ProgressionPanel from './ProgressionPanel.vue'

describe('ES2 v3 progression UI adapter', () => {
  it('renders immutable researched ranks, wallet, mastery, and achievement status', () => {
    const state = createMetaState()
    state.embers = 300
    state.mastery.knight = { xp: 900, level: 3 }
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    expect(wrapper.text()).toContain('300')
    expect(wrapper.text()).toContain('攻擊研究')
    expect(wrapper.text()).toContain('英雄專精')
    expect(wrapper.text()).toContain('永久成就')
    expect(wrapper.text()).toContain('騎士')
    expect(wrapper.find('[data-research="insight"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-equipment="knight-aegis"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-bonus="ember-spark"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('never mutates profile in-place; emits typed purchase intents only', async () => {
    const state = { ...createMetaState(), embers: 400 }
    const original = structuredClone(state)
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-research="power"]').trigger('click')
    expect(wrapper.emitted('research')).toEqual([['power']])
    expect(state).toEqual(original)
    wrapper.unmount()
  })

  it('disables spending while blocked or pending and displays durable-save warning', async () => {
    const state = { ...createMetaState(), embers: 900 }
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'blocked' } })
    expect(wrapper.get('[role="alert"]').text()).toContain('儲存')
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ status: 'ready', busy: true })
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ busy: false })
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('provides unlocked and locked achievements plus mobile-readable sections', () => {
    const state = createMetaState()
    state.achievements.push('first-victory')
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'ranger', status: 'ready' } })
    expect(wrapper.get('[data-achievement="first-victory"]').text()).toContain('已達成')
    expect(wrapper.get('[data-achievement="monster-hunter"]').text()).toContain('未達成')
    expect(wrapper.findAll('section[aria-label]')).toHaveLength(4)
    wrapper.unmount()
  })
})
