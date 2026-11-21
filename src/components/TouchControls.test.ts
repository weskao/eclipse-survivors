import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TouchControls from './TouchControls.vue'

describe('mobile controls', () => {
  it('releases an active stick when pointer capture is lost or touch is cancelled', async () => {
    const wrapper = mount(TouchControls, { props: { active: true } })
    const pad = wrapper.get('#stick')
    Object.defineProperty(pad.element, 'setPointerCapture', { value: vi.fn() })
    Object.defineProperty(pad.element, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 122, height: 122 }) })
    await pad.trigger('pointerdown', { pointerId: 5, clientX: 91, clientY: 61 })
    expect(wrapper.emitted('stick')?.at(-1)?.[0]).toMatchObject({ x: expect.any(Number) })
    await pad.trigger('lostpointercapture', { pointerId: 5 })
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    await pad.trigger('pointerdown', { pointerId: 6, clientX: 81, clientY: 61 })
    await pad.trigger('pointercancel', { pointerId: 6 })
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    wrapper.unmount()
  })

  it('releases stick when paused and does not accept hidden input', async () => {
    const wrapper = mount(TouchControls, { props: { active: true } })
    const pad = wrapper.get('#stick')
    Object.defineProperty(pad.element, 'setPointerCapture', { value: vi.fn() })
    await pad.trigger('pointerdown', { pointerId: 2, clientX: 70, clientY: 60 })
    await wrapper.setProps({ active: false })
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    const count = wrapper.emitted('stick')?.length
    await pad.trigger('pointerdown', { pointerId: 7, clientX: 70, clientY: 60 })
    expect(wrapper.emitted('stick')?.length).toBe(count)
    wrapper.unmount()
  })

  it('dash fires once per keyboard or pointer activation', async () => {
    const wrapper = mount(TouchControls, { props: { active: true } })
    await wrapper.get('#dash').trigger('click')
    expect(wrapper.emitted('dash')).toHaveLength(1)
    await wrapper.setProps({ active: false })
    await wrapper.get('#dash').trigger('click')
    expect(wrapper.emitted('dash')).toHaveLength(1)
    wrapper.unmount()
  })
})
