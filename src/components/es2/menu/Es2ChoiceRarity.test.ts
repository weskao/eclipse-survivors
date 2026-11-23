import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setLocale } from '../../../i18n'
import Es2ChoiceCards from './Es2ChoiceCards.vue'
import type { MenuChoice } from './model'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
const storage = { getItem: () => null, setItem: () => {} }
const rule = (selector: string): string => {
  const start = css.indexOf(selector + '{')
  expect(start).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('}', start))
}
afterEach(() => setLocale('zh-TW', storage))

describe('ES2 three-choice rarity presentation', () => {
  it.each(['rare', 'epic', 'legendary'])('themes the entire %s card and its artwork', (rarity) => {
    const theme = rule(`.es2-choice.es2-rarity-${rarity}`)
    expect(theme).toContain('--es2-card-bg:linear-gradient(')
    expect(theme).toContain('--es2-card-art-bg:radial-gradient(')
    expect(theme).toContain('--es2-card-border:')
    expect(theme).toContain('--es2-card-title:')
    expect(theme).toContain('--es2-card-description:')
    expect(theme).toContain('--es2-card-accent:')
    expect(rule('.es2-choice')).toContain('background:var(--es2-card-bg)')
    expect(rule('.es2-card-art')).toContain('background:var(--es2-card-art-bg)')
    expect(rule('.es2-card-description,.es2-card-requirements')).toContain('color:var(--es2-card-description)')
    expect(rule('.es2-choice-selected')).toContain('var(--es2-rarity)')
  })

  it('enlarges rarity names without losing portrait and landscape card layouts', () => {
    expect(rule('.es2-rarity-label')).toContain('font:800 clamp(.94rem')
    expect(css).toContain('.es2-choice .es2-rarity-label{font-size:calc(.91rem * var(--es2-ui-scale,1))}')
    expect(css).toContain('.es2-choice .es2-rarity-label{font-size:calc(.86rem * var(--es2-ui-scale,1))}')
    expect(css).toContain('.es2-choice{display:grid;grid-template-columns:clamp(74px,24vw,104px)')
    expect(css).toContain('.es2-choice-grid{grid-template-columns:repeat(3,minmax(0,1fr))}')
  })

  it('renders correct Chinese and English rarity labels including epic', async () => {
    const items: MenuChoice[] = [
      { id: 'common', title: 'Normal', rarity: 'common' },
      { id: 'rare', title: 'Rare', rarity: 'rare' },
      { id: 'epic', title: 'Epic', rarity: 'epic' },
      { id: 'legendary', title: 'Legendary', rarity: 'legendary' },
    ]
    setLocale('zh-TW', storage)
    const wrapper = mount(Es2ChoiceCards, { props: { items } })
    for (const [id, label] of Object.entries({ common: '普通', rare: '稀有', epic: '史詩', legendary: '傳說' })) {
      expect(wrapper.get(`[data-choice="${id}"] .es2-rarity-label`).text()).toBe(label)
    }
    setLocale('en', storage)
    await nextTick()
    for (const [id, label] of Object.entries({ common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' })) {
      expect(wrapper.get(`[data-choice="${id}"] .es2-rarity-label`).text()).toBe(label)
    }
    wrapper.unmount()
  })
})
