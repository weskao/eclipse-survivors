import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorldEventPanel from './WorldEventPanel.vue'
import type { WorldEventOption } from '../../../game/content/world-events/runtime'
import type { ActiveWorldEvent } from '../../../game/content/world-events/types'

const event: ActiveWorldEvent = {
  id: '0:1', kind: 'events:cursed-altar', x: 12, y: 9, expiresAt: 24,
}
const options: WorldEventOption[] = [
  { id: 'invoke', title: 'Invoke the curse', risk: 'Sacrifice 18 HP',
    reward: 'Gain cursed might for 15 seconds', costs: ['18 HP'], available: true, reason: null },
  { id: 'purify', title: 'Purify the sigil', risk: 'Spend 12 experience',
    reward: 'Gain ward', costs: ['12 XP'], available: false, reason: 'Insufficient XP' },
  { id: 'leave', title: 'Leave safely', risk: 'No danger', reward: 'Keep resources',
    costs: [], available: true, reason: null },
]
const wrappers: VueWrapper[] = []
function mounted(props: Record<string, unknown>) {
  const wrapper = mount(WorldEventPanel, { attachTo: document.body,
    props: { event, options, ...props } })
  wrappers.push(wrapper)
  return wrapper
}
function press(key: string, extra: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }))
}
const card = (id: string) => document.querySelector<HTMLButtonElement>(`[data-world-choice="${id}"]`)!

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('world event dialog', () => {
  it('renders costs, risks, rewards, reasons and accessible action controls', async () => {
    mounted({})
    await nextTick()
    expect(document.querySelector('[role=dialog]')?.getAttribute('aria-modal')).toBe('true')
    expect(document.body.textContent).toContain('詛咒祭壇')
    expect(card('invoke').textContent).toContain('18 HP')
    expect(card('invoke').textContent).toContain('犧牲 18 生命')
    expect(card('invoke').textContent).toContain('獲得 15 秒詛咒之力')
    expect(card('purify').disabled).toBe(true)
    expect(document.body.textContent).toContain('Insufficient XP')
    expect(card('leave').getBoundingClientRect).toBeDefined()
  })

  it('supports pointer, touch click and number-key selection without duplicate submission', async () => {
    const wrapper = mounted({})
    await nextTick()
    card('invoke').click()
    card('invoke').click()
    press('2')
    expect(wrapper.emitted('choose')).toEqual([['0:1', 'invoke']])
    await wrapper.setProps({ event: { ...event, id: '0:2' } })
    await nextTick()
    press('3')
    expect(wrapper.emitted('choose')).toEqual([['0:1', 'invoke'], ['0:2', 'leave']])
  })


  it('unlocks selection for an intentional retry after the pending action completes', async () => {
    const wrapper = mounted({ feedback: 'Reward unavailable; try again' })
    await nextTick()
    card('invoke').click()
    card('invoke').click()
    expect(wrapper.emitted('choose')).toEqual([['0:1', 'invoke']])
    // Allow both the first render and the retry unlock render to flush.
    await flushPromises()
    card('invoke').click()
    expect(wrapper.emitted('choose')).toEqual([['0:1', 'invoke'], ['0:1', 'invoke']])
  })

  it('ignores repeat, modified and out-of-range keyboard shortcuts', async () => {
    const wrapper = mounted({})
    await nextTick()
    press('1', { repeat: true })
    press('1', { ctrlKey: true })
    press('9')
    press('2')
    expect(wrapper.emitted('choose')).toBeUndefined()
    press('1')
    expect(wrapper.emitted('choose')).toEqual([['0:1', 'invoke']])
  })

  it('closes on escape, displays retry feedback and removes dialog on scene cleanup', async () => {
    const wrapper = mounted({ feedback: 'Reward unavailable; try again' })
    await nextTick()
    expect(document.querySelector('[role=alert]')?.textContent).toContain('try again')
    press('Escape')
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.setProps({ event: null, options: [] })
    await nextTick()
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })
})
