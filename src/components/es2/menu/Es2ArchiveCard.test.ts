import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import Es2Archive from './Es2Archive.vue'
import Es2ArchiveCard from './Es2ArchiveCard.vue'
import { WORLD_ART } from '../../../game/render/es2/production-world'

describe('shared archive card presentation', () => {
  it('uses one centered art slot and shared detail action', async () => {
    const wrapper = mount(Es2ArchiveCard, { props: { title: 'Relic', detailId: 'relic:a' },
      slots: { art: '<img src="relic.webp" alt="Relic" />', default: '<small>Owned</small>' } })
    expect(wrapper.get('article').classes()).toContain('es2-context-card')
    expect(wrapper.get('.es2-archive-art > img').attributes('src')).toBe('relic.webp')
    await wrapper.get('[data-es2-card-info]').trigger('click')
    expect(wrapper.emitted('open')).toEqual([['relic:a']])
    wrapper.unmount()
  })

  it.each(['relics', 'skills', 'monsters', 'achievements'] as const)('centers every %s card, including locked placeholders', view => {
    const profile = emptyProfile()
    profile.discoveredMonsters = { slime: 1, 'shadow-assassin': 1 }
    const wrapper = mount(Es2Archive, { props: { view, profile, hero: 'knight',
      relics: [
        { id: 'known', title: 'Known', rarity: 'common', owned: true, imageSrc: WORLD_ART.ui['achievement-explorer'], effect: 'Effect' },
        { id: 'unknown', title: 'Unknown', rarity: 'rare', owned: false, icon: '✧' },
      ] } })
    const cards = wrapper.findAll('.es2-archive-card')
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.findAll(':scope > .es2-archive-art')).toHaveLength(1)
      expect(card.findAll(':scope > img, :scope > .es2-archive-glyph')).toHaveLength(0)
      expect(card.get('.es2-archive-art').element.childElementCount).toBe(1)
    }
    if (view === 'relics') {
      expect(cards[0].classes()).toContain('es2-rarity-common')
      expect(cards[0].find('[data-es2-card-info]').exists()).toBe(true)
      expect(cards[1].find('[data-es2-card-info]').exists()).toBe(false)
    }
    wrapper.unmount()
  })
})
