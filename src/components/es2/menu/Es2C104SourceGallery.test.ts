import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import Es2Archive from './Es2Archive.vue'
import { C104_SOURCES } from '../../../game/render/es2/c104-source-art'

const fakeDialog = { template: '<div><slot /></div>' }
describe('c104 original art visibility without sprite contamination', () => {
  it('shows all ten source display WebPs in DEV without any fold or disclosure control', async () => {
    const wrapper = mount(Es2Archive, {
      props: { active: true, view: 'monsters', profile: emptyProfile(), hero: 'knight' },
      global: { stubs: { Es2Dialog: fakeDialog } },
    })
    await vi.waitFor(() => expect(wrapper.find('[data-es2-c104-gallery]').exists()).toBe(true))
    const images = wrapper.findAll('[data-es2-c104-source]')
    expect(images).toHaveLength(10)
    const gallery = wrapper.get('[data-es2-c104-gallery]')
    expect(gallery.element.tagName).toBe('DIV')
    expect(gallery.find('details').exists()).toBe(false)
    expect(gallery.find('summary').exists()).toBe(false)
    expect(gallery.get('h3').text()).toContain('c104 原始美術圖集')
    for (const image of images) {
      const id = image.attributes('data-es2-c104-source') as keyof typeof C104_SOURCES
      expect(image.attributes('src')).toBe(C104_SOURCES[id])
      expect(image.attributes('loading')).toBe('lazy')
    }
    wrapper.unmount()
  })
})
