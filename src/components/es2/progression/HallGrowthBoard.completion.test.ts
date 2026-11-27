import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { getLocale, setLocale } from '../../../i18n'
import HallGrowthBoard from './HallGrowthBoard.vue'
import type { HallNode } from './hall-model'

const node = (id: string, rank: number, maxRank = 5, extra: Partial<HallNode> = {}): HallNode => ({
  id, kind: 'research', title: id, description: id, art: '/test.svg', rank, maxRank,
  cost: rank === maxRank ? null : 25, locked: false, canBuy: rank < maxRank,
  requires: [], requirements: [], ...extra,
})

describe('Hall completed skill medallions', () => {
  it('marks actual maximum ranks, not locked or unavailable prices, and distinguishes single unlocks', async () => {
    const locale = getLocale()
    setLocale('zh-TW')
    const wrapper = mount(HallGrowthBoard, { props: { nodes: [
      node('full', 5), node('almost', 4), node('unavailable', 0, 5, { cost: null, locked: true, canBuy: false }),
      node('signature', 1, 1), node('unowned', 0, 1),
    ], writable: false, preview: true } })
    try {
      const full = wrapper.get('[data-hall-node="full"]')
      expect(full.attributes('data-hall-completion')).toBe('mastered')
      expect(full.find('.hall-completion-crest').exists()).toBe(true)
      expect(full.get('.hall-rank').text()).toBe('MAX')
      expect(full.get('.hall-status').text()).toBe('已滿階')
      expect(full.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('5')
      expect(wrapper.get('[data-hall-node="almost"]').attributes('data-hall-completion')).toBe('none')
      expect(wrapper.get('[data-hall-node="unavailable"]').attributes('data-state')).toBe('locked')
      expect(wrapper.get('[data-hall-node="signature"]').attributes('data-hall-completion')).toBe('unlocked')
      expect(wrapper.get('[data-hall-node="signature"] .hall-rank').text()).toBe('1 / 1')
      expect(wrapper.findAll('.hall-completion-crest')).toHaveLength(2)
      expect(wrapper.findAll('[data-hall-upgraded]')).toHaveLength(0)
      await wrapper.get('[data-hall-inspect="full"]').trigger('click')
      expect(wrapper.get('[data-hall-detail-completion]').attributes('data-hall-detail-completion')).toBe('mastered')
      expect(wrapper.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
      await wrapper.get('[data-hall-confirm]').trigger('click')
      expect(wrapper.emitted('purchase')).toBeUndefined()
      setLocale('en')
      await wrapper.vm.$nextTick()
      expect(full.get('.hall-status').text()).not.toBe('已滿階')
    } finally { wrapper.unmount(); setLocale(locale) }
  })

  it('celebrates a committed final purchase once, then retains the permanent crest without replaying on reload', async () => {
    vi.useFakeTimers()
    const wrapper = mount(HallGrowthBoard, { props: { nodes: [node('power', 4)] } })
    try {
      await wrapper.get('[data-hall-confirm]').trigger('click')
      expect(wrapper.emitted('purchase')).toHaveLength(1)
      expect(wrapper.find('.hall-completion-crest').exists()).toBe(false)
      await wrapper.setProps({ nodes: [node('power', 5)] })
      expect(wrapper.get('[data-hall-upgraded="power"]').attributes('data-milestone')).toBe('true')
      expect(wrapper.get('[data-hall-node="power"]').attributes('data-hall-completion')).toBe('mastered')
      expect(wrapper.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
      vi.advanceTimersByTime(1800)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-hall-upgraded]').exists()).toBe(false)
      expect(wrapper.find('.hall-completion-crest').exists()).toBe(true)
      await wrapper.setProps({ nodes: [node('power', 5)] })
      expect(wrapper.find('[data-hall-upgraded]').exists()).toBe(false)
      await wrapper.setProps({ nodes: [node('power', 3)] })
      expect(wrapper.find('.hall-completion-crest').exists()).toBe(false)
    } finally { wrapper.unmount(); vi.useRealTimers() }
  })
})

it.each(['keystone','signature','resonance'] as const)('plays a distinct %s ceremony only after committed ownership',async talentType=>{
  vi.useFakeTimers()
  const wrapper=mount(HallGrowthBoard,{props:{nodes:[node('special',0,1,{talentType})]}})
  try{
    await wrapper.get('[data-hall-confirm]').trigger('click')
    expect(wrapper.find('[data-hall-ritual]').exists()).toBe(false)
    await wrapper.setProps({nodes:[node('special',1,1,{talentType})]})
    expect(wrapper.get('[data-hall-ritual]').attributes('data-hall-ritual')).toBe(talentType)
    expect(wrapper.findAll('.hall-ritual-ray')).toHaveLength(2)
    vi.advanceTimersByTime(1800)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-hall-ritual]').exists()).toBe(false)
  }finally{wrapper.unmount();vi.useRealTimers()}
})
