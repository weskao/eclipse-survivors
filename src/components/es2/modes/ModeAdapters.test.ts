import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ModeChooser from './ModeChooser.vue'
import { getLocale, setLocale } from '../../../i18n'
import { nextTick } from 'vue'
import ModeProgress from './ModeProgress.vue'
import { advanceObjective, createObjectiveState } from '../../../game/content/objectives/evaluator'

const wrappers: VueWrapper[] = []
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount() })

describe('ES2 objective mode chooser adapter', () => {
  it('renders exactly five accessible choices without replacing four legacy modes', async () => {
    const wrapper = mount(ModeChooser, { props: { value: 'boss-rush' } })
    wrappers.push(wrapper)
    expect(wrapper.findAll('[data-objective-mode]')).toHaveLength(5)
    const sigils = {"boss-rush":"♛","endless-eclipse":"☾","relic-hunt":"◇","cursed-expedition":"✧","chaos-arena":"✵"}
    for (const [id, glyph] of Object.entries(sigils)) {
      const icon = wrapper.get(`[data-objective-mode="${id}"] .es2-objective-sigil`)
      expect(icon.text()).toBe(glyph)
      expect(icon.attributes('aria-hidden')).toBe('true')
      expect(wrapper.get(`[data-objective-mode="${id}"] .es2-objective-heading strong`).text()).toBeTruthy()
    }
    expect(wrapper.find('[data-objective-mode="boss-rush"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('永恆星蝕')
    expect(wrapper.text()).toContain('聖物追獵')
    expect(wrapper.text()).toContain('詛咒遠征')
    expect(wrapper.findAll('.es2-objective-choice .modifier')).toHaveLength(15)
    expect(wrapper.find('[data-objective-mode="endless-eclipse"] .reward').text()).toContain('每 3 分鐘')
    await wrapper.find('[data-objective-mode="chaos-arena"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['chaos-arena']])
    expect(wrapper.find('[data-objective-mode="boss-rush"]').attributes('aria-checked')).toBe('true')
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
      expect(dialog.textContent).toContain('每 180 秒')
      expect(wrapper.emitted('select')).toBeUndefined()
      setLocale('en')
      await nextTick()
      expect(dialog.querySelector('h2')?.textContent).toBe('Endless Eclipse')
      expect(dialog.textContent).toContain('Complete an eclipse event every 180 seconds')
      expect(wrapper.get('[data-es2-mode-details="endless-eclipse"]').attributes('aria-label')).toBe('View mode details: Endless Eclipse')
      ;(dialog.querySelector('.es2-close') as HTMLButtonElement).click()
      await nextTick()
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    } finally {
      setLocale(locale)
    }
  })

  it('disables every mode control when the host cannot start a new run', () => {
    const wrapper = mount(ModeChooser, { props: { value: null, disabled: true } })
    wrappers.push(wrapper)
    expect(wrapper.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(5)
  })
})

describe('ES2 live objective HUD adapter', () => {
  it('shows finite progress and explicit pending objective without inventing victory', () => {
    const state = advanceObjective(createObjectiveState('boss-rush'), { type: 'tick', seconds: 30 })
    const wrapper = mount(ModeProgress, { props: { state } })
    wrappers.push(wrapper)
    expect(wrapper.attributes('aria-live')).toBe('polite')
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
