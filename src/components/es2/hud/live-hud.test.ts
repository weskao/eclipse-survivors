import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { emptyHud } from '../../../game/store'
import CombatHud from './CombatHud.vue'

const mounted: Array<{ unmount(): void }> = []
afterEach(() => { for (const wrapper of mounted.splice(0)) wrapper.unmount(); document.body.innerHTML = '' })

function render() {
  const wrapper = mount(CombatHud, {
    attachTo: document.body,
    props: {
      active: true, choice: 'knight' as const, hud: {
        ...emptyHud(), skills: [{ id: 'bolt' as const, icon: '⚡', title: '雷擊', rarity: 'rare' as const,
          level: 2, maxLevel: 5, cooldown: 1.3, cooldownPct: 50, evolved: false }],
      },
      expectedFeed: { runId: 'run-1', sequence: 1 },
      feed: {
        snapshot: { runId: 'run-1', sequence: 1 },
        wave: { number: 2, announcement: '魔物進攻' },
        notices: [{ id: 'n1', kind: 'treasure' as const, text: '獲得聖物' }],
      },
      actions: { pause: vi.fn(), settings: vi.fn() },
    },
  })
  mounted.push(wrapper)
  return wrapper
}

describe('HUD live update, focus and announcements', () => {
  it('announces the latest real notice exactly once without duplicating a live region', async () => {
    const wrapper = render()
    expect(wrapper.findAll('[aria-live="polite"]')).toHaveLength(1)
    expect(wrapper.get('[data-es2-announcement]').text()).toBe('獲得聖物')
    expect(wrapper.get('[data-es2-wave]').text()).toContain('2')
    await wrapper.setProps({ feed: {
      snapshot: { runId: 'run-1', sequence: 2 }, wave: { number: 3, announcement: '新的波次' },
      notices: [{ id: 'n2', kind: 'message', text: '下一波來臨' }],
    }, expectedFeed: { runId: 'run-1', sequence: 2 } })
    expect(wrapper.get('[data-es2-wave]').text()).toContain('3')
    expect(wrapper.get('[data-es2-announcement]').text()).toBe('下一波來臨')
  })

  it('hides stale run and sequence data on the next fresh HUD snapshot', async () => {
    const wrapper = render()
    await wrapper.setProps({ expectedFeed: { runId: 'run-1', sequence: 2 } })
    expect(wrapper.find('[data-es2-wave]').exists()).toBe(false)
    expect(wrapper.find('.es2-hud__notices').exists()).toBe(false)
    expect(wrapper.get('[data-es2-announcement]').text()).toBe('')
    await wrapper.setProps({ expectedFeed: { runId: 'run-2', sequence: 1 } })
    expect(wrapper.find('[data-es2-wave]').exists()).toBe(false)
  })

  it('removes keyboard focus and selected equipment on screen deactivation', async () => {
    const wrapper = render()
    const skill = wrapper.get('[data-es2-skill="bolt"]')
    await skill.trigger('click')
    ;(skill.element as HTMLElement).focus()
    expect(document.activeElement).toBe(skill.element)
    expect(wrapper.find('[data-es2-skill-detail]').exists()).toBe(true)
    await wrapper.setProps({ active: false })
    await nextTick()
    expect(document.activeElement).not.toBe(skill.element)
    expect(wrapper.find('[data-es2-skill-detail]').exists()).toBe(false)
    expect(wrapper.get('[data-es2-announcement]').text()).toBe('')
    await wrapper.setProps({ active: true })
    expect(wrapper.find('[data-es2-skill-detail]').exists()).toBe(false)
    expect(wrapper.find('canvas[aria-label="戰場小地圖"]').exists()).toBe(true)
  })

  it('keeps controls keyboard reachable when paused, but not when inactive', async () => {
    const wrapper = render()
    await wrapper.setProps({ hud: { ...emptyHud(), skills: [] } })
    expect(wrapper.get('[data-es2-settings]').attributes('disabled')).toBeUndefined()
    await wrapper.setProps({ active: false })
    expect(wrapper.get('.es2-hud').attributes('inert')).toBeDefined()
  })
})
