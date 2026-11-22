import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import Es2Archive from './Es2Archive.vue'
import Es2MainMenu from './Es2MainMenu.vue'
import Es2ChoiceCards from './Es2ChoiceCards.vue'
import { WORLD_ART } from '../../../game/render/es2/production-world'

const fakeDialog = { template: '<div><slot /></div>' }

describe('c104 applied assets in real game surfaces', () => {
  it('provides four distinct scene illustrations without confusing them with repeatable floor', () => {
    const items = Object.values(WORLD_ART.biomes)
    expect(items).toHaveLength(4)
    expect(new Set(items.map(x => x.scene)).size).toBe(4)
    for (const item of items) {
      expect(item.scene).toMatch(/-scene@3x\.webp(?:\?|$)/)
      expect(item.scene).not.toBe(item.ground)
    }
    const wrapper = mount(Es2MainMenu, {
      props: { choice:'knight',runMode:'quick',version:'1.2.0' },
    })
    const hero = wrapper.get('[data-es2-biome-scene]')
    expect(Object.values(WORLD_ART.biomes).some(i => i.scene === hero.attributes('src'))).toBe(true)
    wrapper.unmount()
  })

  it('renders all four biome scene images in the in-game archives', () => {
    const wrapper = mount(Es2Archive, {
      props: {active:true, view:'monsters',hero:'knight',profile:emptyProfile()},
      global: {stubs:{Es2Dialog:fakeDialog}},
    })
    expect(wrapper.findAll('[data-es2-biome-scene]')).toHaveLength(4)
    wrapper.unmount()
  })

  it('uses authored rarity indicators on real choice cards', () => {
    const items = ['common','rare','legendary'].map(rarity => ({
      id:rarity,title:rarity,rarity,icon:'✦'
    }))
    const wrapper = mount(Es2ChoiceCards, { props:{items} })
    const images = wrapper.findAll('[data-es2-rarity-icon]')
    expect(images).toHaveLength(3)
    expect(images.map(img => img.attributes('src'))).toEqual([
      WORLD_ART.ui['rarity-common'],
      WORLD_ART.ui['rarity-rare'],
      WORLD_ART.ui['rarity-legendary'],
    ])
    wrapper.unmount()
  })

  it('shows six correct authored achievement badges without unlocking any achievements', () => {
    const profile = emptyProfile()
    const wrapper = mount(Es2Archive, {
      props:{active:true,view:'achievements',hero:'knight',profile},
      global:{stubs:{Es2Dialog:fakeDialog}},
    })
    expect(wrapper.findAll('[data-es2-achievement-badge]')).toHaveLength(6)
    expect(profile.achievements).toHaveLength(0)
    wrapper.unmount()
  })
})
