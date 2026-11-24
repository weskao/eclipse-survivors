import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { emptyHud } from '../../../game/store'
import { currentLocale, setLocale } from '../../../i18n'
import CombatHud from './CombatHud.vue'

const wrappers: Array<{ unmount(): void }> = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})
function render() {
  const wrapper = mount(CombatHud, {
    attachTo: document.body,
    props: {
      active: true, canReturnHome: true, choice: 'knight' as const,
      hud: { ...emptyHud(), quest: '守護聖壇', skills: [{
        id: 'bolt', icon: '✦', title: '雷擊', rarity: 'rare' as const,
        level: 2, maxLevel: 5, cooldown: 0, cooldownPct: 0, evolved: false,
      }] },
      actions: { pause: vi.fn(), settings: vi.fn(), home: vi.fn() },
      feed: {
        statuses: [{ id: 'slow', kind: 'debuff' as const, title: '減速' }],
        objectives: [{ id: 'shrine', title: '守護聖壇', progress: 2, target: 3 }],
        notices: [{ id: 'chest', kind: 'treasure' as const, text: '發現寶箱' }],
        relics: [{ id: 'rune', title: '符文', rarity: 'rare' as const, icon: '✦' }],
      },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('compact portrait combat HUD regression', () => {
  it('shows the localized biome and weather while the boss objective is active', async () => {
    const locale = currentLocale.value
    const wrapper = render()
    try {
      setLocale('en')
      await wrapper.setProps({ hud: {
        ...emptyHud(), bossPct: 80, quest: '最終決戰 · 黎明遺庭', sceneTitle: '黎明遺庭 · 晨光薄霧',
      } })
      const title = wrapper.get('[data-es2-scene-title]')
      expect(title.text()).toBe('Dawnfall Courtyard · Dawn Mist')
      setLocale('zh-TW')
      await nextTick()
      expect(title.text()).toBe('黎明遺庭 · 晨光薄霧')
    } finally {
      setLocale(locale)
    }
  })

  it('exposes one accessible, collapsed-by-default information control without duplicating combat data', async () => {
    const wrapper = render()
    const toggle = wrapper.get('[data-es2-info-toggle]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe('es2-combat-info-panel')
    expect(toggle.attributes('aria-label')).toBeTruthy()
    expect(wrapper.get('#es2-combat-info-panel').attributes('data-es2-info-panel')).toBeDefined()
    expect(wrapper.findAll('[data-es2-status="slow"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-es2-relic="rune"]')).toHaveLength(1)
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.es2-hud').classes()).toContain('es2-hud--details-open')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('closes open information on Escape, outside pointer, viewport resize and loss of active play', async () => {
    const wrapper = render()
    const toggle = wrapper.get('[data-es2-info-toggle]')
    await toggle.trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    await wrapper.setProps({ canReturnHome: false })
    expect(wrapper.get('.es2-hud').classes()).not.toContain('es2-hud--details-open')
  })

  it('uses an actual portrait-only scrollable drawer, compact boss bar and CSS UI scale', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/hud.css'), 'utf8')
    expect(css).toContain('@media (orientation: portrait) and (max-width: 700px)')
    expect(css).toContain('.es2-hud__info-drawer')
    expect(css).toContain('.es2-hud--details-open .es2-hud__info-drawer')
    expect(css).toContain('overscroll-behavior: contain')
    expect(css).toContain('--es2-ui-scale')
  })

  it('closes optional details on Escape without forwarding the key to the game, returning focus to the toggle', async () => {
    const wrapper = render()
    const toggle = wrapper.get('[data-es2-info-toggle]')
    await toggle.trigger('click')
    await wrapper.get('[data-es2-info-close]').trigger('click')
    expect(document.activeElement).toBe(toggle.element)
    await toggle.trigger('click')
    const onGameKey = vi.fn()
    window.addEventListener('keydown', onGameKey)
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(toggle.attributes('aria-expanded')).toBe('false')
      expect(document.activeElement).toBe(toggle.element)
      expect(onGameKey).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', onGameKey)
    }
  })

  it('also collapses secondary HUD in short phone landscape and reserves control-safe drawer geometry', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/hud.css'), 'utf8')
    expect(css).toContain('(orientation: landscape) and (max-height: 520px) and (max-width: 900px)')
    expect(css).toContain('.es2-hud__info-drawer')
    expect(css).toContain('max(108px, calc(env(safe-area-inset-bottom)')
  })

  it('keeps pause above the HUD using the shared accessible dialog and prevents special action overlap with the configured joystick', () => {
    const pause = readFileSync(resolve(process.cwd(), 'src/components/PauseOverlay.vue'), 'utf8')
    const special = readFileSync(resolve(process.cwd(), 'src/components/es2/hero-roster/HeroSpecialAction.vue'), 'utf8')
    const app = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')
    expect(pause).toContain('<Es2Dialog')
    expect(special).toContain('joystickSide?:')
    expect(special).toContain('data-side')
    expect(app).toContain(':joystick-side="accessibilityPreferences.joystickSide"')
  })

  it('uses the compact portrait special button in phone landscape wider than 760px instead of clipping it', () => {
    const special = readFileSync(resolve(process.cwd(), 'src/components/es2/hero-roster/HeroSpecialAction.vue'), 'utf8')
    // 812×375 / 932×430 phones: the 160px desktop button overflowed the 100px landscape column.
    expect(special).toMatch(/@media \(max-width: 760px\), \(orientation: landscape\) and \(max-height: 440px\) \{\s*\.es2-hero-special__button \{ min-width: 66px; width: 66px;/)
  })
})
