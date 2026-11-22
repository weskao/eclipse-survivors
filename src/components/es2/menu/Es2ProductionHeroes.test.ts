import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Es2MainMenu from './Es2MainMenu.vue'

const props = { choice: 'knight' as const, heroId: 'shadowblade' as const, runMode: 'quick' as const, version: '1.2.0' }

describe('ES2 production hero artwork integration', () => {
  it('offers all three legacy and all three new playable heroes', () => {
    const wrapper = mount(Es2MainMenu, { props })
    const ids = wrapper.findAll('[data-hero]').map(card => card.attributes('data-hero'))
    expect(ids).toEqual(['knight', 'ranger', 'wizard', 'shadowblade', 'spirit-summoner', 'crimson-paladin'])
    expect(wrapper.get('[data-hero="shadowblade"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero="shadowblade"] img').attributes('src')).toContain('shadowblade')
    wrapper.unmount()
  })

  it('routes new heroes to the authoritative hero-selection event while preserving legacy selection', async () => {
    const wrapper = mount(Es2MainMenu, { props })
    await wrapper.get('[data-hero="spirit-summoner"]').trigger('click')
    expect(wrapper.emitted('selectHero')).toEqual([['spirit-summoner']])
    await wrapper.get('[data-hero="ranger"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['ranger']])
    wrapper.unmount()
  })
})
