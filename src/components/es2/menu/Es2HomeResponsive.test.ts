import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { nextTick } from 'vue'
import Es2MainMenu from './Es2MainMenu.vue'
import { JOB } from '../../../game/constants'
import { emptyProfile } from '../../../meta/profile'
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

describe('homepage game title', () => {
  it('updates the title when switching locale without remounting', async () => {
    const locale = getLocale()
    try {
      setLocale('en')
      const wrapper = menu()
      const heading = wrapper.get('.es2-menu-brand h1')
      expect(heading.text()).toBe('ECLIPSE SURVIVORS')
      expect(heading.get('em').text()).toBe('SURVIVORS')
      expect(document.title).toBe('Eclipse Survivors')

      setLocale('zh-TW')
      await nextTick()
      expect(heading.text()).toBe('暮境遠征')
      expect(document.title).toBe('暮境遠征｜ECLIPSE SURVIVORS')

      setLocale('en')
      await nextTick()
      expect(heading.text()).toBe('ECLIPSE SURVIVORS')
      expect(heading.get('em').text()).toBe('SURVIVORS')
    } finally {
      setLocale(locale)
    }
  })
})

describe('homepage image alternative text', () => {
  afterEach(() => setLocale('zh-TW'))

  it('never mixes Chinese fragments into English hero art and skill icon labels', () => {
    setLocale('en')
    const alts = menu().findAll('img[alt]').map(image => image.attributes('alt')!).filter(Boolean)
    expect(alts).toContain('Nightmark Ranger original character illustration')
    for (const alt of alts) expect(alt, alt).not.toMatch(/[㐀-鿿]/)
  })

  it('keeps the Traditional Chinese hero art label', () => {
    setLocale('zh-TW')
    expect(menu().get('[data-hero="ranger"] img').attributes('alt')).toBe('夜痕遊俠 原始角色插畫')
  })
})

