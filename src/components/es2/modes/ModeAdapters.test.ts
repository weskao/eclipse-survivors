import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ModeChooser from './ModeChooser.vue'
import { getLocale, setLocale, t } from '../../../i18n'
import { nextTick } from 'vue'
import Es2ModeSigil from './Es2ModeSigil.vue'
import Es2ModeHotBadge from './Es2ModeHotBadge.vue'
import Es2ModeDuration from './Es2ModeDuration.vue'
import { MODES } from '../../../meta/modes'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import ModeSelector from '../../modes/ModeSelector.vue'
import ModeProgress from './ModeProgress.vue'
import { advanceObjective, createObjectiveState } from '../../../game/content/objectives/evaluator'

const wrappers: VueWrapper[] = []
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount() })

describe('shared HOT expedition badge', () => {
  it('never changes featured card padding, size or grid placement', () => {
    const css = readFileSync(resolve('src/components/es2/modes/Es2ModeHotBadge.vue'), 'utf8')
    expect(css).not.toMatch(/\.es2-mode-has-hot\s*[,\{]/)
    expect(css).toMatch(/position:absolute;\s*inset-block-start:calc\(0px - var\(--es2-hot-overhang/)
    expect(css).toContain('--es2-hot-overhang:12px')
    const menuCss = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    expect(menuCss).toContain('.es2-expedition-board .es2-mode-detail-trigger{padding-block-start:15px}')
    expect(menuCss).toContain('grid-auto-rows:1fr')
    expect(menuCss).toContain('--es2-mode-card-min-height:88px')
    expect(menuCss).toContain('min-height:max(88px,calc(var(--es2-mode-card-min-height) * var(--es2-ui-scale,1)))')
    expect(menuCss).not.toContain('min-height:124px;gap:8px;')
  })
  it('renders only when enabled and reacts to the boolean without leaving a placeholder', async () => {
    const wrapper = mount(Es2ModeHotBadge, { props: { hot: false } })
    wrappers.push(wrapper)
    expect(wrapper.find('[data-es2-mode-hot]').exists()).toBe(false)
    await wrapper.setProps({ hot: true })
    const badge = wrapper.get('[data-es2-mode-hot]')
    expect(badge.text()).toBe('HOT')
    expect(badge.get('.es2-mode-hot-fire').attributes('aria-hidden')).toBe('true')
    expect(badge.findAll('.es2-mode-hot-flame')).toHaveLength(3)
    expect(badge.findAll('.es2-mode-hot-ember')).toHaveLength(3)
    expect(badge.find('canvas').exists()).toBe(false)
    await wrapper.setProps({ hot: false })
    expect(wrapper.find('[data-es2-mode-hot]').exists()).toBe(false)
  })

  it('currently marks only boss rush without changing selection', async () => {
    const wrapper = mount(ModeChooser, { props: { value: 'relic-hunt' } })
    wrappers.push(wrapper)
    expect(Object.values(MODES).filter(mode => mode.hot).map(mode => mode.id)).toEqual(['boss-rush'])
    expect(wrapper.findAll('[data-es2-mode-hot]')).toHaveLength(1)
    const boss = wrapper.get('[data-objective-mode="boss-rush"]')
    expect(boss.get('[data-es2-mode-hot]').text()).toBe('HOT')
    expect(boss.get(':scope > [data-es2-mode-hot]').exists()).toBe(true)
    expect(boss.find('.es2-mode-title-line [data-es2-mode-hot]').exists()).toBe(false)
    expect(boss.classes()).toContain('es2-mode-has-hot')
    expect(boss.attributes('aria-label')).toContain(t('熱門遠征'))
    expect(boss.attributes('aria-checked')).toBe('false')
    expect(wrapper.get('[data-objective-mode="relic-hunt"]').attributes('aria-checked')).toBe('true')
    await boss.get('[data-es2-mode-hot]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['boss-rush']])
  })
})

describe('compact expedition card summaries', () => {
  it('renders concise bilingual summaries on all nine cards', async () => {
    const previous = getLocale()
    const wrapper = mount(ModeChooser, { props: { value: 'quick' } })
    wrappers.push(wrapper)
    const expected = [["quick","150 秒決戰 · 擊敗首領","150s · Defeat the boss"],["standard","征服深淵魔王","Slay the Abyssal Demon Lord"],["endless","魔物愈戰愈強","Ever-stronger monsters"],["challenge","強敵侵襲 · 高壓求生","Survive stronger foes"],["boss-rush","五位首領 · 逐戰增強","Five escalating bosses"],["endless-eclipse","無盡求生 · 星蝕事件","Survive eclipse events"],["relic-hunt","四件聖物 · 擊敗守護者","4 relics · Slay the guardian"],["cursed-expedition","輪替詛咒 · 兩位守衛","Rotating curses · 2 guardians"],["chaos-arena","八波激戰 · 混沌首領","Eight waves · Chaos boss"]] as const
    try {
      for (const locale of ['zh-TW', 'en'] as const) {
        setLocale(locale)
        await nextTick()
        for (const [id, zh, en] of expected) {
          const card = wrapper.get(`[data-es2-mode-id="${id}"]`)
          expect(card.get('.es2-mode-copy small').text()).toBe(locale === 'en' ? en : zh)
        }
      }
    } finally { setLocale(previous) }
  })
  it('centers the title and summary together without increasing the card height', () => {
    const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    expect(css).toContain('.es2-expedition-board .es2-mode-card>.es2-mode-copy{grid-column:2;align-self:center}')
    expect(css).toContain('padding:5px 8px 5px 6px;')
    expect(css).toContain('--es2-mode-card-min-height:88px')
  })
})

describe('shared duration badge', () => {
  it('keeps the borderless card duration below the hero Info corner without affecting the dock', () => {
    const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    const duration = readFileSync(resolve('src/components/es2/modes/Es2ModeDuration.vue'), 'utf8')
    expect(css).toContain('.es2-expedition-board .es2-mode-card>.es2-mode-time{grid-column:3;align-self:end;justify-self:end;min-width:0;margin-block-start:39px}')
    expect(css).toContain('padding:5px 8px 5px 6px;')
    expect(css).toContain('minmax(44px,max-content)')
    expect(css).not.toContain('--es2-hot-inline-end:48px')
    expect(duration).toMatch(/\.es2-mode-time:not\(\.es2-mode-time--compact\)\s*\{[^}]*display:inline-flex;[^}]*align-items:center;/)
    expect(css).not.toContain('.es2-expedition-board .es2-mode-card-shell .es2-mode-detail-trigger{')
    expect(duration).toMatch(/\.es2-mode-time:not\(\.es2-mode-time--compact\)\s*\{[^}]*border:0;[^}]*background:none;/)
  })
  it('uses one centered value for unlimited time and restores the unit for finite runs', async () => {
    const wrapper = mount(Es2ModeDuration, { props: { duration: null } })
    wrappers.push(wrapper)
    expect(wrapper.classes()).toContain('es2-mode-time--endless')
    expect(wrapper.get('[data-es2-mode-time-value]').text()).toBe('∞')
    expect(wrapper.find('[data-es2-mode-time-unit]').exists()).toBe(false)
    const css = readFileSync(resolve('src/components/es2/modes/Es2ModeDuration.vue'), 'utf8')
    expect(css).toMatch(/\.es2-mode-time--endless\s*\{[^}]*display:flex;[^}]*align-items:center;[^}]*justify-content:center;/)
    await wrapper.setProps({ duration: 480 })
    expect(wrapper.classes()).not.toContain('es2-mode-time--endless')
    expect(wrapper.get('[data-es2-mode-time-value]').text()).toBe('8')
    expect(wrapper.get('[data-es2-mode-time-unit]').text()).toBe('MIN')
  })
})

