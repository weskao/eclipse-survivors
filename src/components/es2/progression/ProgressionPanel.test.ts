import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { BALANCE, researchCost } from '../../../game/config'
import { getLocale, setLocale } from '../../../i18n'
import { buyResearch } from '../../../game/content/meta/progression'
import { createMetaState } from '../../../game/content/meta/state'
import ProgressionPanel from './ProgressionPanel.vue'
import { legacyHallNodes } from './hall-model'
import { emptyProfile } from '../../../meta/profile'

describe('ES2 v3 progression UI adapter', () => {
  it('formats research and starting bonus values from the JSON in both locales', () => {
    const language = getLocale()
    const state = createMetaState()
    const expected = Math.round(BALANCE.meta.research.power.benefitPerRank * 100)
    try {
      setLocale('zh-TW')
      let wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
      expect(wrapper.text()).toContain(`每級 +${expected}% 起始攻擊`)
      setLocale('en')
      wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
      expect(wrapper.text()).toContain(`+${expected}% starting attack per rank`)
    } finally {
      setLocale(language)
    }
  })

  it('shows all five research ranks and permits the fifth purchase before showing max rank', async () => {
    const state = createMetaState()
    state.embers = 50_000
    for (const id of Object.keys(BALANCE.meta.research)) state.research[id] = 4
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    for (const id of Object.keys(BALANCE.meta.research)) {
      await wrapper.get(`[data-hall-inspect="${id}"]`).trigger('click')
      const button = wrapper.get(`[data-research="${id}"]`)
      expect(button.attributes('disabled'), id).toBeUndefined()
      expect(wrapper.get(`[data-hall-node="${id}"]`).text(), id).toContain('4 / 5')
    }
    const maxState = structuredClone(state)
    for (const id of Object.keys(BALANCE.meta.research)) maxState.research[id] = 5
    await wrapper.setProps({ state: maxState })
    for (const id of Object.keys(BALANCE.meta.research)) {
      await wrapper.get(`[data-hall-inspect="${id}"]`).trigger('click')
      const button = wrapper.get(`[data-research="${id}"]`)
      expect(button.attributes('disabled'), id).toBeDefined()
      expect(wrapper.get(`[data-hall-node="${id}"]`).text(), id).toContain('5 / 5')
    }
    wrapper.unmount()
  })

  it('renders immutable researched ranks, wallet, mastery, and achievement status', async () => {
    const state = createMetaState()
    state.embers = 300
    state.mastery.knight = { xp: 900, level: 3 }
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    expect(wrapper.text()).toContain('300')
    expect(wrapper.text()).toContain('攻擊研究')
    expect(wrapper.text()).toContain('英雄專精')
    expect(wrapper.text()).toContain('永久成就')
    expect(wrapper.text()).toContain('騎士')
    await wrapper.get('[data-hall-inspect="insight"]').trigger('click')
    expect(wrapper.get('[data-research="insight"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-hall-inspect="knight-aegis"]').trigger('click')
    expect(wrapper.get('[data-equipment="knight-aegis"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-hall-inspect="ember-spark"]').trigger('click')
    expect(wrapper.get('[data-bonus="ember-spark"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('never mutates profile in-place; emits typed purchase intents only', async () => {
    const state = { ...createMetaState(), embers: 400 }
    const original = structuredClone(state)
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-research="power"]').trigger('click')
    expect(wrapper.emitted('research')).toEqual([['power']])
    expect(state).toEqual(original)
    wrapper.unmount()
  })

  it('disables spending while blocked or pending and displays durable-save warning', async () => {
    const state = { ...createMetaState(), embers: 900 }
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'blocked' } })
    expect(wrapper.get('[role="alert"]').text()).toContain('儲存')
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ status: 'ready', busy: true })
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ busy: false })
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('provides unlocked and locked achievements plus mobile-readable sections', () => {
    const state = createMetaState()
    state.achievements.push('first-victory')
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'ranger', status: 'ready' } })
    expect(wrapper.get('[data-achievement="first-victory"]').text()).toContain('已達成')
    expect(wrapper.get('[data-achievement="monster-hunter"]').text()).toContain('未達成')
    expect(wrapper.findAll('section[aria-label]')).toHaveLength(4)
    wrapper.unmount()
  })
})

