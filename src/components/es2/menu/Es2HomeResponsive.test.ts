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
import { defineComponent, nextTick as flushImageUpdate, ref } from 'vue'
import { vImageShimmer } from '../../shared/image-shimmer'
import { MODES } from '../../../meta/modes'

const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
const hudCss = readFileSync(resolve('src/styles/es2/hud.css'), 'utf8')
const hudSource = readFileSync(resolve('src/components/es2/hud/CombatHud.vue'), 'utf8')
const wrappers: VueWrapper[] = []

describe('shared homepage image loading', () => {
  it('applies one loading-state contract to every initial lobby image and action atlas', async () => {
    const wrapper = menu()
    for (const image of wrapper.findAll('.es2-menu img')) {
      expect(['loading', 'loaded', 'error']).toContain(image.attributes('data-es2-image-state'))
    }
    expect(wrapper.findAll('.es2-hero-action-preview[data-es2-image-state]')).toHaveLength(3)
    const portrait = wrapper.get('[data-hero="ranger"] img')
    await portrait.trigger('load')
    expect(portrait.attributes('data-es2-image-state')).toBe('loaded')
    const skill = wrapper.get('[data-hero="ranger"] [data-hero-skill-icon]')
    await skill.trigger('error')
    expect(skill.attributes('data-es2-image-state')).toBe('error')
  })

  it('resets a reused image on source change without replacing its DOM or dimensions', async () => {
    const source = ref('/first.webp')
    const wrapper = mount(defineComponent({
      directives: { imageShimmer: vImageShimmer },
      setup: () => ({ source }),
      template: '<img v-image-shimmer="source" :src="source" width="44" height="44" alt="" />',
    }))
    wrappers.push(wrapper)
    const img = wrapper.get('img')
    await img.trigger('load')
    expect(img.attributes('data-es2-image-state')).toBe('loaded')
    source.value = '/second.webp'
    await flushImageUpdate()
    expect(img.attributes('data-es2-image-state')).toBe('loading')
    expect(wrapper.get('img').element).toBe(img.element)
    expect(img.attributes('width')).toBe('44')
    expect(img.attributes('height')).toBe('44')
  })
})
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount() })

function menu(props: Record<string, unknown> = {}) {
  const wrapper = mount(Es2MainMenu, { props: {
    choice: 'knight', runMode: 'quick', version: '1.2.0', ...props,
  } })
  wrappers.push(wrapper)
  return wrapper
}

describe('classic expedition duration', () => {
  it('separates a readable infinity symbol or numeric duration from its unit', async () => {
    const wrapper = menu({ runMode: 'quick' })
    await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
    for (const id of ['quick', 'standard', 'endless', 'challenge'] as const) {
      const time = wrapper.get(`[data-mode="${id}"] .es2-mode-time`)
      const duration = MODES[id].duration
      expect(time.get('[data-es2-mode-time-value]').text()).toBe(duration === null ? '∞' : String(Math.ceil(duration / 60)))
      expect(time.find('[data-es2-mode-time-unit]').exists()).toBe(duration !== null)
      expect(time.attributes('aria-label')).toBeTruthy()
    }
  })
})

