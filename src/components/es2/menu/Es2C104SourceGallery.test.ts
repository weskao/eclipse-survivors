import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import Es2Archive from './Es2Archive.vue'
import { C104_SOURCES } from '../../../game/render/es2/c104-source-art'

const fakeDialog = { template: '<div><slot /></div>' }
describe('c104 original art visibility without sprite contamination', () => {
  it('exposes each of the ten committed source PNGs directly from a lazy, opt-in gallery', () => {
    const wrapper = mount(Es2Archive, {
      props: { active: true, view: 'monsters', profile: emptyProfile(), hero: 'knight' },
      global: { stubs: { Es2Dialog: fakeDialog } },
    })
    const images = wrapper.findAll('[data-es2-c104-source]')
    expect(images).toHaveLength(10)
    expect(wrapper.find('details[data-es2-c104-gallery]').exists()).toBe(true)
    for (const image of images) {
      const id = image.attributes('data-es2-c104-source') as keyof typeof C104_SOURCES
      expect(image.attributes('src')).toBe(C104_SOURCES[id])
      expect(image.attributes('loading')).toBe('lazy')
    }
    wrapper.unmount()
  })
})