describe('phone homepage viewport-first navigation', () => {
  it.each(['zh-TW', 'en'] as const)('omits decorative hero serial labels in %s while retaining all six hero cards', locale => {
    const previous = getLocale()
    try {
      setLocale(locale)
      const wrapper = menu()
      const cards = wrapper.findAll('.es2-hero-select-card')
      expect(cards).toHaveLength(6)
      for (const card of cards) {
        expect(card.find('.es2-hero-number').exists()).toBe(false)
        expect(card.text()).not.toMatch(/0[1-6]\s*\/\s*HERO/i)
        expect(card.attributes('aria-label')).toBeTruthy()
      }
    } finally {
      setLocale(previous)
    }
  })

  it.each(['zh-TW', 'en'] as const)('keeps one shared selected-hero indicator across all six heroes in %s', async locale => {
    const previous = getLocale()
    try {
      setLocale(locale)
      const wrapper = menu()
      for (const id of ['knight', 'ranger', 'wizard', 'shadowblade', 'spirit-summoner', 'crimson-paladin'] as const) {
        await wrapper.setProps({ heroId: id })
        const selected = wrapper.get('.es2-hero-select-card[aria-pressed="true"]')
        expect(selected.attributes('data-hero') ?? selected.attributes('data-hero-id')).toBe(id)
        expect(wrapper.findAll('[data-es2-hero-selected]')).toHaveLength(1)
        expect(selected.get('[data-es2-hero-selected]').text()).toMatch(/已選擇|selected/i)
        expect(wrapper.findAll('.es2-hero-selection-status')).toHaveLength(6)
        expect(wrapper.findAll('.es2-hero-select-card[aria-pressed="false"] [data-es2-hero-selected]')).toHaveLength(0)
      }
    } finally { setLocale(previous) }
  })

  it('keeps each classic hero\'s four base stats on its card without a duplicate panel', () => {
    const wrapper = menu()
    for (const id of ['knight', 'ranger', 'wizard'] as const) {
      const preview = wrapper.get(`[data-hero="${id}"] [data-es2-classic-preview]`)
      for (const value of [JOB[id].hp, JOB[id].damage, JOB[id].speed, JOB[id].delay]) {
        expect(preview.text()).toContain(String(value))
      }
      expect(preview.classes()).toEqual(expect.arrayContaining(['es2-hero-stat-strip', 'es2-roster__stats']))
    }
    expect(wrapper.find('[data-es2-classic-details]').exists()).toBe(false)
  })

  it('opens hero-specific details without changing selection for classic and new heroes', async () => {
    const wrapper = menu()
    for (const id of ['knight', 'wizard', 'shadowblade', 'spirit-summoner'] as const) {
      await wrapper.get(`[data-es2-hero-details="${id}"]`).trigger('click')
      const dialog = document.body.querySelector('[role="dialog"]')
      expect(dialog?.textContent).toContain('HP')
      expect(dialog?.textContent).toContain('ATK CD')
      expect(dialog?.querySelectorAll('.es2-hero-stat')).toHaveLength(4)
      if (id === 'shadowblade' || id === 'spirit-summoner') {
        expect(dialog?.textContent).toContain('起始武器')
        expect(dialog?.textContent).toContain('主動技能')
        expect(dialog?.textContent).toContain('優勢')
        expect(dialog?.textContent).toContain('弱點')
      }
      expect(wrapper.emitted('select')).toBeUndefined()
      expect(wrapper.emitted('selectHero')).toBeUndefined()
      document.body.querySelector<HTMLButtonElement>('.es2-dialog .es2-close')!.click()
      await nextTick()
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    }
  })

  it('translates the shared hero details action and dialog into English', async () => {
    const locale = getLocale()
    try {
      setLocale('en')
      const wrapper = menu({ choice: 'wizard' })
      const trigger = wrapper.get('[data-es2-hero-details="wizard"]')
      expect(trigger.attributes('aria-label')).toContain('View hero details')
      await trigger.trigger('click')
      const dialog = document.body.querySelector('[role="dialog"]')
      expect(dialog?.textContent).toContain('HP')
      expect(dialog?.textContent).toContain('ATK')
      expect(dialog?.textContent).not.toMatch(/[\u3400-\u9fff]/)
    } finally {
      setLocale(locale)
    }
  })

  it('provides the accessible per-hero details action', () => {
    expect(css).toContain('.es2-hero-detail-trigger{display:none}')
    expect(css).toContain('.es2-menu .es2-hero-detail-trigger')
    expect(css).toContain('.es2-hero-detail-content .es2-hero-stat-strip')
    expect(css).toContain('minmax(0,1fr)')
  })

  it('shows all six heroes on the initial page and preserves selection across expedition navigation', async () => {
    const wrapper = menu()
    expect(wrapper.get('[data-es2-menu-page]').attributes('data-es2-menu-page')).toBe('heroes')
    expect(wrapper.findAll('[data-hero]')).toHaveLength(3)
    expect(wrapper.findAll('[data-hero-id]')).toHaveLength(3)
    expect((wrapper.get('.es2-hero-section').element as HTMLElement).style.display).not.toBe('none')
    expect((wrapper.get('.es2-mode-section').element as HTMLElement).style.display).toBe('none')
    await wrapper.get('[data-hero-id="shadowblade"]').trigger('click')
    expect(wrapper.emitted('selectHero')).toEqual([['shadowblade']])
    await wrapper.setProps({ heroId: 'shadowblade' })
    await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
    expect(wrapper.get('[data-es2-menu-page]').attributes('data-es2-menu-page')).toBe('modes')
    expect((wrapper.get('.es2-hero-section').element as HTMLElement).style.display).toBe('none')
    expect((wrapper.get('.es2-mode-section').element as HTMLElement).style.display).not.toBe('none')
    expect(wrapper.findAll('[data-mode]')).toHaveLength(4)
    expect(wrapper.findAll('[data-objective-mode]')).toHaveLength(5)
    await wrapper.get('[data-objective-mode="boss-rush"]').trigger('click')
    expect(wrapper.emitted('mode')).toEqual([['boss-rush']])
    await wrapper.setProps({ runMode: 'boss-rush' })
    expect(wrapper.emitted('start')).toBeUndefined()
    await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
    expect((wrapper.get('.es2-hero-section').element as HTMLElement).style.display).not.toBe('none')
    expect(wrapper.get('[data-hero-id="shadowblade"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-es2-selected-hero]').attributes('data-es2-selected-hero')).toBe('shadowblade')
    expect(wrapper.get('.es2-mobile-selected-mode').text()).toContain('首領連戰')
    await wrapper.get('.es2-start').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('keeps a short localized expedition brief visible on the hero page and updates it from the selected mode', async () => {
    const locale = getLocale()
    try {
      setLocale('zh-TW')
      const wrapper = menu({ runMode: 'quick' })
      const brief = wrapper.get('[data-es2-expedition-summary]')
      expect(brief.text()).toContain('迅捷遠征')
      expect(brief.get('[data-es2-mode-summary]').text()).toContain('150 秒決戰')
      const cases = [
        ['boss-rush', '五位首領', 'Boss Rush'],
        ['endless-eclipse', '星蝕事件', 'Endless Eclipse'],
        ['relic-hunt', '四件聖物', 'Relic Hunt'],
        ['cursed-expedition', '兩位守衛', 'Cursed Expedition'],
        ['chaos-arena', '八波', 'Chaos Arena'],
      ] as const
      for (const [mode, summary, title] of cases) {
        await wrapper.setProps({ runMode: mode })
        expect(brief.get('[data-es2-mode-summary]').text()).toContain(summary)
        setLocale('en')
        await nextTick()
        expect(brief.text()).toContain(title)
        expect(brief.get('[data-es2-mode-summary]').text()).not.toMatch(/[\u3400-\u9fff]/)
        setLocale('zh-TW')
        await nextTick()
      }
      await brief.trigger('click')
      expect(wrapper.get('[data-es2-menu-page]').attributes('data-es2-menu-page')).toBe('modes')
      expect(wrapper.emitted('start')).toBeUndefined()
      expect(wrapper.get('[data-es2-portal-decoration]').attributes('aria-hidden')).toBe('true')
      await wrapper.get('.es2-start').trigger('click')
      expect(wrapper.emitted('start')).toHaveLength(1)
    } finally { setLocale(locale) }
  })

  it('shows the actual ember balance as a distinct localized resource on both lobby pages', async () => {
    const locale = getLocale()
    try {
      setLocale('zh-TW')
      const wrapper = menu({ profile: { ...emptyProfile(), embers: 175 } })
      const wallet = wrapper.get('[data-es2-ember-wallet]')
      expect(wallet.get('[data-es2-ember-value]').text()).toBe('175')
      expect(wallet.get('.es2-embers-label').text()).toBe('暮光餘燼')
      expect(wallet.get('.es2-embers-icon').attributes('aria-hidden')).toBe('true')
      await wrapper.setProps({ profile: { ...emptyProfile(), embers: 1234567 } })
      expect(wallet.get('[data-es2-ember-value]').text()).toBe('1,234,567')
      await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
      expect(wallet.get('[data-es2-ember-value]').text()).toBe('1,234,567')
      setLocale('en')
      await nextTick()
      expect(wallet.get('.es2-embers-label').text()).toBe('Twilight Embers')
      expect(wrapper.findAll('[data-es2-ember-wallet]')).toHaveLength(1)
    } finally { setLocale(locale) }
  })

  it('makes every archive entry a direct top navigation action on both pages', async () => {
    const wrapper = menu()
    const nav = wrapper.get('[data-es2-hall-navigation]')
    expect(nav.findAll('button')).toHaveLength(5)
    expect(wrapper.find('[data-es2-mobile-archive-toggle]').exists()).toBe(false)
    await nav.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['progression']])
    await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
    await nav.findAll('button')[4]!.trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['progression'], ['achievements']])
  })
})

