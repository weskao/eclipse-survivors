import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import { encyclopedia } from '../../../meta/compendium'
import { MONSTER_IDS } from '../../../game/monster-catalog'
import { ART_URLS } from '../../../game/art'
import { WORLD_ART } from '../../../game/render/es2/production-world'
import Es2Archive from './Es2Archive.vue'
import { monsterGroups } from './monster-details'
describe('complete discovery-gated archive', () => {
  it('registers every combat identity and hides undiscovered artwork and details', () => {
    const profile = emptyProfile()
    expect(encyclopedia(profile).monsters.map(x => x.id)).toEqual(MONSTER_IDS)
    const wrapper = mount(Es2Archive, { props: { view: 'monsters', hero: 'knight', profile } })
    expect(wrapper.findAll('[data-monster-entry]')).toHaveLength(MONSTER_IDS.length)
    expect(wrapper.findAll('[data-monster-portrait]')).toHaveLength(0)
    expect(wrapper.findAll('[data-es2-context-card]')).toHaveLength(0)
    wrapper.unmount()
  })
  it('renders only the discovered battle identity and crops the actual atlases', () => {
    const profile = emptyProfile()
    profile.discoveredMonsters = { warlock: 1, boss: 1, 'shadow-assassin': 2, 'frost-sovereign': 1 }
    const wrapper = mount(Es2Archive, { props: { view: 'monsters', hero: 'knight', profile } })
    expect(wrapper.findAll('[data-monster-portrait]')).toHaveLength(4)
    expect(wrapper.get('[data-monster-entry="warlock"] img').attributes('src')).toBe(ART_URLS.wizard)
    expect(wrapper.get('[data-monster-entry="boss"] img').attributes('src')).toBe(ART_URLS.boss)
    expect(wrapper.get('[data-monster-entry="shadow-assassin"] [data-monster-portrait]').attributes('style')).toContain(WORLD_ART.enemies['shadow-assassin'].body)
    expect(wrapper.get('[data-monster-entry="frost-sovereign"] [data-monster-portrait]').attributes('style')).toContain(WORLD_ART.bosses['frost-sovereign'])
    expect(wrapper.find('[data-monster-entry="abyss-monarch"] [data-monster-portrait]').exists()).toBe(false)
    expect(monsterGroups('boss')).toHaveLength(1)
    expect(monsterGroups('frost-sovereign')[0]?.id).toBe('frost-sovereign')
    for (const id of MONSTER_IDS) expect(monsterGroups(id)[0]?.skills.length).toBeGreaterThan(0)
    wrapper.unmount()
  })
  it('uses the same centered portrait slot for achievements', () => {
    const wrapper = mount(Es2Archive, { props: { view: 'achievements', hero: 'knight', profile: emptyProfile() } })
    expect(wrapper.findAll('.es2-archive-art [data-es2-achievement-badge]')).toHaveLength(6)
    wrapper.unmount()
  })
})