describe('homepage expedition recommendation', () => {
  it('renders the HOT component only on enabled modes, regardless of selection', async () => {
    const wrapper = menu({ runMode: 'quick' })
    await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
    const enabled = Object.values(MODES).filter(mode => mode.hot).map(mode => mode.id)
    const marked = wrapper.findAll('[data-mode], [data-objective-mode]')
      .filter(card => card.find('[data-es2-mode-hot]').exists())
      .map(card => card.attributes('data-mode') ?? card.attributes('data-objective-mode'))
    expect(marked).toEqual(enabled)
    expect(marked).toEqual(['boss-rush'])
  })
})

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

  it('keeps both keyboard navigation groups wrapped without changing their event contracts', async () => {
    const wrapper = menu()
    await wrapper.get('[data-hero="knight"]').trigger('keydown', { key: 'ArrowLeft' })
    await wrapper.get('[data-hero-id="shadowblade"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('select')).toEqual([['wizard']])
    expect(wrapper.emitted('selectHero')).toEqual([['crimson-paladin']])
    expect(wrapper.emitted('start')).toBeUndefined()
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
    expect(css).toMatch(/\.es2-hover-details\{[^}]*pointer-events:none/s)
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
    expect(wrapper.find('[data-es2-selected-hero]').exists()).toBe(false)
    expect(wrapper.get('.es2-mobile-selected-mode').text()).toContain('首領連戰')
    await wrapper.get('.es2-start').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('keeps the expedition brief independent of hero selection in both locales and on both pages', async () => {
    const previous = getLocale()
    try {
      for (const locale of ['zh-TW', 'en'] as const) {
        setLocale(locale)
        const wrapper = menu({ choice: 'ranger', heroId: 'ranger', runMode: 'boss-rush' })
        const brief = wrapper.get('[data-es2-expedition-summary]')
        for (const page of ['heroes', 'modes'] as const) {
          expect(wrapper.get('[data-es2-menu-page]').attributes('data-es2-menu-page')).toBe(page)
          await wrapper.setProps({ heroId: 'ranger' })
          const copy = brief.text()
          const label = brief.attributes('aria-label')
          expect(brief.find('.es2-expedition-hero, [data-es2-selected-hero]').exists()).toBe(false)
          await wrapper.setProps({ heroId: 'shadowblade' })
          expect(brief.text()).toBe(copy)
          expect(brief.attributes('aria-label')).toBe(label)
          expect(wrapper.get('[data-hero-id="shadowblade"]').attributes('aria-pressed')).toBe('true')
          if (page === 'heroes') await brief.trigger('click')
        }
      }
    } finally { setLocale(previous) }
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
  it('keeps interactive page geometry stationary throughout entry transitions', () => {
    expect(css).toMatch(/\.es2-hero-section\s*,\s*\.es2-mode-section\s*\{\s*animation:\s*es2-scene-fade\b/)
    expect(css).not.toMatch(/\.es2-(?:hero|mode)-section\s*\{[^}]*--es2-scene-from:/)
  })

  it('shares the icon and visual identity for all nine modes on both lobby pages', async () => {
    const wrapper = menu()
    const brief = wrapper.get('[data-es2-expedition-summary]')
    const cases = Object.values(MODES).map(mode => mode.id)
    for (const page of ['heroes', 'modes'] as const) {
      expect(wrapper.get('[data-es2-menu-page]').attributes('data-es2-menu-page')).toBe(page)
      for (const id of cases) {
        await wrapper.setProps({ runMode: id })
        const card = wrapper.get(`[data-mode="${id}"], [data-objective-mode="${id}"]`)
        expect(card.attributes('aria-checked')).toBe('true')
        expect(card.attributes('data-es2-mode-theme')).toBe(id)
        expect(brief.attributes('data-es2-mode-theme')).toBe(id)
        const cardIcon = card.get('.es2-mode-sigil')
        const dockIcon = brief.get('.es2-mode-sigil')
        const src = cardIcon.get('img').attributes('src')
        expect(src).toContain(id + '@3x.webp')
        expect(dockIcon.get('img').attributes('src')).toBe(src)
        for (const icon of [cardIcon, dockIcon]) {
          expect(icon.attributes('aria-hidden')).toBe('true')
          expect(icon.get('img').attributes('alt')).toBe('')
          expect(icon.text()).toBe('')
        }
        expect(css).toContain(`[data-es2-mode-theme="${id}"]`)
        expect(brief.get('[data-es2-mode-summary]').text()).not.toBe('')
      }
      if (page === 'heroes') await brief.trigger('click')
    }
    const board = wrapper.get('[data-es2-expedition-board]')
    expect(board.findAll('[role="radiogroup"]')).toHaveLength(0)
    expect(board.attributes('role')).toBe('radiogroup')
    expect(board.findAll('[role="radio"]')).toHaveLength(9)
    expect(board.findAll('[aria-checked="true"]')).toHaveLength(1)
    expect(board.findAll('.es2-mode-radio')).toHaveLength(0)
  })
  it('uses a shared responsive card/detail emblem size, matching title color and duration chip', () => {
    expect(css).toContain('.es2-mode-sigil:is(.es2-mode-mark,.es2-objective-sigil,.es2-mode-detail-sigil){width:var(--es2-mode-card-sigil-size)')
    for (const size of [48, 40, 36, 30]) expect(css).toContain('--es2-mode-card-sigil-size:' + size + 'px')
    expect(css).not.toContain('.es2-mode-detail-sigil{width:36px')
    expect(css).toContain('.es2-menu .es2-expedition-sigil{width:56px')
    expect(css).toContain('.es2-expedition-board .es2-mode-grid{grid-template-columns:minmax(0,1fr)}')
    expect(board.findAll('[data-es2-mode-details]')).toHaveLength(9)
    expect(css).toMatch(/\.es2-menu \.es2-expedition-name\{[^}]*color:var\(--es2-mode-accent\)[^}]*font:800/)
    expect(css).toMatch(/\.es2-menu \.es2-expedition-duration\{[^}]*display:inline-block[^}]*border:1px solid[^}]*font-variant-numeric:tabular-nums/)
    expect(css).toMatch(/\.es2-menu \.es2-expedition-meta\{[^}]*font:500 max\(\.6875rem/)
  })

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

  it('keeps both bottom actions outside the scrolling surface in both lobby pages and hides them in the hall', async () => {
    const wrapper = menu()
    const root = wrapper.get('.es2-menu').element
    const scroll = wrapper.get('.es2-menu-scroll').element
    const dock = wrapper.get('.es2-menu-action-bar').element as HTMLElement
    expect(scroll.parentElement).toBe(root)
    expect(dock.parentElement).toBe(root)
    expect(scroll.contains(dock)).toBe(false)
    expect(scroll.contains(wrapper.get('.es2-hero-section').element)).toBe(true)
    expect(scroll.contains(wrapper.get('.es2-mode-section').element)).toBe(true)
    expect(dock.contains(wrapper.get('.es2-start').element)).toBe(true)
    expect(dock.contains(wrapper.get('[data-es2-expedition-navigation]').element)).toBe(true)
    expect(css).toMatch(/\.es2-menu\s*\{[^}]*height:100dvh;[^}]*overflow:hidden/)
    expect(css).toMatch(/\.es2-menu-scroll\s*\{[^}]*min-height:0;[^}]*overflow-y:auto/)
    expect(css).toMatch(/\.es2-menu-action-bar\s*\{[^}]*position:relative;[^}]*flex:0 0 auto/)
    expect(css).toMatch(/\.es2-menu-action-bar\s*\{[^}]*env\(safe-area-inset-bottom\)/)
    expect(css).not.toContain('bottom:var(--es2-action-bar-height')
    await wrapper.get('[data-es2-expedition-navigation]').trigger('click')
    expect(dock.style.display).not.toBe('none')
    await wrapper.setProps({ archiveView: 'progression' })
    expect(dock.style.display).toBe('none')
    await wrapper.setProps({ archiveView: 'main' })
    expect(dock.style.display).not.toBe('none')
    await wrapper.get('.es2-start').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it.each([
    '.es2-hero-stat-label', '.es2-hero-stat-value',
    '#gameVersion', '.es2-hero-selection', '.es2-roster__selection',
    '.es2-mode-copy strong',
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

describe('portal start interaction feedback', () => {
  it('keeps decorative hover feedback pointer-transparent and never starts gameplay on entry', async () => {
    const wrapper = menu()
    const start = wrapper.get('.es2-portal-start')
    expect(start.get('.es2-portal-sheen').attributes('aria-hidden')).toBe('true')
    await start.trigger('pointerenter')
    await start.trigger('mouseover')
    await start.trigger('focus')
    expect(wrapper.emitted('start')).toBeUndefined()
    await start.trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })
  it('provides a finite fine-pointer sweep, press feedback, focus and reduced-flashing fallback', () => {
    for (const token of [".es2-portal-start:hover:not(:disabled) .es2-portal-sheen::before","animation:es2-portal-sweep .72s","@keyframes es2-portal-sweep",".es2-portal-start:active:not(:disabled) .es2-portal-core","[data-es2-reduce-flashing=\"true\"] .es2-portal-start",".es2-portal-start:focus-visible:not(:disabled)"]) expect(css).toContain(token)
    expect(css).toMatch(/\.es2-portal-sheen\s*\{[^}]*pointer-events:none/)
    expect(css).toMatch(/@media\s*\(hover:hover\) and \(pointer:fine\)\s*\{\s*\.es2-menu \.es2-portal-start:hover/)
    expect(css).toContain("--es2-portal-rim:linear-gradient(100deg,#c8862f,#fff1c2 22%,#ffc960 52%,#b8742a 78%,#fff0bd);")
    expect(css).toContain("--es2-portal-fill:radial-gradient(ellipse 70% 120% at 50% 125%,#ffcf73,#f0743cd9 38%,#a3283f80 64%,transparent 84%),linear-gradient(180deg,#5b2147,#3a1638 52%,#1d0c24);")
    expect(css).not.toContain('--es2-portal-lit-rim')
    expect(css).not.toContain('--es2-portal-lit-fill')
    expect(css).not.toMatch(/\.es2-portal-start:hover:not\(:disabled\) \.es2-portal-label\s*\{/)
    expect(css).toContain('.es2-menu .es2-portal-start:hover:not(:disabled) .es2-portal-decoration{transform:scale(1.08);box-shadow:0 0 26px #ffda85bf,inset 0 0 16px #ffe9b1c4}')
    expect(css).toContain('.es2-menu .es2-portal-start:hover:not(:disabled) .es2-portal-core{transform:scale(1.13) rotate(12deg)}')
    expect(css).toContain('.es2-portal-start:active:not(:disabled) .es2-portal-core{transform:scale(.92)}')
    expect(css).toContain('.es2-portal-start:active:not(:disabled) .es2-portal-decoration{transform:scale(.96)}')
    expect(css).toContain('box-shadow:0 0 19px #ffda8588,inset 0 0 13px #f5c27399')
  })
  it('lifts and brightens the whole gate on hover/focus and breathes an idle ember glow that motion settings stop', () => {
    expect(css).toContain('.es2-menu .es2-portal-start:is(:hover,:focus-visible):not(:disabled){transform:translateY(-2px) scale(1.035);filter:brightness(1.14) saturate(1.1) drop-shadow(0 0 14px #ffb052d9)}')
    expect(css).toMatch(/\.es2-menu \.es2-portal-start\{[^}]*filter:drop-shadow\(0 0 9px #ff8f4a80\)[^}]*transition:transform \.22s/)
    expect(css).toMatch(/\.es2-menu \.es2-portal-sheen\{[^}]*animation:es2-portal-breathe 2\.6s ease-in-out infinite/)
    expect(css).toContain('@keyframes es2-portal-breathe{0%,100%{opacity:.35}50%{opacity:1}}')
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^@]*\.es2-menu \.es2-portal-start\{transition:none;transform:none!important\}[^@]*\.es2-menu \.es2-portal-sheen\{animation:none;opacity:\.75\}/)
    expect(css).toContain('[data-es2-reduce-flashing="true"] .es2-portal-start .es2-portal-sheen{animation:none;opacity:.75}')
    expect(css).toContain('[data-es2-reduce-motion="true"] .es2-portal-start .es2-portal-sheen{animation:none;opacity:.75}')
    // The brief turns cool steel so the warm ember gate is the only gold-lit action in the dock.
    expect(css).toContain('.es2-menu .es2-expedition-brief::before{background:#53677f}')
  })
  it('gives the expedition brief secondary-button affordance without out-ranking the portal', () => {
    // Resting chip + hover/focus rim, fill, chip and arrow response read as a button.
    expect(css).toMatch(/\.es2-menu \.es2-expedition-change\{[^}]*border:1px solid #6f87a6[^}]*border-radius:999px/)
    expect(css).toContain('.es2-menu .es2-expedition-brief:is(:hover,:focus-visible)::before{background:#a9c2df}')
    expect(css).toContain('.es2-menu .es2-expedition-brief:is(:hover,:focus-visible)::after{inset:2px;filter:brightness(1.5) saturate(1.2)}')
    expect(css).toContain('.es2-menu .es2-expedition-brief:is(:hover,:focus-visible) .es2-expedition-change{border-color:#e3eefb;background:#3a5a84;color:#fff}')
    expect(css).toContain('.es2-menu .es2-expedition-brief:is(:hover,:focus-visible) .es2-expedition-change-arrow{transform:translateX(3px)}')
    expect(css).toContain('.es2-menu .es2-expedition-brief[aria-controls="es2HeroPage"]:is(:hover,:focus-visible) .es2-expedition-change-arrow{transform:translateX(-3px)}')
    expect(css).toContain('.es2-menu .es2-expedition-brief:focus-visible{outline:2px solid #cfe0f5;outline-offset:2px}')
    expect(css).toContain('.es2-menu .es2-expedition-brief:active{filter:brightness(.94)}')
    // Hierarchy: the brief never lifts, scales or glows gold like the Start gate.
    const briefRules = [...css.matchAll(/\.es2-expedition-brief[^{]*\{([^}]*)\}/g)].map(match => match[1]).join(';')
    expect(briefRules).not.toMatch(/scale\(|translateY\(-|drop-shadow|#ff[a-f0-9]{4}/i)
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^@]*\.es2-menu \.es2-expedition-change-arrow\{transition:none;transform:none!important\}/)
  })
})

describe('lobby dock silhouette and layout', () => {
  it.each([
    ['en', 'Modes', 'Heroes', 'Change expedition', 'Back to heroes'],
    ['zh-TW', '模式', '英雄', '變更遠征', '返回英雄選擇'],
  ] as const)('uses short localized destinations and preserves the full action in %s', async (locale, forward, back, fullForward, fullBack) => {
    const previous = getLocale()
    try {
      setLocale(locale)
      const wrapper = menu()
      const button = wrapper.get('[data-es2-expedition-navigation]')
      const action = button.get('.es2-expedition-change')
      const label = () => action.get('.es2-expedition-change-label').text()
      expect(label()).toBe(forward)
      expect(button.attributes('aria-label')).toContain(forward)
      expect(button.attributes('aria-label')).toContain(fullForward)
      expect(button.attributes('title')).toBe(fullForward)
      expect(action.get('.es2-expedition-change-arrow').text()).toBe('›')
      expect(action.get('.es2-expedition-change-arrow').attributes('aria-hidden')).toBe('true')
      await button.trigger('click')
      expect(label()).toBe(back)
      expect(button.attributes('aria-label')).toContain(back)
      expect(button.attributes('aria-label')).toContain(fullBack)
      expect(button.attributes('title')).toBe(fullBack)
      expect(action.get('.es2-expedition-change-arrow').text()).toBe('‹')
    } finally { setLocale(previous) }
  })
  it('keeps the short dock label and its centered arrow in a compact independent grid', () => {
    expect(css).toMatch(/\.es2-menu \.es2-expedition-change\{[^}]*display:grid;grid-template-columns:minmax\(0,1fr\) auto;align-items:center;[^}]*text-align:start/)
    expect(css).toContain('.es2-expedition-change-label{min-width:0;overflow-wrap:anywhere}')
    expect(css).not.toContain('.es2-expedition-change-label:lang(en)')
  })
  it('keeps the duration beside the mode name and only the summary in the meta line', () => {
    const mode = menu({ runMode: 'quick' }).get('.es2-mobile-selected-mode').element
    expect(Array.from(mode.children, child => child.className)).toEqual(
      ['es2-expedition-kicker', 'es2-expedition-name', 'es2-expedition-duration', 'es2-expedition-meta'])
    expect(Array.from(mode.querySelector('.es2-expedition-meta')!.children, child => child.className)).toEqual(
      ['es2-expedition-description'])
    expect(css).not.toContain('.es2-expedition-hero')
  })
  it('cuts both dock buttons as forward chevrons from one shared tip instead of hexagon slabs', () => {
    expect(css).toContain('.es2-menu .es2-menu-actions{--es2-dock-tip:16px;grid-template-columns:minmax(0,1fr) fit-content(52%);')
    expect(css).toContain('--es2-portal-shape:polygon(0 0,calc(100% - var(--es2-dock-tip)) 0,100% 50%,calc(100% - var(--es2-dock-tip)) 100%,0 100%,var(--es2-dock-tip) 50%);')
    expect(css.match(/clip-path:var\(--es2-portal-shape\)/g)).toHaveLength(2)
    expect(css).toContain('clip-path:polygon(12px 0,calc(100% - var(--es2-dock-tip)) 0,100% 50%,calc(100% - var(--es2-dock-tip)) 100%,0 100%,0 12px)')
    expect(css).not.toContain('polygon(10% 0,90% 0,100% 50%,90% 100%,10% 100%,0 50%)')
    expect(css).not.toContain('es2-portal-orbit')
  })
  it('stacks the slim brief above a full-width single-line gate button on portrait phones only', () => {
    expect(css).toMatch(/@media\(max-width:700px\) and \(orientation:portrait\)\{\s*\.es2-menu \.es2-menu-actions\{grid-template-columns:minmax\(0,1fr\)\}/)
    expect(css).toMatch(/\.es2-menu \.es2-portal-start\{[^}]*min-height:56px/)
    expect(css).toMatch(/\.es2-menu \.es2-portal-label\{[^}]*font:800 max\(1\.0625rem,[^}]*text-wrap:balance/)
    expect(css).not.toContain('.es2-menu .es2-portal-start{flex-direction:column')
    expect(css).not.toContain('.es2-menu .es2-expedition-sigil{display:none}')
  })
  it('aligns the dock with the 1680px lobby shell and hyphenates long hall labels instead of splitting words', () => {
    expect(css).toMatch(/\.es2-menu \.es2-menu-action-bar\{\s*padding-inline:[^;]*calc\(\(100% - 1680px\) \/ 2\)/)
    expect(css).not.toContain('calc((100% - 1120px) / 2)')
    expect(css).toMatch(/\.es2-menu \.es2-hall-links button\{[^}]*hyphens:auto/)
    expect(readFileSync(resolve('src/components/es2/menu/Es2SkillSummary.vue'), 'utf8'))
      .toMatch(/\.es2-active-summary__head strong \{[^}]*hyphens:auto/)
  })
  // Chromium ships no hyphenation dictionary, so phone hall labels stay whole by track sizing, not by hyphens.
  it('fits all five phone hall tabs in the available width without shrinking text', () => {
    expect(css).toContain('.es2-menu .es2-hall-links{gap:2px;grid-template-columns:repeat(5,minmax(0,1fr))}')
    expect(css).toMatch(/\.es2-menu \.es2-hall-links button\{flex-direction:column;[^}]*font-size:max\(\.6875rem,min\(calc\(\.6875rem \* var\(--es2-ui-scale,1\)\),3vw\)\);[^}]*overflow-wrap:anywhere\}/)
  })
  it('uses the compact brief below 1024px so a tablet brief beside the gate stays short', () => {
    expect(css).toMatch(/@media\(max-width:1023px\),\(orientation:landscape\) and \(max-height:520px\)\{[^@]*\.es2-menu \.es2-expedition-kicker\{display:none\}/)
  })
  it('narrows the gate on small landscape phones so the brief keeps two meta lines, never below one zh-TW line', () => {
    expect(css).toMatch(/@media\(orientation:landscape\) and \(max-height:520px\)\{[^@]*\.es2-menu \.es2-portal-start\{padding-inline:calc\(var\(--es2-dock-tip\) \+ 6px\)\}/)
    expect(css).toMatch(/@media\(orientation:landscape\) and \(max-height:520px\) and \(max-width:700px\)\{\s*\.es2-menu \.es2-menu-actions\{grid-template-columns:minmax\(0,1fr\) fit-content\(max\(40%,14\.5rem\)\)\}/)
  })
  it('gives a compact phone skill name the full summary width instead of the column beside its icon', () => {
    const summary = readFileSync(resolve('src/components/es2/menu/Es2SkillSummary.vue'), 'utf8')
    const phone = summary.slice(summary.indexOf('@media (max-width:610px)'))
    expect(phone).toContain('.es2-active-summary[data-compact="true"] .es2-active-summary__main { display:grid; grid-template-columns:auto minmax(0,1fr);')
    expect(phone).toContain(':is(.es2-active-summary__copy,.es2-active-summary__head) { display:contents; }')
    expect(phone).toContain('.es2-active-summary__head strong { grid-column:1 / -1; grid-row:1; }')
  })
})

describe('hero card selection reveals the whole card', () => {
  const original = Element.prototype.scrollIntoView
  const calls: { id: string | null; options: ScrollIntoViewOptions }[] = []
  afterEach(() => {
    Element.prototype.scrollIntoView = original
    calls.length = 0
    document.documentElement.removeAttribute('data-es2-reduce-motion')
  })
  function spyScroll(): void {
    Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
      calls.push({ id: this.getAttribute('data-hero') ?? this.getAttribute('data-hero-id'), options: options as ScrollIntoViewOptions })
    }
  }

  it('smoothly scrolls a clicked classic or new hero card into view on both axes', async () => {
    spyScroll()
    const wrapper = menu()
    await wrapper.get('[data-hero="ranger"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-hero-id="crimson-paladin"]').trigger('click')
    await nextTick()
    expect(calls).toEqual([
      { id: 'ranger', options: { behavior: 'smooth', block: 'nearest', inline: 'nearest' } },
      { id: 'crimson-paladin', options: { behavior: 'smooth', block: 'nearest', inline: 'nearest' } },
    ])
  })

  it('jumps without animation when reduced motion is active', async () => {
    spyScroll()
    document.documentElement.setAttribute('data-es2-reduce-motion', 'true')
    const wrapper = menu()
    await wrapper.get('[data-hero="wizard"]').trigger('click')
    await nextTick()
    expect(calls).toEqual([{ id: 'wizard', options: { behavior: 'instant', block: 'nearest', inline: 'nearest' } }])
  })

  it('reveals the next card on arrow keys without an instant focus jump, and details do not scroll', async () => {
    spyScroll()
    const focus = HTMLElement.prototype.focus
    const focusOptions: (FocusOptions | undefined)[] = []
    HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
      if (this.matches('[data-hero], [data-hero-id]')) focusOptions.push(options)
    }
    try {
      // Classic arrow-key focus looks the card up in the document.
      const wrapper = mount(Es2MainMenu, { attachTo: document.body, props: { choice: 'knight', runMode: 'quick', version: '1.2.0' } })
      wrappers.push(wrapper)
      await wrapper.get('[data-es2-hero-details="ranger"]').trigger('click')
      await wrapper.get('[data-hero="knight"]').trigger('keydown', { key: 'ArrowRight' })
      await wrapper.setProps({ choice: 'ranger' })
      await nextTick()
      await wrapper.get('[data-hero-id="shadowblade"]').trigger('keydown', { key: 'ArrowRight' })
      await wrapper.setProps({ heroId: 'spirit-summoner' })
      await nextTick()
      expect(calls.map(call => call.id)).toEqual(['ranger', 'spirit-summoner'])
      expect(focusOptions).toEqual([{ preventScroll: true }, { preventScroll: true }])
    } finally {
      HTMLElement.prototype.focus = focus
    }
  })
})

it('keeps the selected hero outer gold rim and glow without an inset decorative frame at any breakpoint', () => {
  expect(css).not.toMatch(/\.es2-hero-select-card\[aria-pressed=["']?true["']?\]::?after\s*\{/)
  const selected = css.match(/\.es2-menu \.es2-hero-select-card\[aria-pressed="true"\]\s*\{([^}]+)\}/)?.[1] ?? ''
  expect(selected).toContain('border-color:#ffe3a3')
  expect(selected).toContain('box-shadow:inset 0 0 0 2px #e9c27e')
  expect(selected).toContain('--es2-hero-glow:#ffd16b80')
})
