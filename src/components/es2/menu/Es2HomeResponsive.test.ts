import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { nextTick } from 'vue'
import Es2MainMenu from './Es2MainMenu.vue'
import { JOB } from '../../../game/constants'
import { setLocale, getLocale } from '../../../i18n'
import AudioControl from '../../AudioControl.vue'

const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
const hudCss = readFileSync(resolve('src/styles/es2/hud.css'), 'utf8')
const hudSource = readFileSync(resolve('src/components/es2/hud/CombatHud.vue'), 'utf8')
const wrappers: VueWrapper[] = []
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount() })

function menu(props: Record<string, unknown> = {}) {
  const wrapper = mount(Es2MainMenu, { props: {
    choice: 'knight', runMode: 'quick', version: '1.2.0', ...props,
  } })
  wrappers.push(wrapper)
  return wrapper
}

describe('phone homepage viewport-first navigation', () => {
  it('presents live classic-hero HP, attack, movement and attack cadence with a contextual role summary', async () => {
    const wrapper = menu()
    for (const id of ['knight', 'ranger', 'wizard'] as const) {
      const preview = wrapper.get(`[data-hero="${id}"] [data-es2-classic-preview]`)
      expect(preview.text()).toContain(String(JOB[id].hp))
      expect(preview.text()).toContain(String(JOB[id].damage))
      await wrapper.setProps({ heroId: id, choice: id })
      const detail = wrapper.get('[data-es2-classic-details]')
      expect(detail.attributes('data-es2-classic-details')).toBe(id)
      expect(detail.get('[data-es2-classic-stat="hp"]').text()).toContain(String(JOB[id].hp))
      expect(detail.get('[data-es2-classic-stat="attack"]').text()).toContain(String(JOB[id].damage))
      expect(detail.get('[data-es2-classic-stat="speed"]').text()).toContain(String(JOB[id].speed))
      expect(detail.get('[data-es2-classic-stat="interval"]').text()).toContain(String(JOB[id].delay))
      expect(detail.get('[data-es2-classic-role]').text().length).toBeGreaterThan(10)
    }
    await wrapper.setProps({ heroId: 'shadowblade' })
    expect(wrapper.find('[data-es2-classic-details]').exists()).toBe(false)
  })

  it('provides real English labels for classic hero stats without leaking Chinese role text', async () => {
    const locale = getLocale()
    try {
      setLocale('en')
      const wrapper = menu({ choice: 'wizard' })
      expect(wrapper.get('[data-es2-classic-details]').text()).toContain('HP')
      expect(wrapper.get('[data-es2-classic-details]').text()).toContain('ATK')
      expect(wrapper.get('[data-es2-classic-role]').text()).not.toMatch(/[\u3400-\u9fff]/)
    } finally {
      setLocale(locale)
    }
  })

  it('keeps classic hero details readable on phones and compact in short landscape', () => {
    expect(css).toContain('.es2-classic-details')
    expect(css).toContain('.es2-classic-stat-grid')
    expect(css).toContain('.es2-menu[data-mobile-heroes="new"] .es2-classic-details')
    expect(css).toContain('minmax(0,1fr)')
  })
  it('switches hero categories without duplicating cards or changing the selected hero', async () => {
    const wrapper = menu()
    expect(wrapper.findAll('[data-hero]')).toHaveLength(3)
    expect(wrapper.findAll('[data-hero-id]')).toHaveLength(3)
    const classic = wrapper.get('[data-es2-mobile-hero-tab="classic"]')
    const newHeroes = wrapper.get('[data-es2-mobile-hero-tab="new"]')
    expect(classic.attributes('aria-pressed')).toBe('true')
    await newHeroes.trigger('click')
    expect(wrapper.get('.es2-menu').attributes('data-mobile-heroes')).toBe('new')
    expect(newHeroes.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero="knight"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-hero-id="shadowblade"]').trigger('click')
    expect(wrapper.emitted('selectHero')).toEqual([['shadowblade']])
    await wrapper.setProps({ heroId: 'shadowblade' })
    await nextTick()
    expect(wrapper.get('.es2-menu').attributes('data-mobile-heroes')).toBe('new')
    await wrapper.setProps({ heroId: undefined, choice: 'ranger' })
    await nextTick()
    expect(wrapper.get('.es2-menu').attributes('data-mobile-heroes')).toBe('classic')
  })

  it('keeps the actual selected hero readable even when the other hero category is shown', async () => {
    const wrapper = menu()
    await wrapper.get('[data-es2-mobile-hero-tab="new"]').trigger('click')
    expect(wrapper.get('[data-es2-selected-hero]').text().length).toBeGreaterThan(0)
    await wrapper.setProps({ heroId: 'shadowblade' })
    await nextTick()
    expect(wrapper.get('[data-es2-selected-hero]').attributes('data-es2-selected-hero')).toBe('shadowblade')
  })

  it('allows switching between the existing four modes and all five objective modes', async () => {
    const wrapper = menu()
    expect(wrapper.findAll('[data-mode]')).toHaveLength(4)
    expect(wrapper.findAll('[data-objective-mode]')).toHaveLength(5)
    await wrapper.get('[data-es2-mobile-mode-tab="objective"]').trigger('click')
    expect(wrapper.get('.es2-menu').attributes('data-mobile-modes')).toBe('objective')
    await wrapper.get('[data-objective-mode="boss-rush"]').trigger('click')
    expect(wrapper.emitted('mode')).toEqual([['boss-rush']])
    await wrapper.setProps({ runMode: 'boss-rush' })
    await nextTick()
    expect(wrapper.get('.es2-menu').attributes('data-mobile-modes')).toBe('objective')
    await wrapper.setProps({ runMode: 'quick' })
    await nextTick()
    expect(wrapper.get('.es2-menu').attributes('data-mobile-modes')).toBe('classic')
    await wrapper.get('.es2-start').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('keeps archive actions available through a compact disclosure without losing original links', async () => {
    const wrapper = menu()
    expect(wrapper.findAll('.es2-hall-links button')).toHaveLength(5)
    expect(wrapper.get('[data-es2-mobile-archive-toggle]').attributes('aria-expanded')).toBe('false')
    await wrapper.get('[data-es2-mobile-archive-toggle]').trigger('click')
    expect(wrapper.get('[data-es2-mobile-archive-toggle]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.es2-menu').classes()).toContain('es2-mobile-archive-open')
    await wrapper.get('.es2-hall-links button').trigger('click')
    expect(wrapper.emitted('navigate')).toBeDefined()
  })

  it('uses two-column short-landscape layout and compact portrait artwork without hiding the start button', () => {
    expect(css).toContain('@media (orientation: portrait) and (max-width: 700px)')
    expect(css).toContain('@media (orientation: landscape) and (max-height: 520px) and (max-width: 900px)')
    expect(css).toMatch(/\.es2-menu-layout\s*\{\s*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/)
    expect(css).toContain('.es2-menu[data-mobile-heroes="new"] .es2-hero-grid')
    expect(css).toContain('.es2-menu[data-mobile-modes="objective"] .es2-mode-grid')
    expect(css).toContain('.es2-menu .es2-hero-section .es2-roster__portrait')
    expect(css).toContain('env(safe-area-inset-bottom)')
    expect(css).toContain('100dvh')
    expect(css).not.toContain('-webkit-line-clamp')
  })
})

describe('in-game volume control shares HUD action button geometry', () => {
  it('uses one common HTML class on sound, home, settings and pause, and one CSS size rule', () => {
    expect(hudSource).toContain('class="es2-hud__control-button"')
    expect(hudSource.match(/class="es2-hud__control-button"/g)).toHaveLength(3)
    expect(hudCss).toMatch(/\.es2-hud__controls \.es2-hud__control-button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/)
    expect(hudCss).not.toContain('.es2-hud__controls .audio-trigger')
  })

  it('adds shared class only to the HUD audio trigger and preserves the menu audio button', () => {
    const base = { active: true, musicOn: true, sfxOn: true, musicVolume: 80, sfxVolume: 75, compact: true }
    const hud = mount(AudioControl, { props: { ...base, context: 'hud' } })
    const menuAudio = mount(AudioControl, { props: { ...base, context: 'menu' } })
    wrappers.push(hud, menuAudio)
    expect(hud.get('.audio-trigger').classes()).toContain('es2-hud__control-button')
    expect(menuAudio.get('.audio-trigger').classes()).not.toContain('es2-hud__control-button')
  })
})
