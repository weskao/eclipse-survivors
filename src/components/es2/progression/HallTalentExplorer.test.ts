import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMetaState } from '../../../game/content/meta/state'
import HallTalentExplorer from './HallTalentExplorer.vue'

describe('ES4 talent explorer', () => {
  it('preserves one graph and inspector, with compact discipline, hero and resonance navigation', async () => {
    const state = createMetaState()
    state.embers = 50000
    const wrapper = mount(HallTalentExplorer, {props:{state,hero:'knight'}})
    expect(wrapper.findAll('[data-es4-discipline]')).toHaveLength(6)
    expect(wrapper.findAll('.hall-map [data-hall-node]')).toHaveLength(6)
    expect(wrapper.findAll('[data-hall-confirm]')).toHaveLength(1)
    expect(wrapper.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-es4-tree="hero"]').trigger('click')
    expect(wrapper.findAll('[data-es4-discipline]')).toHaveLength(6)
    expect(wrapper.findAll('.hall-map [data-hall-node]')).toHaveLength(5)
    await wrapper.get('[data-es4-discipline="shadowblade"]').trigger('click')
    expect(wrapper.get('[data-hall-node="shadowblade-blade"]').exists()).toBe(true)
    await wrapper.get('[data-es4-tree="synergy"]').trigger('click')
    expect(wrapper.findAll('.hall-map [data-hall-node]')).toHaveLength(6)
    expect(wrapper.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
    expect(state.embers).toBe(50000)
    wrapper.unmount()
  })
})