describe('Adventurer Hall growth routes', () => {
  it('displays actual prerequisites, current/next benefit and the rank ring without spending on inspection', async () => {
    const state = createMetaState()
    state.embers = 200
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    expect(wrapper.findAll('[data-hall-edge]')).toHaveLength(4)
    expect(wrapper.get('[data-hall-edge="power:insight"]').attributes('data-active')).toBe('false')
    await wrapper.get('[data-hall-inspect="power"]').trigger('click')
    expect(wrapper.get('[data-hall-detail]').text()).toContain('+4%')
    expect(wrapper.get('[data-hall-node="power"] img').attributes('src')).toContain('damage@3x.webp')
    expect(wrapper.get('[data-hall-node="power"] [role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    expect(wrapper.emitted('research')).toBeUndefined()
    await wrapper.get('[data-hall-inspect="insight"]').trigger('click')
    expect(wrapper.get('[data-hall-detail]').text()).toContain('攻擊研究')
    expect(wrapper.get('[data-research="insight"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('animates only a committed rank increase and lights the real unlocked connection', async () => {
    const state = createMetaState()
    state.embers = 200
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-research="power"]').trigger('click')
    expect(wrapper.find('[data-hall-upgraded]').exists()).toBe(false)
    const result = buyResearch(state, 'power')
    expect(result.ok).toBe(true)
    await wrapper.setProps({ state: result.state })
    expect(wrapper.find('[data-hall-upgraded="power"]').exists()).toBe(true)
    expect(wrapper.get('[data-hall-edge="power:insight"]').attributes('data-active')).toBe('true')
    expect(wrapper.get('[data-hall-edge="power:insight"]').attributes('data-revealed')).toBe('true')
    expect(wrapper.get('[data-hall-node="power"] .hall-ring').attributes('style')).toContain('20%')
    expect(wrapper.get('[data-hall-upgraded="power"]').attributes('data-milestone')).toBe('false')
    expect(wrapper.find('[data-hall-edge="vitality:scavenging"][data-revealed="true"]').exists()).toBe(false)
    expect(wrapper.get('[data-hall-node="insight"]').attributes('data-hall-arrived')).toBe('true')
    await wrapper.get('[data-hall-inspect="insight"]').trigger('click')
    expect(wrapper.get('[data-research="insight"]').attributes('disabled')).toBeUndefined()
    expect(state.research.power).toBe(0)
    wrapper.unmount()
  })
})

describe('Hall upgrade motion', () => {
  it('celebrates reaching the cap without replaying unrelated branches or spending on inspection', async () => {
    const state = createMetaState()
    state.embers = 50000
    state.research.power = 4
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-hall-inspect="power"]').trigger('click')
    expect(wrapper.find('[data-hall-upgraded]').exists()).toBe(false)
    await wrapper.get('[data-research="power"]').trigger('click')
    await wrapper.setProps({ state: buyResearch(state, 'power').state })
    expect(wrapper.get('[data-hall-upgraded="power"]').attributes('data-milestone')).toBe('true')
    expect(wrapper.get('[data-hall-node="power"] .hall-ring').attributes('style')).toContain('100%')
    expect(wrapper.find('[data-hall-edge][data-revealed="true"]').exists()).toBe(false)
    expect(wrapper.get('[data-research="power"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})

describe('Hall authoritative legacy progression', () => {
  it('uses the transaction catalog for all owned ranks, including the late-rank surcharge', () => {
    const profile = emptyProfile()
    profile.embers = 50000
    for (const id of ['power', 'vitality'] as const) {
      const cap = BALANCE.meta.research[id].maxRank
      for (let rank = 0; rank <= cap; rank++) {
        profile.upgrades[id] = rank
        const node = legacyHallNodes(profile).find(item => item.id === id)!
        expect(node.maxRank).toBe(cap)
        expect(node.cost).toBe(rank === cap ? null : researchCost(id, rank))
        expect(node.canBuy).toBe(rank < cap)
      }
    }
  })
  it('shows the selected specialization mastery without replacing the classic equipment context', async () => {
    const state = createMetaState()
    state.mastery.knight = { xp: 0, level: 1 }
    state.mastery['heroes:shadowblade'] = { xp: 900, level: 3 }
    state.mastery['heroes:crimson-paladin'] = { xp: 2400, level: 5 }
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', heroId: 'shadowblade', status: 'ready' } })
    expect(wrapper.get('.es2-progression-mastery').text()).toContain('影刃行者')
    expect(wrapper.get('.es2-progression-mastery strong').text()).toContain('Lv. 3')
    await wrapper.get('[data-hall-inspect="knight-aegis"]').trigger('click')
    expect(wrapper.get('[data-equipment="knight-aegis"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ heroId: 'crimson-paladin' })
    expect(wrapper.get('.es2-progression-mastery').text()).toContain('緋紅聖騎')
    expect(wrapper.get('.es2-progression-mastery strong').text()).toContain('Lv. 5')
    wrapper.unmount()
  })
})

describe('Compact Hall topology and metal ring', () => {
  it('uses one confirmation per board, retains inspectable locked nodes and renders the shared metal ring', async () => {
    const state = createMetaState()
    state.embers = 200
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    const tree = wrapper.get('.hall-growth--tree')
    expect(tree.findAll('.hall-map button')).toHaveLength(5)
    expect(tree.findAll('.hall-map p, .hall-map .hall-buy')).toHaveLength(0)
    expect(tree.findAll('[data-hall-confirm]')).toHaveLength(1)
    expect(tree.findAll('.hall-ring-metal')).toHaveLength(5)
    expect(tree.findAll('.hall-ring-ticks')).toHaveLength(5)
    await tree.get('[data-hall-inspect="insight"]').trigger('click')
    expect(tree.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('research')).toBeUndefined()
    await tree.get('[data-hall-inspect="power"]').trigger('click')
    await tree.get('[data-hall-confirm]').trigger('click')
    expect(wrapper.emitted('research')).toEqual([['power']])
    wrapper.unmount()
  })
})

describe('Hall preview purchase safety', () => {
  it('does not allow keyboard preview of a different node to spend until explicitly selected', async () => {
    const state = createMetaState()
    state.embers = 200
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    const tree = wrapper.get('.hall-growth--tree')
    await tree.get('[data-hall-inspect="vitality"]').trigger('focus')
    expect(tree.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('research')).toBeUndefined()
    await tree.get('[data-hall-inspect="vitality"]').trigger('click')
    expect(tree.get('[data-hall-confirm]').attributes('disabled')).toBeUndefined()
    await tree.get('[data-hall-confirm]').trigger('click')
    expect(wrapper.emitted('research')).toEqual([['vitality']])
    wrapper.unmount()
  })
})

describe('Hall category navigation and touch inspector', () => {
  it('shows just one category, with keyboard-accessible navigation and preserved research selection', async () => {
    // isVisible() needs a connected element: jsdom ignores v-show's inline display:none on detached nodes.
    const wrapper = mount(ProgressionPanel, { attachTo: document.body, props: { state: createMetaState(), hero: 'knight', status: 'ready' } })
    expect(wrapper.findAll('[data-hall-tab]')).toHaveLength(4)
    expect(wrapper.get('[data-hall-category="research"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-hall-category="mastery"]').isVisible()).toBe(false)
    await wrapper.get('[data-hall-inspect="vitality"]').trigger('click')
    await wrapper.get('[data-hall-tab="mastery"]').trigger('click')
    expect(wrapper.get('[data-hall-category="mastery"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-hall-category="research"]').isVisible()).toBe(false)
    await wrapper.get('[data-hall-tab="mastery"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.get('[data-hall-tab="research"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-hall-inspect="vitality"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.emitted('research')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps one in-place upgrade dock on touch: tap selects without scrolling, the dock buys, nothing opens or closes', async () => {
    const original = window.matchMedia
    const scroll = vi.fn()
    const previousScroll = HTMLElement.prototype.scrollIntoView
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    HTMLElement.prototype.scrollIntoView = scroll
    const state = createMetaState()
    state.embers = 10_000
    const wrapper = mount(ProgressionPanel, { attachTo: document.body, props: { state, hero: 'knight', status: 'ready' } })
    try {
      const board = wrapper.get('.hall-growth--tree')
      const dock = board.get('[data-hall-detail]')
      expect(dock.isVisible()).toBe(true)
      expect(document.body.querySelector('[data-hall-close], .hall-detail--floating')).toBeNull()
      expect(dock.get('[data-hall-confirm]').attributes('disabled')).toBeUndefined()
      await board.get('[data-hall-inspect="insight"]').trigger('click')
      expect(dock.get('.hall-detail-heading strong').text()).toBe(board.get('[data-hall-node="insight"] strong').text())
      expect(dock.text()).toContain('攻擊研究')
      expect(dock.get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
      expect(scroll).not.toHaveBeenCalled()
      expect(wrapper.emitted('research')).toBeUndefined()
      const toggle = dock.get('[data-hall-detail-toggle]')
      expect(toggle.attributes('aria-expanded')).toBe('false')
      await toggle.trigger('click')
      expect(toggle.attributes('aria-expanded')).toBe('true')
      expect(dock.get('.hall-detail-body').attributes('data-expanded')).toBe('true')
      await board.get('[data-hall-inspect="power"]').trigger('click')
      await dock.get('[data-hall-confirm]').trigger('click')
      expect(wrapper.emitted('research')).toEqual([['power']])
      await wrapper.get('[data-hall-tab="mastery"]').trigger('click')
      await wrapper.get('[data-hall-tab="research"]').trigger('click')
      expect(board.get('[data-hall-detail]').isVisible()).toBe(true)
    } finally {
      wrapper.unmount()
      window.matchMedia = original
      HTMLElement.prototype.scrollIntoView = previousScroll
    }
  })

  it('names each category once: no section heading repeats its tab label', () => {
    const wrapper = mount(ProgressionPanel, { props: { state: createMetaState(), hero: 'knight', status: 'ready' } })
    for (const tab of wrapper.findAll('[data-hall-tab]')) {
      const section = wrapper.get(`[data-hall-category="${tab.attributes('data-hall-tab')}"]`)
      const label = tab.findAll('span').at(-1)!.text().trim()
      for (const heading of section.findAll('h3')) expect(heading.text(), label).not.toBe(label)
    }
  })
})

describe('Hall rank ceremony presentation', () => {
  it('distinguishes partial route progress from a fully unlocked destination', async () => {
    const state = createMetaState()
    state.embers = 10000
    state.research.power = 1
    state.research.vitality = 1
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    await wrapper.get('[data-hall-inspect="insight"]').trigger('click')
    await wrapper.get('.hall-growth--tree [data-hall-confirm]').trigger('click')
    const first = buyResearch(state, 'insight').state
    await wrapper.setProps({ state: first })
    expect(wrapper.get('[data-hall-upgraded="insight"]').attributes('data-hall-stage')).toBe('1')
    expect(wrapper.get('[data-hall-upgraded="insight"]').attributes('data-hall-route')).toBe('false')
    expect(wrapper.get('[data-hall-node="ember-study"]').attributes('data-hall-arrived')).toBe('false')
    await wrapper.get('[data-hall-inspect="scavenging"]').trigger('click')
    await wrapper.get('.hall-growth--tree [data-hall-confirm]').trigger('click')
    await wrapper.setProps({ state: buyResearch(first, 'scavenging').state })
    expect(wrapper.get('[data-hall-upgraded="scavenging"]').attributes('data-hall-route')).toBe('true')
    expect(wrapper.get('[data-hall-node="ember-study"]').attributes('data-hall-arrived')).toBe('true')
    expect(wrapper.get('[data-hall-unlock-notice]').text()).toContain('餘燼研究')
    wrapper.unmount()
  })
})


it('never compiles scoped reduced-motion or flashing CSS that hides the document root', async () => {
  const { parse, compileStyle } = await import('vue/compiler-sfc')
  const { readFileSync, readdirSync } = await import('node:fs')
  const { join } = await import('node:path')
  const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter(file => file.endsWith('.vue'))
  const offenders: string[] = []
  for (const file of files) {
    const filename = join('src', file)
    const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
    for (const style of descriptor.styles) {
      if (!style.scoped) continue
      const compiled = compileStyle({ source: style.content, filename, id: 'data-v-a11y-regression', scoped: true })
      expect(compiled.errors, filename).toEqual([])
      for (const match of compiled.code.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
        if (!/display\s*:\s*none/.test(match[2]!)) continue
        for (const selector of match[1]!.split(',')) {
          if (/^\[data-es2-reduce-(motion|flashing)\s*=\s*["']?true["']?\]$/.test(selector.trim())) {
            offenders.push(filename + ': ' + selector.trim())
          }
        }
      }
    }
  }
  expect(files.length).toBeGreaterThan(3)
  expect(offenders).toEqual([])
})

describe('Hall upgrade detail presentation', () => {
  it('shows current and next ranks with the catalog increment and removes the preview at maximum rank', async () => {
    const state = createMetaState()
    state.embers = 50_000
    state.research.power = 3
    const wrapper = mount(ProgressionPanel, { props: { state, hero: 'knight', status: 'ready' } })
    const detail = () => wrapper.get('[data-hall-detail]')
    const increment = '+' + Number((BALANCE.meta.research.power.benefitPerRank * 100).toFixed(2)) + '%'
    expect(detail().get('[data-hall-rank-label]').text()).toContain('3 / 5')
    expect(detail().get('[data-hall-current]').text()).toContain('Lv. 3')
    expect(detail().get('[data-hall-next]').text()).toContain('Lv. 4')
    expect(detail().get('[data-hall-increment]').text()).toContain(increment)
    expect(detail().findAll('.hall-detail-pip[data-filled="true"]')).toHaveLength(3)
    const maxed = structuredClone(state)
    maxed.research.power = 5
    await wrapper.setProps({ state: maxed })
    expect(detail().attributes('data-rank-complete')).toBe('true')
    expect(detail().get('[data-hall-rank-label]').text()).toContain('MAX')
    expect(detail().find('[data-hall-next]').exists()).toBe(false)
    expect(detail().find('[data-hall-increment]').exists()).toBe(false)
    expect(detail().get('[data-hall-confirm]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
