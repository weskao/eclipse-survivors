import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { emptyHud } from '../../../game/store'
import CombatHud from './CombatHud.vue'
import { lowHealthTier } from './low-health'

const wrappers: Array<{ unmount(): void }> = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('live low-health danger feedback', () => {
  it('uses configured thresholds and ignores zero HP after death', () => {
    expect(lowHealthTier(100)).toBe('normal')
    expect(lowHealthTier(40.01)).toBe('normal')
    expect(lowHealthTier(40)).toBe('warning')
    expect(lowHealthTier(25.01)).toBe('warning')
    expect(lowHealthTier(25)).toBe('critical')
    expect(lowHealthTier(12.01)).toBe('critical')
    expect(lowHealthTier(12)).toBe('emergency')
    expect(lowHealthTier(1)).toBe('emergency')
    expect(lowHealthTier(0)).toBe('dead')
  })

  it('keeps warning on the actual hero portrait, escalates at critical HP, and clears on healing', async () => {
    const hud = { ...emptyHud(), who: '虛空術士', hpPct: 80, hpLabel: '生命 80 / 100' }
    const wrapper = mount(CombatHud, { attachTo: document.body, props: {
      active: true, choice: 'wizard' as const, hud,
      actions: { pause: vi.fn(), settings: vi.fn() },
    } })
    wrappers.push(wrapper)
    const root = wrapper.get('.es2-hud')
    expect(root.attributes('data-es2-life-tier')).toBe('normal')
    expect(wrapper.find('[data-es2-life-alert]').exists()).toBe(false)
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)

    await wrapper.setProps({ hud: { ...hud, hpPct: 40 } })
    expect(root.attributes('data-es2-life-tier')).toBe('warning')
    expect(wrapper.get('.es2-hud__portrait [data-es2-life-alert]').attributes('aria-label')).toBeTruthy()
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)

    await wrapper.setProps({ hud: { ...hud, hpPct: 25 } })
    expect(root.attributes('data-es2-life-tier')).toBe('critical')
    expect(wrapper.get('[data-es2-life-vignette]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[role="progressbar"][aria-label="生命值"]').attributes('aria-valuenow')).toBe('25')

    await wrapper.setProps({ hud: { ...hud, hpPct: 12 } })
    expect(root.attributes('data-es2-life-tier')).toBe('emergency')
    expect(wrapper.get('[data-es2-life-vignette]').attributes('aria-hidden')).toBe('true')

    await wrapper.setProps({ hud: { ...hud, hpPct: 75 } })
    expect(root.attributes('data-es2-life-tier')).toBe('normal')
    expect(wrapper.find('[data-es2-life-alert]').exists()).toBe(false)
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)

    await wrapper.setProps({ hud: { ...hud, hpPct: 0 } })
    expect(root.attributes('data-es2-life-tier')).toBe('dead')
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)

    await wrapper.setProps({ active: false, hud: { ...hud, hpPct: 8 } })
    expect(root.attributes('data-es2-life-tier')).toBe('normal')
    expect(wrapper.find('[data-es2-life-alert]').exists()).toBe(false)
  })
})
