import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MobileControls from '../../../src/components/es2/accessibility/MobileControls.vue'
import AccessibilitySettings from '../../../src/components/es2/accessibility/AccessibilitySettings.vue'
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../../../src/game/content/accessibility/preferences'

const mounted: Array<{ unmount(): void }> = []
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
})

function controls() {
  const wrapper = mount(MobileControls, {
    attachTo: document.body,
    props: { active: true, blocked: false, preferences: DEFAULT_ACCESSIBILITY_PREFERENCES },
  })
  mounted.push(wrapper)
  const pad = wrapper.get('[data-testid="es2-stick"]')
  Object.defineProperty(pad.element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 122, height: 122 }),
  })
  // Simulate iOS/webviews where pointer capture is unavailable.
  Object.defineProperty(pad.element, 'setPointerCapture', {
    configurable: true,
    value: () => { throw new Error('pointer capture unavailable') },
  })
  return { wrapper, pad }
}

function dispatchPointer(type: string, pointerId: number) {
  window.dispatchEvent(Object.assign(new Event(type), { pointerId }))
}

describe('mobile input cancellation and focus regressions', () => {
  it('releases an uncaptured joystick on pointerup outside the pad without duplicate release', async () => {
    const { wrapper, pad } = controls()
    await pad.trigger('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: 110, clientY: 61 })
    expect(wrapper.emitted('stick')?.at(-1)?.[0]).toMatchObject({ x: 1, y: 0 })
    // Without capture, dragging beyond the pad should still update movement.
    window.dispatchEvent(Object.assign(new Event('pointermove'), {
      pointerId: 41, clientX: 61, clientY: 10,
    }))
    expect(wrapper.emitted('stick')?.at(-1)?.[0]).toMatchObject({ x: 0, y: -1 })
    const movedCount = wrapper.emitted('stick')!.length
    dispatchPointer('pointerup', 77)
    expect(wrapper.emitted('stick')).toHaveLength(movedCount)
    dispatchPointer('pointerup', 41)
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    dispatchPointer('pointerup', 41)
    expect(wrapper.emitted('stick')).toHaveLength(movedCount + 1)
  })

  it('clears input when a pointer is cancelled outside or the browser navigates away', async () => {
    const { wrapper, pad } = controls()
    await pad.trigger('pointerdown', { pointerId: 6, pointerType: 'touch', clientX: 100, clientY: 61 })
    dispatchPointer('pointercancel', 6)
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    await pad.trigger('pointerdown', { pointerId: 8, pointerType: 'touch', clientX: 100, clientY: 61 })
    window.dispatchEvent(new Event('pagehide'))
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    await pad.trigger('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: 100, clientY: 61 })
    await pad.trigger('touchcancel')
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
  })

  it('fires dash from the second touch during joystick steering, without a duplicate synthesized click', async () => {
    const { wrapper, pad } = controls()
    await pad.trigger('pointerdown', { pointerId: 11, pointerType: 'touch', clientX: 100, clientY: 61 })
    const dash = wrapper.get('[data-testid="es2-dash"]')
    // On iOS multi-touch, WebKit may not synthesize a click for the second finger.
    await dash.trigger('pointerdown', { pointerId: 12, pointerType: 'touch', isPrimary: false, button: 0 })
    expect(wrapper.emitted('dash')).toHaveLength(1)
    await dash.trigger('click', { detail: 1 })
    expect(wrapper.emitted('dash')).toHaveLength(1)
    await dash.trigger('pointerdown', { pointerId: 13, pointerType: 'touch', isPrimary: false, button: 0 })
    expect(wrapper.emitted('dash')).toHaveLength(2)
    await wrapper.setProps({ blocked: true })
    await dash.trigger('pointerdown', { pointerId: 14, pointerType: 'touch', button: 0 })
    expect(wrapper.emitted('dash')).toHaveLength(2)
  })

  it('keeps the dash keyboard accessible without sending Space to the game a second time', async () => {
    const { wrapper } = controls()
    const pad = wrapper.get('[data-testid="es2-stick"]')
    const dash = wrapper.get('[data-testid="es2-dash"]')
    // A non-interactive group must not insert a dead keyboard tab stop.
    expect(pad.attributes('tabindex')).toBeUndefined()
    const onWindowKey = vi.fn()
    window.addEventListener('keydown', onWindowKey)
    try {
      dash.element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))
      expect(onWindowKey).not.toHaveBeenCalled()
      // Native Space/Enter activation fires click; the component emits dash once.
      await dash.trigger('click')
      expect(wrapper.emitted('dash')).toHaveLength(1)
      dash.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }))
      expect(onWindowKey).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('keydown', onWindowKey)
    }
  })

  it('blocks joystick and dash during pause/settings and resumes normally', async () => {
    const { wrapper, pad } = controls()
    await pad.trigger('pointerdown', { pointerId: 2, clientX: 95, clientY: 61 })
    await wrapper.setProps({ blocked: true })
    expect(wrapper.emitted('stick')?.at(-1)).toEqual([null])
    await wrapper.get('[data-testid="es2-dash"]').trigger('click')
    expect(wrapper.emitted('dash')).toBeUndefined()
    await wrapper.setProps({ blocked: false })
    await wrapper.get('[data-testid="es2-dash"]').trigger('click')
    expect(wrapper.emitted('dash')).toHaveLength(1)
  })
})

describe('accessibility settings labels and keyboard controls', () => {
  it('provides distinct accessible names and pressed states for stateful switches', async () => {
    const wrapper = mount(AccessibilitySettings, {
      props: { modelValue: DEFAULT_ACCESSIBILITY_PREFERENCES },
    })
    mounted.push(wrapper)
    const flash = wrapper.get('button[aria-label="降低閃光"]')
    const color = wrapper.get('button[aria-label="色覺輔助"]')
    const damage = wrapper.get('button[aria-label="傷害數字"]')
    // 02977b2b: binary preferences are role="switch" controls whose state is aria-checked.
    for (const toggle of [flash, color, damage]) expect(toggle.attributes('role')).toBe('switch')
    expect(flash.attributes('aria-checked')).toBe('false')
    expect(color.attributes('aria-checked')).toBe('false')
    expect(damage.attributes('aria-checked')).toBe('true')
    await color.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ colorblindIndicators: true })
    expect(wrapper.get('[role="group"][aria-label="減少動態"]')).toBeTruthy()
  })
})
