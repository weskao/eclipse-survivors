import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import HeroRoster from './HeroRoster.vue'
import HeroSpecialAction from './HeroSpecialAction.vue'
import Es2MainMenu from '../menu/Es2MainMenu.vue'

const instances: Array<{ unmount(): void }> = []
function render(component: Component, props: Record<string, unknown>) {
  const wrapper = mount(component, { attachTo: document.body, props })
  instances.push(wrapper)
  return wrapper
}
afterEach(() => {
  for (const wrapper of instances.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('ES2 three-hero selection UI', () => {
  it('renders exactly three illustrated cards and shows equipment, stats, skills and strengths', () => {
    const wrapper = render(HeroRoster, { selectedId: 'shadowblade' })
    expect(wrapper.findAll('[data-hero-id]')).toHaveLength(3)
    expect(wrapper.get('[data-hero-id="shadowblade"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero-id="spirit-summoner"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('img[data-hero-skill-icon]')).toHaveLength(3)
    expect(wrapper.text()).toContain('影刃')
    expect(wrapper.text()).toContain('HP')
    expect(wrapper.text()).toContain('ATK')
    expect(wrapper.text()).toContain('SPD')
    expect(wrapper.text()).toContain('起始武器')
    expect(wrapper.text()).toContain('冷卻')
  })


  it('uses each selected hero\'s full-resolution 3x portrait, not a cropped 128px gameplay cell', () => {
    const wrapper = render(HeroRoster, { selectedId: 'shadowblade' })
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      const portrait = wrapper.get(`[data-hero-id="${id}"] img.es2-roster__portrait`)
      expect(portrait.attributes('src')).toContain(id + '-portrait@3x.webp')
      expect(wrapper.find(`[data-hero-id="${id}"] svg.es2-roster__portrait`).exists()).toBe(false)
    }
  })

  it('uses distinct generated art for each hero active skill in character cards', () => {
    const wrapper = render(HeroRoster, { selectedId: 'shadowblade' })
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      const image = wrapper.get(`[data-hero-id="${id}"] [data-hero-skill-icon]`)
      expect(image.attributes('src')).toContain(id + '-special')
      expect(image.attributes('alt')).toContain('主動技能')
    }
  })

  it('selects through pointer and arrow-key focus, and respects disabled state', async () => {
    const wrapper = render(HeroRoster, { selectedId: 'shadowblade' })
    await wrapper.get('[data-hero-id="crimson-paladin"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['crimson-paladin'])
    const initial = wrapper.get('[data-hero-id="shadowblade"]')
    await initial.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['spirit-summoner'])
    expect(document.activeElement).toBe(wrapper.get('[data-hero-id="spirit-summoner"]').element)
    await wrapper.setProps({ disabled: true })
    await wrapper.get('[data-hero-id="crimson-paladin"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(2)
  })
})

describe('ES2 shared homepage hero selection interaction', () => {
  it('uses the same animated selection surface for the classic and specialization heroes', async () => {
    const wrapper = render(Es2MainMenu, { choice: 'knight', runMode: 'quick', version: '1.2.0' })
    const cards = [...wrapper.findAll('.es2-hero-card'), ...wrapper.findAll('.es2-roster__card')]
    expect(cards).toHaveLength(6)
    for (const card of cards) {
      expect(card.classes()).toContain('es2-hero-select-card')
      expect(card.find('img').exists()).toBe(true)
    }
    await wrapper.setProps({ heroId: 'crimson-paladin' })
    expect(wrapper.get('[data-hero-id="crimson-paladin"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero="knight"]').attributes('aria-pressed')).toBe('false')
  })

  it('uses one card gradient with a muted hero tint and gold reserved for selection', () => {
    const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    const panels = [...css.matchAll(/\.es2-menu \.es2-hero-select-card\s*\{([^}]+)\}/g)]
    const backgrounds = panels.filter(([, rules]) => rules.includes('background:'))
    expect(backgrounds).toHaveLength(1)
    expect(backgrounds[0]![1]).toContain('var(--es2-hero-glow)')
    expect(css).toContain('--es2-hero-glow:var(--es2-hero-idle-glow)')
    const selected = css.match(/\.es2-menu \.es2-hero-select-card\[aria-pressed="true"\]\s*\{([^}]+)\}/)
    expect(selected?.[1]).toContain('--es2-hero-glow:#ffd16b80')
    for (const id of ['knight', 'ranger', 'wizard', 'shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      expect(css).toMatch(new RegExp('\\[data-hero(?:-id)?="' + id + '"\\]\\s*\\{--es2-hero-idle-glow:#[0-9a-f]{6}28\\}'))
    }
    expect(css).not.toMatch(/\.es2-hero-card\[data-es2-cosmetic\][^{]*>img\s*\{/)
    expect(css).not.toMatch(/\.es2-hero-select-card(?:\[aria-pressed="true"\])?>img\s*\{background:/)
  })

  it('shares hover, press, selection glow and portrait lift with a reduced-motion fallback', () => {
    const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
    expect(css).toContain('.es2-menu .es2-hero-select-card{')
    expect(css).toContain('.es2-hero-select-card:hover:not(:disabled){transform:translateY(-3px)')
    expect(css).toContain('.es2-hero-select-card:active:not(:disabled){transform:translateY(-1px) scale(.99)}')
    expect(css).toMatch(/\.es2-hero-select-card\[aria-pressed="true"\]\s*\{[^}]*border-color:#ffe3a3;[^}]*box-shadow:/)
    expect(css).toContain('.es2-hero-select-card > img{transition:transform')
    expect(css).toContain('.es2-hero-select-card[aria-pressed="true"] > img{transform:translateY(-6px)}')
    expect(css).toContain('.es2-menu .es2-hero-select-card:is(:hover,:active):not(:disabled){transform:none}')
    expect(css).toContain('.es2-hero-select-card[aria-pressed="true"] > img{transform:none}')
  })
})

describe('ES2 dedicated hero special action', () => {
  it('shows live cooldown, triggers one mouse/touch activation, and disables unavailable actions', async () => {
    const wrapper = render(HeroSpecialAction, {
      heroId: 'shadowblade', active: true,
      snapshot: { cooldown: 0, stealth: 0, barrier: 0, companions: [] },
    })
    const action = wrapper.get('[data-hero-special]')
    expect(action.attributes('aria-keyshortcuts')).toBe('Q')
    await action.trigger('click')
    expect(wrapper.emitted('activate')).toHaveLength(1)
    await wrapper.setProps({ snapshot: { cooldown: 5.2, stealth: 0, barrier: 0, companions: [] } })
    expect(wrapper.text()).toContain('5.2')
    expect(action.attributes('disabled')).toBeDefined()
    await action.trigger('click')
    expect(wrapper.emitted('activate')).toHaveLength(1)
  })

  it('shows the distinct active-skill artwork on the live ability button', () => {
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      const wrapper = render(HeroSpecialAction, {
        heroId: id, active: true,
        snapshot: { cooldown: 0, stealth: 0, barrier: 0, companions: [] },
      })
      const image = wrapper.get('[data-hero-special-icon]')
      expect(image.attributes('src')).toContain(id + '-special')
      expect(image.attributes('alt')).toBe('')
      expect(wrapper.get('[data-hero-special]').attributes('aria-label')).toContain('可施放')
    }
  })

  it('themes the Q cast button per hero and exposes a non-animated cooldown state', async () => {
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const) {
      const wrapper = render(HeroSpecialAction, {
        heroId: id, active: true,
        snapshot: { cooldown: 0, stealth: 0, barrier: 0, companions: [] },
      })
      expect(wrapper.get('.es2-hero-special').attributes('data-hero')).toBe(id)
      const button = wrapper.get('[data-hero-special]')
      expect(button.attributes('data-ready')).toBe('true')
      await wrapper.setProps({ snapshot: { cooldown: 4, stealth: 0, barrier: 0, companions: [] } })
      expect(button.attributes('data-ready')).toBe('false')
    }
    const css = readFileSync(resolve('src/components/es2/hero-roster/HeroSpecialAction.vue'), 'utf8')
    expect(css).toContain('es2-special-sheen')
    expect(css).not.toContain('es2-special-orbit')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('supports Q, skips typing/repeats and removes the global listener on unmount', async () => {
    const wrapper = render(HeroSpecialAction, {
      heroId: 'spirit-summoner', active: true,
      snapshot: { cooldown: 0, stealth: 0, barrier: 0, companions: [] },
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', repeat: true, bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }))
    expect(wrapper.emitted('activate')).toHaveLength(1)
    // Vue drops its emission store at unmount: keep the live array reference to
    // prove global keydown no longer emits after the component is removed.
    const emitted = wrapper.emitted('activate')!
    wrapper.unmount()
    instances.splice(instances.indexOf(wrapper), 1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }))
    expect(emitted).toHaveLength(1)
  })
})

describe('real menu roster integration', () => {
  it('shows the original three plus three new heroes, with real selected identity', async () => {
    const wrapper = render(Es2MainMenu, {
      choice: 'knight', heroId: 'shadowblade', runMode: 'quick', version: '1.2.0',
    })
    expect(wrapper.findAll('.es2-hero-card')).toHaveLength(3)
    expect(wrapper.findAll('[data-hero-id]')).toHaveLength(3)
    expect(wrapper.get('[data-hero-id="shadowblade"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-hero="knight"]').attributes('aria-pressed')).toBe('false')
    await wrapper.get('[data-hero-id="spirit-summoner"]').trigger('click')
    expect(wrapper.emitted('selectHero')?.[0]).toEqual(['spirit-summoner'])
    await wrapper.get('[data-hero="wizard"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['wizard'])
  })
})
