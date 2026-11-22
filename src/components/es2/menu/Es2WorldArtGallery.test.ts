import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyProfile } from '../../../meta/profile'
import Es2Archive from './Es2Archive.vue'

const fakeDialog = { template: '<div><slot /></div>' }
const render = (view: 'monsters' | 'achievements') => mount(Es2Archive, {
  props: { active: true, view, profile: emptyProfile(), hero: 'knight' },
  global: { stubs: { Es2Dialog: fakeDialog } },
})

describe('ES2 accessible in-game world-art gallery', () => {
  it('shows all ten new enemies with attack previews, all four bosses and all four biomes', () => {
    const wrapper = render('monsters')
    expect(wrapper.findAll('[data-es2-world-enemy]')).toHaveLength(10)
    expect(wrapper.findAll('[data-es2-world-telegraph]')).toHaveLength(10)
    expect(wrapper.findAll('[data-es2-world-boss]')).toHaveLength(4)
    expect(wrapper.findAll('[data-es2-world-biome]')).toHaveLength(4)
    expect(wrapper.text()).toContain('尚待美術驗收')
    wrapper.unmount()
  })

  it('displays all 17 review-state UI illustrations without awarding achievements', () => {
    const wrapper = render('achievements')
    expect(wrapper.findAll('[data-es2-world-ui]')).toHaveLength(17)
    expect(wrapper.text()).toContain('尚待美術驗收')
    wrapper.unmount()
  })
})
