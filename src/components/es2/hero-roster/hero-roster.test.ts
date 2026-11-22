import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import HeroRoster from './HeroRoster.vue'
import HeroSpecialAction from './HeroSpecialAction.vue'

const instances: Array<{ unmount(): void }> = []
function render(component: typeof HeroRoster | typeof HeroSpecialAction, props: Record<string, unknown>) {
  const wrapper = mount(component, { attachTo: document.body, props } as never)
  instances.push(wrapper)
  return wrapper
}
afterEach(() => {
  for (const wrapper of instances.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('ES2 three-hero selection UI', () => {
  it('renders exactly three illustrated cards and shows equipment, stats, skills and strengths', () => {
    const wrapper = render(HeroRoster, { selectedId: 'shadowblade' })
    expect(wrapper.findAll('[data-hero-id]')).toHaveLength(3)
    expect(wrapper.get('[data-hero-id="shadowblade"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero-id="spirit-summoner"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('img')).toHaveLength(3)
    expect(wrapper.text()).toContain('影刃')
    expect(wrapper.text()).toContain('生命')
    expect(wrapper.text()).toContain('起始武器')
    expect(wrapper.text()).toContain('冷卻')
  })

  it('selects through pointer and arrow-key focus, and respects disabled state', async () => {
    const wrapper = render(HeroRoster, { selectedId: 'shadowblade' })
    await wrapper.get('[data-hero-id="crimson-paladin"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['crimson-paladin'])
    const initial = wrapper.get('[data-hero-id="shadowblade"]')
    await initial.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['spirit-summoner'])
    expect(document.activeElement).toBe(wrapper.get('[data-hero-id="spirit-summoner"]').element)
    await wrapper.setProps({ disabled: true })
    await wrapper.get('[data-hero-id="crimson-paladin"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(2)
  })
})

describe('ES2 dedicated hero special action', () => {
  it('shows live cooldown, triggers one mouse/touch activation, and disables unavailable actions', async () => {
    const wrapper = render(HeroSpecialAction, {
      heroId: 'shadowblade', active: true,
      snapshot: { cooldown: 0, stealth: 0, barrier: 0, companions: [] },
    })
    const action = wrapper.get('[data-hero-special]')
    expect(action.attributes('aria-keyshortcuts')).toBe('Q')
    await action.trigger('click')
    expect(wrapper.emitted('activate')).toHaveLength(1)
    await wrapper.setProps({ snapshot: { cooldown: 5.2, stealth: 0, barrier: 0, companions: [] } })
    expect(wrapper.text()).toContain('5.2')
    expect(action.attributes('disabled')).toBeDefined()
    await action.trigger('click')
    expect(wrapper.emitted('activate')).toHaveLength(1)
  })

  it('supports Q, skips typing/repeats and removes the global listener on unmount', async () => {
    const wrapper = render(HeroSpecialAction, {
      heroId: 'spirit-summoner', active: true,
      snapshot: { cooldown: 0, stealth: 0, barrier: 0, companions: [] },
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', repeat: true, bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
    wrapper.unmount()
    instances.splice(instances.indexOf(wrapper), 1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
  })
})
