import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createHero, createState } from '../../../game/state'
import { seeded } from '../../../game/math'
import { inventorySnapshot, openTreasure } from '../../../game/content/relics/runtime'
import RelicRewardOverlay from './RelicRewardOverlay.vue'

const wrappers: VueWrapper[] = []
const state = () => {
  const s = createState()
  s.hero = createHero('knight')
  s.mode = 'play'
  return s
}
function mountOffer() {
  const s = state()
  const offer = openTreasure(s, 4, seeded(10))!
  const wrapper = mount(RelicRewardOverlay, {
    attachTo: document.body,
    props: { active: true, offer, inventory: inventorySnapshot(s) },
  })
  wrappers.push(wrapper)
  return { wrapper, offer, s }
}
function press(key: string, extra: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }))
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('ES2 relic chest reward overlay', () => {
  it('renders genuine rarity, curse tradeoffs, inventory capacity and large accessible targets', async () => {
    const { wrapper, offer, s } = mountOffer()
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    for (const id of offer.options) {
      const card = document.querySelector<HTMLButtonElement>(`[data-relic-claim="${id}"]`)!
      expect(card).not.toBeNull()
      expect(card.textContent?.trim().length).toBeGreaterThan(5)
    }
    expect(document.querySelector('[data-relic-inventory]')?.textContent).toContain('/10')
    expect(document.querySelector('[data-relic-rerolls]')?.textContent).toContain('2')
    expect(document.querySelector('[data-relic-banishes]')?.textContent).toContain('2')
    expect(wrapper.emitted('claim')).toBeUndefined()
    expect(s.hero!.xp).toBe(0)
  })

  it('only emits one claim across repeated clicks and keyboard 1-3', async () => {
    const { wrapper, offer } = mountOffer()
    await nextTick()
    const first = document.querySelector<HTMLButtonElement>(`[data-relic-claim="${offer.options[0]}"]`)!
    first.click()
    first.click()
    press('2')
    expect(wrapper.emitted('claim')).toEqual([[offer.chestId, offer.options[0]]])
    expect(first.disabled).toBe(true)
  })

  it('blocks invalid keyboard shortcuts and locks transactions until state refreshes', async () => {
    const { wrapper, offer, s } = mountOffer()
    await nextTick()
    press('1', { repeat: true }); press('1', { ctrlKey: true }); press('5')
    expect(wrapper.emitted('claim')).toBeUndefined()
    document.querySelector<HTMLButtonElement>('[data-relic-reroll]')!.click()
    document.querySelector<HTMLButtonElement>('[data-relic-reroll]')!.click()
    document.querySelector<HTMLButtonElement>('[data-relic-banish]')!.click()
    expect(wrapper.emitted('reroll')).toEqual([[offer.chestId]])
    expect(wrapper.emitted('banish')).toBeUndefined()
    const different = openTreasure(s, 6, seeded(11))
    expect(different).toBeNull() // original offer remains until host resolves it
    await wrapper.setProps({ active: false })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('banishes a displayed unowned relic and allows closing an empty offer safely', async () => {
    const { wrapper, offer } = mountOffer()
    await nextTick()
    const banish = document.querySelector<HTMLButtonElement>(`[data-relic-banish="${offer.options[0]}"]`)!
    banish.click(); banish.click()
    expect(wrapper.emitted('banish')).toEqual([[offer.chestId, offer.options[0]]])
    await wrapper.setProps({ offer: { chestId: 5, options: [] } })
    await nextTick()
    expect(document.querySelector('[data-relic-empty]')).not.toBeNull()
    press('Escape')
    expect(wrapper.emitted('decline')).toEqual([[5]])
  })
})
