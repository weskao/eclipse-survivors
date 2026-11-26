import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { useHoverDetails } from './useHoverDetails'

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.unstubAllGlobals()
})

function setup() {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  const wrapper = mount(defineComponent({
    setup() {
      const details = useHoverDetails('button[data-hero]', el => el.dataset.hero ?? null)
      return () => h('section', {
        onPointerover: details.events.pointerover,
        onPointerout: details.events.pointerout,
        onFocusin: details.events.focusin,
        onFocusout: details.events.focusout,
      }, [
        h('button', { 'data-hero': 'wizard' }, 'Wizard'),
        details.anchor.value ? h('aside', { id: details.tooltipId, role: 'tooltip' }, details.id.value ?? '') : null,
      ])
    },
  }), { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

describe('anchored hero details during scroll', () => {
  it('keeps the active keyboard dossier when scrolling brings the focused card into view', async () => {
    const wrapper = setup()
    const card = wrapper.get('button')
    card.element.focus()
    await card.trigger('pointerover', { pointerType: 'mouse' })
    expect(wrapper.get('[role="tooltip"]').text()).toBe('wizard')
    const description = card.attributes('aria-describedby')
    wrapper.element.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(wrapper.get('[role="tooltip"]').text()).toBe('wizard')
    expect(card.attributes('aria-describedby')).toBe(description)
    card.element.blur()
    wrapper.element.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
    expect(card.attributes('aria-describedby')).toBeUndefined()
  })
})
