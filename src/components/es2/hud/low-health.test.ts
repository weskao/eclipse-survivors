import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { emptyHud } from '../../../game/store'
import CombatHud from './CombatHud.vue'
import { lowHealthTier } from './low-health'

const wrappers: Array<{ unmount(): void }> = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('live low-health danger feedback', () => {
  it('uses bounded four-sided edge illumination and a readable static accessibility fallback', () => {
    const css = readFileSync('src/styles/es2/low-health.css', 'utf8')
    for (const direction of ['to right', 'to left', 'to bottom', 'to top'])
      expect(css).toContain('linear-gradient(' + direction + ', var(--es2-life-edge)')
    expect(css).toContain('--es2-life-edge-x: clamp(24px, 12vw, 160px)')
    expect(css).toContain('--es2-life-edge-y: clamp(20px, 14dvh, 120px)')
    expect(css).toContain('18% { opacity: var(--es2-life-strong); }')
    expect(css).toContain('48% { opacity: var(--es2-life-echo); }')
    expect(css).toContain('opacity: var(--es2-life-static)')
    expect(css).toContain('.es2-hud:is([data-es2-life-tier="critical"], [data-es2-life-tier="emergency"]) .es2-hud__life-message')
    expect(css).not.toMatch(/(?:backdrop-filter|filter):/)
  })

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

  it('suppresses all additional warnings without changing actual HP and restores immediately', async () => {
    const hud = { ...emptyHud(), hpPct: 12, hpLabel: '生命 12 / 100' }
    const wrapper = mount(CombatHud, { attachTo: document.body, props: {
      active: true, choice: 'wizard' as const, hud, showHeroLowHealthWarning: false,
      actions: { pause: vi.fn(), settings: vi.fn() },
    } })
    wrappers.push(wrapper)
    for (const hpPct of [40, 25, 12]) {
      await wrapper.setProps({ hud: { ...hud, hpPct } })
      expect(wrapper.get('.es2-hud').attributes('data-es2-life-tier')).toBe('normal')
      for (const selector of ['[data-es2-life-alert]', '[data-es2-life-message]', '[data-es2-life-vignette]', '.es2-hud__track--critical'])
        expect(wrapper.find(selector).exists()).toBe(false)
      expect(wrapper.get('.es2-hud__track--health').attributes('aria-valuenow')).toBe(String(hpPct))
    }
    await wrapper.setProps({ showHeroLowHealthWarning: true })
    expect(wrapper.get('.es2-hud').attributes('data-es2-life-tier')).toBe('emergency')
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(true)
    await wrapper.setProps({ showHeroLowHealthWarning: false })
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)
    expect(wrapper.get('.es2-hud__track--health').attributes('aria-valuenow')).toBe('12')
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
    expect(wrapper.find('[data-es2-life-message]').exists()).toBe(false)
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)

    await wrapper.setProps({ hud: { ...hud, hpPct: 40 } })
    expect(root.attributes('data-es2-life-tier')).toBe('warning')
    expect(wrapper.get('.es2-hud__portrait [data-es2-life-alert]').attributes('aria-label')).toBeTruthy()
    expect(wrapper.get('.es2-hud__hero [data-es2-life-message]').text()).toBe('血量偏低')
    expect(wrapper.find('[data-es2-life-vignette]').exists()).toBe(false)

    await wrapper.setProps({ hud: { ...hud, hpPct: 25 } })
    expect(root.attributes('data-es2-life-tier')).toBe('critical')
    expect(wrapper.get('[data-es2-life-message]').text()).toBe('生命危急')
    expect(wrapper.get('[data-es2-life-vignette]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[role="progressbar"][aria-label="生命值"]').attributes('aria-valuenow')).toBe('25')

    await wrapper.setProps({ hud: { ...hud, hpPct: 12 } })
    expect(root.attributes('data-es2-life-tier')).toBe('emergency')
    expect(wrapper.get('[data-es2-life-message]').text()).toBe('瀕死')
    expect(wrapper.get('[data-es2-life-vignette]').attributes('aria-hidden')).toBe('true')

    await wrapper.setProps({ hud: { ...hud, hpPct: 75 } })
    expect(root.attributes('data-es2-life-tier')).toBe('normal')
    expect(wrapper.find('[data-es2-life-message]').exists()).toBe(false)
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
