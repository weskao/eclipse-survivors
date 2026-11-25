import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Es2MainMenu from './Es2MainMenu.vue'
import { PRODUCTION_HERO_POSE_SOURCES } from '../../../game/render/es2/production-heroes'

const props = { choice: 'knight' as const, heroId: 'shadowblade' as const, runMode: 'quick' as const, version: '1.2.0' }

describe('ES2 production hero artwork integration', () => {
  it('offers all three original and all three new heroes without duplicate cards', () => {
    const wrapper = mount(Es2MainMenu, { props })
    const originals = wrapper.findAll('[data-hero]').map(card => card.attributes('data-hero'))
    const newHeroes = wrapper.findAll('[data-hero-id]').map(card => card.attributes('data-hero-id'))
    expect(originals).toEqual(['knight', 'ranger', 'wizard'])
    expect(newHeroes).toEqual(['shadowblade', 'spirit-summoner', 'crimson-paladin'])
    expect(wrapper.get('[data-hero-id="shadowblade"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero-id="shadowblade"] .es2-hero-action-preview').attributes('style')).toContain(PRODUCTION_HERO_POSE_SOURCES.shadowblade.action)
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      const card = wrapper.get(`[data-hero-id="${id}"]`)
      expect(card.get('.es2-hero-action-preview').attributes('style')).toContain(PRODUCTION_HERO_POSE_SOURCES[id as keyof typeof PRODUCTION_HERO_POSE_SOURCES].action)
      expect(card.get('img.es2-roster__portrait').attributes('src')).toContain(id + '-portrait@3x.webp')
    }
    wrapper.unmount()
  })

  it('routes action hero selection to authoritative gameplay ID without affecting legacy selection', async () => {
    const wrapper = mount(Es2MainMenu, { props })
    await wrapper.get('[data-hero-id="spirit-summoner"]').trigger('click')
    expect(wrapper.emitted('selectHero')).toEqual([['spirit-summoner']])
    await wrapper.get('[data-hero="ranger"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['ranger']])
    wrapper.unmount()
  })
})
