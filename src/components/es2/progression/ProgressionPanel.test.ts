import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { BALANCE } from '../../../game/config'
import { getLocale, setLocale } from '../../../i18n'
import { buyResearch } from '../../../game/content/meta/progression'
import { createMetaState } from '../../../game/content/meta/state'
import ProgressionPanel from './ProgressionPanel.vue'

describe('ES2 v3 progression UI adapter', () => {
  it('formats research and starting bonus values from the JSON in both locales', () => {
    const language = getLocale()
    const state = createMetaState()
    const expected = Math.round(BALANCE.meta.research.power.benefitPerRank * 100)
    try {
      setLocale('zh-TW')
      let wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
      expect(wrapper.text()).toContain(`每級 +${expected}% 起始攻擊`)
      setLocale('en')
      wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
      expect(wrapper.text()).toContain(`+${expected}% starting attack per rank`)
    } finally {
      setLocale(language)
    }
  })

  it('shows all five research ranks and permits the fifth purchase before showing max rank', async () => {
    const state = createMetaState()
    state.embers = 50_000
    for (const id of Object.keys(BALANCE.meta.research)) state.research[id] = 4
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    for (const id of Object.keys(BALANCE.meta.research)) {
      const button = wrapper.get(`[data-research="${id}"]`)
      expect(button.attributes('disabled'), id).toBeUndefined()
      expect(button.element.closest('article')?.textContent, id).toContain('4 / 5')
    }
    const maxState = structuredClone(state)
    for (const id of Object.keys(BALANCE.meta.research)) maxState.research[id] = 5
    await wrapper.setProps({ state: maxState })
    for (const id of Object.keys(BALANCE.meta.research)) {
      const button = wrapper.get(`[data-research="${id}"]`)
      expect(button.attributes('disabled'), id).toBeDefined()
      expect(button.element.closest('article')?.textContent, id).toContain('5 / 5')
    }
    wrapper.unmount()
  })

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

describe('Adventurer Hall growth routes', () => {
  it('displays actual prerequisites, current/next benefit and the rank ring without spending on inspection', async () => {
    const state = createMetaState()
    state.embers = 200
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    expect(wrapper.findAll('[data-hall-edge]')).toHaveLength(4)
    expect(wrapper.get('[data-hall-edge="power:insight"]').attributes('data-active')).toBe('false')
    await wrapper.get('[data-hall-inspect="power"]').trigger('click')
    expect(wrapper.get('[data-hall-detail]').text()).toContain('+4%')
    expect(wrapper.get('[data-hall-node="power"] img').attributes('src')).toContain('damage@3x.webp')
    expect(wrapper.get('[data-hall-node="power"] [role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    expect(wrapper.emitted('research')).toBeUndefined()
    await wrapper.get('[data-hall-inspect="insight"]').trigger('click')
    expect(wrapper.get('[data-hall-detail]').text()).toContain('攻擊研究')
    expect(wrapper.get('[data-research="insight"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('animates only a committed rank increase and lights the real unlocked connection', async () => {
    const state = createMetaState()
    state.embers = 200
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-research="power"]').trigger('click')
    expect(wrapper.find('[data-hall-upgraded]').exists()).toBe(false)
    const result = buyResearch(state, 'power')
    expect(result.ok).toBe(true)
    await wrapper.setProps({ state: result.state })
    expect(wrapper.find('[data-hall-upgraded="power"]').exists()).toBe(true)
    expect(wrapper.get('[data-hall-edge="power:insight"]').attributes('data-active')).toBe('true')
    expect(wrapper.get('[data-hall-edge="power:insight"]').attributes('data-revealed')).toBe('true')
    expect(wrapper.get('[data-hall-node="power"] .hall-ring').attributes('style')).toContain('20%')
    expect(wrapper.get('[data-hall-upgraded="power"]').attributes('data-milestone')).toBe('false')
    expect(wrapper.find('[data-hall-edge="vitality:scavenging"][data-revealed="true"]').exists()).toBe(false)
    expect(wrapper.get('[data-research="insight"]').attributes('disabled')).toBeUndefined()
    expect(state.research.power).toBe(0)
    wrapper.unmount()
  })
})

describe('Hall upgrade motion', () => {
  it('celebrates reaching the cap without replaying unrelated branches or spending on inspection', async () => {
    const state = createMetaState()
    state.embers = 50000
    state.research.power = 4
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-hall-inspect="power"]').trigger('click')
    expect(wrapper.find('[data-hall-upgraded]').exists()).toBe(false)
    await wrapper.get('[data-research="power"]').trigger('click')
    await wrapper.setProps({ state: buyResearch(state, 'power').state })
    expect(wrapper.get('[data-hall-upgraded="power"]').attributes('data-milestone')).toBe('true')
    expect(wrapper.get('[data-hall-node="power"] .hall-ring').attributes('style')).toContain('100%')
    expect(wrapper.find('[data-hall-edge][data-revealed="true"]').exists()).toBe(false)
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
