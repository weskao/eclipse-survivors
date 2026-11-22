import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Es2Select from './Es2Select.vue'

const options = [
  { value: 'auto', label: '自動' },
  { value: 'low', label: '低' },
  { value: 'high', label: '高' },
]
const wrappers: ReturnType<typeof mount>[] = []
function setup(extra: Record<string, unknown> = {}) {
  const wrapper = mount(Es2Select, { attachTo: document.body, props: {
    id: 'quality', label: '畫質', modelValue: 'auto', options, ...extra,
  } })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('shared in-game dropdown', () => {
  it('renders a game listbox, not a browser-native select', async () => {
    const wrapper = setup()
    expect(wrapper.find('select').exists()).toBe(false)
    const button = wrapper.get('#quality')
    expect(button.attributes('role')).toBe('combobox')
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(document.querySelectorAll('#quality-listbox [role="option"]')).toHaveLength(3)
    document.querySelector<HTMLElement>('[data-es2-value="low"]')!.click()
    expect(wrapper.emitted('update:modelValue')).toEqual([['low']])
    await nextTick()
    expect(button.attributes('aria-expanded')).toBe('false')
    await wrapper.setProps({ modelValue: 'low' })
    expect(button.text()).toContain('低')
  })

  it('supports keyboard choices and Escape without leaking to the parent dialog', async () => {
    const wrapper = setup()
    const button = wrapper.get('#quality')
    await button.trigger('keydown', { key: 'ArrowDown' })
    expect(button.attributes('aria-expanded')).toBe('true')
    await button.trigger('keydown', { key: 'ArrowDown' })
    expect(button.attributes('aria-activedescendant')).toBe('quality-option-1')
    await button.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['low']])
    await button.trigger('click')
    await button.trigger('keydown', { key: 'Escape' })
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('dismisses outside, honors disabled and remains viewport bounded', async () => {
    const wrapper = setup()
    await wrapper.get('#quality').trigger('click')
    expect(document.querySelector('.es2-select-listbox')).not.toBeNull()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('.es2-select-listbox')).toBeNull()
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('#quality').attributes('disabled')).toBeDefined()
    await wrapper.get('#quality').trigger('click')
    expect(document.querySelector('.es2-select-listbox')).toBeNull()
  })
})
