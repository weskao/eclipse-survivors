import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MobileControls from './MobileControls.vue'
import AccessibilitySettings from './AccessibilitySettings.vue'
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../../../game/content/accessibility/preferences'

describe('isolated mobile controls', () => {
  it('releases a touch on cancel, capture loss, resize, blur and disabled overlay', async () => {
    const w = mount(MobileControls, { props: { active: true, blocked: false, preferences: DEFAULT_ACCESSIBILITY_PREFERENCES } })
    const pad = w.get('[data-testid="es2-stick"]')
    Object.defineProperty(pad.element, 'setPointerCapture', { value: vi.fn(), configurable: true })
    Object.defineProperty(pad.element, 'releasePointerCapture', { value: vi.fn(), configurable: true })
    Object.defineProperty(pad.element, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 122, height: 122 }), configurable: true })
    const down = (id: number) => pad.trigger('pointerdown', { pointerId: id, clientX: 100, clientY: 61 })
    await down(1)
    await pad.trigger('pointermove', { pointerId: 1, clientX: 82, clientY: 61 })
    expect(w.emitted('stick')?.at(-1)?.[0]).toMatchObject({ x: expect.any(Number) })
    await pad.trigger('pointercancel', { pointerId: 1 })
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    await down(2)
    await pad.trigger('lostpointercapture', { pointerId: 2 })
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    await down(3)
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    await down(4)
    window.dispatchEvent(new Event('blur'))
    await nextTick()
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    await down(5)
    window.dispatchEvent(new Event('orientationchange'))
    await nextTick()
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    await down(7)
    await pad.trigger('pointerup', { pointerId: 7 })
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    await down(8)
    await w.setProps({ blocked: true })
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    const count = w.emitted('stick')?.length
    await down(6)
    expect(w.emitted('stick')?.length).toBe(count)
    w.unmount()
  })

  it('honors side/scale, supports native keyboard dash and avoids duplicate pointers', async () => {
    const prefs = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, joystickSide: 'right' as const, touchScale: 1.2 }
    // Native keyboard bubbling reaches window only from a connected DOM subtree.
    const w = mount(MobileControls, { attachTo: document.body, props: { active: true, preferences: prefs } })
    expect(w.attributes('data-side')).toBe('right')
    expect(w.attributes('style')).toContain('--es2-touch-scale: 1.2')
    expect(w.attributes('style')).toContain('--es2-stick-offset: 30px')
    const pad = w.get('[data-testid="es2-stick"]')
    Object.defineProperty(pad.element, 'setPointerCapture', { value: vi.fn(), configurable: true })
    await pad.trigger('pointerdown', { pointerId: 1 })
    const count = w.emitted('stick')?.length
    await pad.trigger('pointerdown', { pointerId: 2 })
    expect(w.emitted('stick')?.length).toBe(count)
    const keyboard = vi.fn()
    window.addEventListener('keydown', keyboard)
    pad.element.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }))
    expect(keyboard).toHaveBeenCalledOnce()
    window.removeEventListener('keydown', keyboard)
    await w.get('[data-testid="es2-dash"]').trigger('click')
    expect(w.emitted('dash')).toHaveLength(1)
    await w.setProps({ active: false })
    await w.get('[data-testid="es2-dash"]').trigger('click')
    expect(w.emitted('dash')).toHaveLength(1)
    expect(w.emitted('stick')?.at(-1)).toEqual([null])
    w.unmount()
  })
})

describe('accessibility settings', () => {
  it('previews options immediately using accessible native inputs', async () => {
    const w = mount(AccessibilitySettings, { props: { modelValue: DEFAULT_ACCESSIBILITY_PREFERENCES } })
    expect(w.get('[data-testid="es2-preview"]').attributes('aria-live')).toBe('polite')
    const q = w.get('[data-testid="es2-quality"]')
    await q.setValue('low')
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ quality: 'low' })
    const scale = w.get('[data-testid="es2-ui-scale"]')
    await scale.setValue('1.2')
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ interfaceScale: 1.2 })
    expect(w.get('[data-testid="es2-motion"]').attributes('aria-pressed')).toBe('false')
    await w.get('[data-testid="es2-motion"]').trigger('click')
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ reducedMotion: 'on' })
    w.unmount()
  })
})