describe('homepage menu layout across devices', () => {
  it('uses only a gear for settings in both languages and keeps its accessible action', async () => {
    const previous = getLocale()
    try {
      const wrapper = menu()
      const settings = wrapper.get('[data-es2-settings]')
      for (const locale of ['zh-TW', 'en'] as const) {
        setLocale(locale)
        await nextTick()
        expect(settings.text()).toBe('⚙')
        expect(settings.attributes('aria-label')).toBeTruthy()
        expect(settings.attributes('title')).toBe(settings.attributes('aria-label'))
      }
      await settings.trigger('click')
      expect(wrapper.emitted('settings')).toHaveLength(1)
      expect(css).toContain('grid-template-areas:"version account settings"')
    } finally { setLocale(previous) }
  })

  it('keeps the start dock separate from the scrollable hero or mode page', () => {
    expect(css).toMatch(/\.es2-menu-action-bar\s*\{[^}]*position:fixed;[^}]*bottom:0/)
    expect(css).toMatch(/\.es2-menu\s*\{[^}]*bottom:var\(--es2-action-bar-height/)
    expect(css).toMatch(/\.es2-menu-action-bar\s*\{[^}]*env\(safe-area-inset-bottom\)/)
  })

  it.each([
    '.es2-hero-stat-label', '.es2-hero-stat-value',
    '.es2-mode-time', '#gameVersion', '.es2-hero-selection', '.es2-roster__selection',
    '.es2-mode-copy strong', '.es2-objective-choice strong',
  ])('keeps explicitly sized %s text at least 11 CSS px', selector => {
    const fontSizes = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selectors]) => selectors!.includes(selector))
      .flatMap(([, , declarations]) => [...declarations!.matchAll(/font(?:-size)?:\s*(?:\d+\s+)?(?:clamp\()?([\d.]+)(rem|px)/g)])
      .map(([, amount, unit]) => Number(amount) * (unit === 'rem' ? 16 : 1))
    expect(fontSizes.length).toBeGreaterThan(0)
    expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(11)
  })
})