describe('ES2 objective mode chooser adapter', () => {
  it('uses the fixed badge slot for a future classic or advanced featured mode', () => {
    const ids = ['quick', 'endless-eclipse'] as const
    const previous = ids.map(id => MODES[id].hot)
    try {
      ids.forEach(id => { MODES[id].hot = true })
      const wrapper = mount(ModeChooser, { props: { value: 'quick' } })
      wrappers.push(wrapper)
      for (const id of ids) {
        const card = wrapper.get(`[data-mode="${id}"], [data-objective-mode="${id}"]`)
        expect(card.classes()).toContain('es2-mode-has-hot')
        expect(card.get(':scope > [data-es2-mode-hot]').text()).toBe('HOT')
        expect(card.find('.es2-mode-title-line [data-es2-mode-hot]').exists()).toBe(false)
      }
    } finally {
      ids.forEach((id, i) => { MODES[id].hot = previous[i] })
    }
  })
  it('renders all nine choices in one radio group', async () => {
    const wrapper = mount(ModeChooser, { props: { value: 'boss-rush' } })
    wrappers.push(wrapper)
    expect(wrapper.findAll('[data-objective-mode]')).toHaveLength(5)
    expect(wrapper.findAll('[data-es2-mode-details]')).toHaveLength(Object.keys(MODES).length)
    for (const card of wrapper.findAll('[role="radio"]')) {
      const id = card.attributes('data-es2-mode-id')
      expect(id).toBeTruthy()
      expect(card.element.parentElement?.querySelector('button[data-es2-mode-details]')?.getAttribute('data-es2-mode-details')).toBe(id)
      expect(card.find('button').exists()).toBe(false)
    }
    expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(1)
    expect(wrapper.get('[role="radiogroup"]').findAll('[role="radio"]')).toHaveLength(9)
    expect(wrapper.findAll('[data-es2-mode-chapter]')).toHaveLength(2)
    expect(wrapper.findAll('[role="radio"][aria-checked="true"]')).toHaveLength(1)
    expect(wrapper.findAll('[role="radio"][tabindex="0"]')).toHaveLength(1)
    expect(wrapper.findAll('.es2-mode-radio')).toHaveLength(0)
    expect(wrapper.get('[aria-checked="true"]').classes()).toContain('es2-mode-active')
    for (const id of ['boss-rush', 'endless-eclipse', 'relic-hunt', 'cursed-expedition', 'chaos-arena']) {
      const icon = wrapper.get(`[data-objective-mode="${id}"] .es2-objective-sigil`)
      expect(icon.get('img').attributes('src')).toContain(id + '@3x.webp')
      expect(icon.attributes('aria-hidden')).toBe('true')
      expect(wrapper.get(`[data-objective-mode="${id}"] .es2-objective-heading strong`).text()).toBeTruthy()
    }
    expect(wrapper.find('[data-objective-mode="boss-rush"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('永恆星蝕')
    expect(wrapper.text()).toContain('聖物追獵')
    expect(wrapper.text()).toContain('詛咒遠征')
    expect(wrapper.findAll('.es2-objective-choice .modifier')).toHaveLength(0)
    expect(wrapper.get('[data-objective-mode="endless-eclipse"] [data-es2-mode-time-value]').text()).toBe('∞')
    await wrapper.find('[data-objective-mode="chaos-arena"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['chaos-arena']])
    expect(wrapper.find('[data-objective-mode="boss-rush"]').attributes('aria-checked')).toBe('true')
  })

  it('moves across chapters with one selected value and wraps keyboard navigation', async () => {
    const wrapper = mount(ModeChooser, { props: { value: 'challenge' }, attachTo: document.body })
    wrappers.push(wrapper)
    await wrapper.get('[data-mode="challenge"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('select')).toEqual([['boss-rush']])
    await wrapper.setProps({ value: 'boss-rush' })
    expect(wrapper.findAll('[aria-checked="true"]')).toHaveLength(1)
    expect(wrapper.get('[data-mode="challenge"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.get('[data-objective-mode="boss-rush"]').attributes('tabindex')).toBe('0')
    await wrapper.get('[data-objective-mode="boss-rush"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['challenge'])
    await wrapper.setProps({ value: 'quick' })
    await wrapper.get('[data-mode="quick"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['chaos-arena'])
  })

  it('shows one localized title and opens full mode details without changing selection', async () => {
    const locale = getLocale()
    const wrapper = mount(ModeChooser, { props: { value: 'boss-rush' }, attachTo: document.body })
    wrappers.push(wrapper)
    try {
      setLocale('zh-TW')
      await nextTick()
      expect(wrapper.get('[data-objective-mode="boss-rush"] strong').text()).toBe('首領連戰')
      await wrapper.get('[data-es2-mode-details="endless-eclipse"]').trigger('click')
      const dialog = document.body.querySelector('[role="dialog"]')!
      expect(dialog.querySelector('h2')?.textContent).toBe('永恆星蝕')
      expect(dialog.querySelector('.es2-mode-sigil img')?.getAttribute('src')).toBe(
        wrapper.get('[data-objective-mode="endless-eclipse"] .es2-mode-sigil img').attributes('src'))
      expect(dialog.getAttribute('data-es2-mode-theme')).toBe('endless-eclipse')
      expect(dialog.querySelector('[data-es2-mode-detail="objective"] strong')?.textContent).toBe('遠征目標')
      expect(dialog.querySelector('[data-es2-mode-detail="rules"] strong')?.textContent).toBe('特殊規則')
      expect(dialog.querySelectorAll('[data-es2-mode-detail="rules"] li')).toHaveLength(3)
      expect(dialog.querySelector('[data-es2-mode-detail="reward"] strong')?.textContent).toBe('獎勵')
      expect(dialog.textContent).toContain('每 180 秒')
      expect(wrapper.emitted('select')).toBeUndefined()
      setLocale('en')
      await nextTick()
      expect(dialog.querySelector('h2')?.textContent).toBe('Endless Eclipse')
      expect(dialog.querySelector('[data-es2-mode-detail="objective"] strong')?.textContent).toBe('Expedition objective')
      expect(dialog.querySelector('[data-es2-mode-detail="rules"] strong')?.textContent).toBe('Special rules')
      expect(dialog.querySelector('[data-es2-mode-detail="reward"] strong')?.textContent).toBe('Reward')
      expect(dialog.textContent).toContain('Complete an eclipse event every 180 seconds')
      expect(wrapper.get('[data-es2-mode-details="endless-eclipse"]').attributes('aria-label')).toBe('View mode details: Endless Eclipse')
      ;(dialog.querySelector('.es2-close') as HTMLButtonElement).click()
      await nextTick()
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    } finally {
      setLocale(locale)
    }
  })

  it('uses the matching theme, image and three detail sections for all nine modes in both languages', async () => {
    const wrapper = mount(ModeChooser, { props: { value: 'boss-rush' }, attachTo: document.body })
    wrappers.push(wrapper)
    const locale = getLocale()
    try {
      for (const language of ['zh-TW', 'en'] as const) {
        setLocale(language)
        await nextTick()
        for (const card of wrapper.findAll('[role="radio"]')) {
          const id = card.attributes('data-es2-mode-id')
          await wrapper.get(`[data-es2-mode-details="${id}"]`).trigger('click')
          const dialog = document.body.querySelector('[role="dialog"]')!
          expect(dialog.getAttribute('data-es2-mode-theme')).toBe(id)
          expect(dialog.querySelector('.es2-mode-detail-sigil img')?.getAttribute('src')).toBe(card.get('.es2-mode-sigil img').attributes('src'))
          expect(dialog.querySelectorAll('[data-es2-mode-detail]')).toHaveLength(3)
          for (const block of dialog.querySelectorAll('[data-es2-mode-detail]')) expect(block.textContent?.trim().length).toBeGreaterThan(5)
          if (id === 'endless') expect(dialog.textContent).toContain(t('沒有固定勝利終點，持續生存並累積戰績。'))
          if (id === 'challenge') expect(dialog.textContent).toContain(String(Math.round(MODES.challenge.modifiers.enemyDamage * 100)))
          ;(dialog.querySelector('.es2-close') as HTMLButtonElement).click()
          await nextTick()
        }
      }
      expect(wrapper.emitted('select')).toBeUndefined()
    } finally { setLocale(locale) }
  })

  it('disables every mode control when the host cannot start a new run', () => {
    const wrapper = mount(ModeChooser, { props: { value: null, disabled: true } })
    wrappers.push(wrapper)
    expect(wrapper.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(9)
  })
})

describe('ES2 live objective HUD adapter', () => {
  it('shows finite progress and explicit pending objective without inventing victory', () => {
    const state = advanceObjective(createObjectiveState('boss-rush'), { type: 'tick', seconds: 30 })
    const wrapper = mount(ModeProgress, { props: { state } })
    wrappers.push(wrapper)
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.get('.es2-mode-sigil img').attributes('src')).toContain('boss-rush@3x.webp')
    expect(wrapper.text()).toContain('連續首領擊敗')
    expect(wrapper.text()).toContain('0 / 5')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuemax')).toBe('5')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    expect((wrapper.find('[role="progressbar"]').element as HTMLElement).style.getPropertyValue('--es2-progress')).toBe('0')
  })

  it('shows endless progress without finite progress bars or automatic completion', () => {
    const state = advanceObjective(createObjectiveState('endless-eclipse'), { type: 'tick', seconds: 100000 })
    const wrapper = mount(ModeProgress, { props: { state } })
    wrappers.push(wrapper)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('持續求生')
    expect(wrapper.text()).not.toContain('勝利')
  })

  it('distinguishes defeat and voluntary withdrawal for result UI', async () => {
    const active = createObjectiveState('relic-hunt')
    const wrapper = mount(ModeProgress, { props: { state: active } })
    wrappers.push(wrapper)
    await wrapper.setProps({ state: advanceObjective(active, { type: 'abandon' }) })
    expect(wrapper.text()).toContain('主動撤退')
    await wrapper.setProps({ state: advanceObjective(active, { type: 'player-defeated' }) })
    expect(wrapper.text()).toContain('挑戰失敗')
    expect(wrapper.text()).toContain('預估餘燼')
  })
})

describe('shared expedition art contract', () => {
  it('requires one verified 3x WebP for every authoritative mode, including future modes', async () => {
    const dir = resolve('src/assets/es2/production/modes')
    const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')) as {
      scale: number; displayBasePx: number; assets: { id: string; file: string; width: number; height: number; hasAlpha: boolean; bytes: number; sha256: string }[]
    }
    const ids = Object.values(MODES).map(mode => mode.id).sort()
    expect(manifest.assets.map(asset => asset.id).sort()).toEqual(ids)
    expect(manifest.scale).toBe(3)
    expect(manifest.displayBasePx).toBe(64)
    const wrapper = mount(Es2ModeSigil, { props: { mode: 'quick' } })
    wrappers.push(wrapper)
    for (const mode of Object.values(MODES)) {
      await wrapper.setProps({ mode: mode.id })
      const asset = manifest.assets.find(item => item.id === mode.id)!
      expect(asset.file).toBe(mode.id + '@3x.webp')
      expect([asset.width, asset.height, asset.hasAlpha]).toEqual([192, 192, true])
      const bytes = readFileSync(resolve(dir, asset.file))
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
      expect(bytes.length).toBe(asset.bytes)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
      expect(wrapper.get('img').attributes('src')).toContain(asset.file)
    }
  })
  it('shows only a same-size skeleton until load, never an old glyph or endless error animation', async () => {
    const wrapper = mount(Es2ModeSigil, { props: { mode: 'boss-rush' } })
    wrappers.push(wrapper)
    const state = () => wrapper.get('img').attributes('data-es2-image-state')
    expect(state()).toBe('loading')
    expect(wrapper.text()).toBe('')
    await wrapper.get('img').trigger('load')
    expect(state()).toBe('loaded')
    await wrapper.setProps({ mode: 'quick' })
    expect(state()).toBe('loading')
    expect(wrapper.get('img').attributes('src')).toContain('quick@3x.webp')
    await wrapper.get('img').trigger('error')
    expect(state()).toBe('error')
    expect(wrapper.text()).toBe('')
    await wrapper.setProps({ mode: 'boss-rush' })
    expect(state()).toBe('loading')
    await wrapper.get('img').trigger('load')
    expect(state()).toBe('loaded')
    expect(wrapper.text()).toBe('')
  })
  it('reuses the same art in the retained classic selector', () => {
    const wrapper = mount(ModeSelector, { props: { value: 'quick' } })
    wrappers.push(wrapper)
    expect(wrapper.get('[data-mode="quick"] .es2-mode-sigil img').attributes('src')).toContain('quick@3x.webp')
  })
})
