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
    expect(wrapper.find('[data-hall-node="shadowblade-blade"]').exists()).toBe(true)
    await wrapper.get('[data-es4-tree="synergy"]').trigger('click')
    expect(wrapper.findAll('.hall-map [data-hall-node]')).toHaveLength(6)
    expect(wrapper.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
    expect(state.embers).toBe(50000)
    wrapper.unmount()
  })
})

it('only enables purchase events for a writable isolated V4 state', async () => {
  const state = createMetaState()
  state.version = 4; state.hall = {ownership:{},attunement:{universal:[],hero:{},resonance:null}}
  state.research.power = 1; state.embers = 500
  const wrapper = mount(HallTalentExplorer,{props:{state,hero:'knight',writable:true}})
  await wrapper.get('[data-hall-inspect="offense-edge"]').trigger('click')
  await wrapper.get('[data-hall-confirm]').trigger('click')
  expect(wrapper.emitted('purchase')).toEqual([['offense-edge',0]])
  expect(state.embers).toBe(500)
  await wrapper.setProps({writable:false})
  expect(wrapper.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})

it('distinguishes owned from active resonance and lets any equipped slot be removed', async () => {
  const state=createMetaState()
  state.version=4;state.hall={ownership:{'offense-war-master':1,'synergy-blade-and-bastion':1},attunement:{universal:['offense-war-master'],hero:{},resonance:'synergy-blade-and-bastion'}}
  const wrapper=mount(HallTalentExplorer,{props:{state,hero:'knight',writable:true}})
  const slot=wrapper.get('[data-es4-active-slot="synergy-blade-and-bastion"]')
  expect(slot.text()).toMatch(/條件未滿足|Inactive/)
  await slot.trigger('click')
  expect(wrapper.emitted('attune')).toEqual([[['offense-war-master'],null,null]])
  wrapper.unmount()
})

it('shows current and next contributions without spending or inventing a next rank at MAX', async () => {
  const state=createMetaState()
  state.version=4;state.hall={ownership:{'offense-edge':2},attunement:{universal:[],hero:{},resonance:null}}
  const wrapper=mount(HallTalentExplorer,{props:{state,hero:'knight'}})
  expect(wrapper.get('.hall-comparison').text()).toContain('+2%')
  expect(wrapper.get('.hall-comparison').text()).toContain('+3%')
  await wrapper.setProps({state:{...state,hall:{...state.hall,ownership:{'offense-edge':5}}}})
  expect(wrapper.get('.hall-comparison').text()).toContain('+5%')
  expect(wrapper.findAll('.hall-comparison b')).toHaveLength(1)
  wrapper.unmount()
})

it('jumps from resonance to its prerequisite, then routes original research to the parent', async () => {
  const wrapper=mount(HallTalentExplorer,{props:{state:createMetaState(),hero:'knight'}})
  await wrapper.get('[data-es4-tree="synergy"]').trigger('click')
  await wrapper.get('[data-hall-inspect="synergy-blade-and-bastion"]').trigger('click')
  await wrapper.get('[data-hall-prerequisite="offense-war-master"]').trigger('click')
  expect(wrapper.get('[data-es4-tree="discipline"]').attributes('aria-selected')).toBe('true')
  expect(wrapper.get('[data-es4-discipline="offense"]').attributes('aria-selected')).toBe('true')
  expect(wrapper.get('[data-hall-inspect="offense-war-master"]').attributes('aria-pressed')).toBe('true')
  await wrapper.get('[data-hall-inspect="offense-edge"]').trigger('click')
  await wrapper.get('[data-hall-prerequisite="power"]').trigger('click')
  expect(wrapper.emitted('corePrerequisite')).toEqual([['power']])
  wrapper.unmount()
})