describe('in-game volume control shares HUD action button geometry', () => {
  it('uses one common HTML class on sound, home, settings and pause, and one CSS size rule', () => {
    expect(hudSource).toContain('class="es2-hud__control-button"')
    expect(hudSource.match(/class="es2-hud__control-button"/g)).toHaveLength(3)
    expect(hudCss).toMatch(/\.es2-hud__controls \.es2-hud__control-button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/)
    expect(hudCss).not.toContain('.es2-hud__controls .audio-trigger')
  })

  it.each(['menu', 'hud'] as const)('uses the same independent mute indicators in the %s audio popover', async context => {
    const audio = mount(AudioControl, { attachTo: document.body, props: {
      context, active: true, musicOn: false, sfxOn: false, musicVolume: 80, sfxVolume: 75,
    } })
    wrappers.push(audio)
    await audio.get('.audio-trigger').trigger('click')
    const music = document.getElementById(context + 'MusicMute')!
    const sfx = document.getElementById(context + 'SfxMute')!
    expect(music.querySelector('svg[data-audio-icon="music-muted"] path[data-mute-mark]')).not.toBeNull()
    expect(sfx.querySelector('svg[data-audio-icon="sfx-muted"] path[data-mute-mark]')).not.toBeNull()
    expect(music.getAttribute('aria-pressed')).toBe('true')
    expect(sfx.getAttribute('aria-pressed')).toBe('true')
    music.click()
    expect(audio.emitted('toggleMusic')).toHaveLength(1)
    await audio.setProps({ musicOn: true })
    expect(music.textContent).toBe('♫')
    expect(music.querySelector('svg')).toBeNull()
    expect(sfx.querySelector('[data-audio-icon="sfx-muted"]')).not.toBeNull()
    sfx.click()
    expect(audio.emitted('toggleSfx')).toHaveLength(1)
    await audio.setProps({ sfxOn: true })
    expect(sfx.textContent).toBe('♬')
    expect(sfx.querySelector('svg')).toBeNull()
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
