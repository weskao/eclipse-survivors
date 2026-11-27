import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import Es2SkillSummary from './Es2SkillSummary.vue'
import { monsterGroups } from './monster-details'
import { MONSTER_IDS } from '../../../game/monster-catalog'
import HeroActiveSummary from '../hero-roster/HeroActiveSummary.vue'

const source = readFileSync(resolve('src/components/es2/menu/Es2SkillSummary.vue'), 'utf8')

describe('shared skill value column', () => {
  it('uses content-sized trailing values without a divider, preserving the full-height column', () => {
    expect(source).toMatch(/\.es2-active-summary\[data-has-detail\] \{ grid-template-columns:minmax\(0,1fr\) fit-content\(40%\); \}/)
    expect(source).not.toMatch(/\[data-compact="true"\]\[data-has-detail\] \{ grid-template-columns:/)
    const style = source.match(/\.es2-active-summary__cooldown \{([^}]+)\}/)?.[1] ?? ''
    expect(style).toContain('align-items:flex-end')
    expect(style).toContain('justify-content:center')
    expect(style).toContain('align-self:stretch')
    expect(style).toContain('padding:6px 5px')
    expect(style).toContain('text-align:end')
    expect(style).not.toContain('border-inline-start')
    expect(source).toContain('padding:4px 3px; font-size:.7rem')
  })


  it.each([false, true])('keeps the hero numeric value outside the text area (compact=%s)', compact => {
    const wrapper = mount(HeroActiveSummary, { props: { heroId: 'shadowblade', compact } })
    const value = wrapper.get('[data-active-skill-cooldown]')
    const main = wrapper.get('.es2-active-summary__main')
    expect(value.element.parentElement).toBe(wrapper.element)
    expect(main.element.contains(value.element)).toBe(false)
    expect(value.text()).toBe('9.5s')
    expect(main.get('[data-active-skill-name]').text()).toBeTruthy()
    if (!compact) expect(main.get('.es2-active-summary__desc').text()).toBeTruthy()
    wrapper.unmount()
  })

  it.each(MONSTER_IDS.flatMap(monsterGroups).flatMap(group => group.skills).map(skill => [skill.id, skill] as const))('reserves a separate value column for monster/boss skill %s', (_id, skill) => {
    const wrapper = mount(Es2SkillSummary, { props: { icon: skill.icon, title: skill.title, detail: skill.detail, description: skill.description } })
    const value = wrapper.get('[data-active-skill-cooldown]')
    expect(value.element.parentElement).toBe(wrapper.element)
    expect(wrapper.get('.es2-active-summary__main').element.contains(value.element)).toBe(false)
    expect(value.findAll('span').map(part => part.text()).join(' · ')).toBe(skill.detail)
    expect(wrapper.get('.es2-active-summary__desc').text()).toBe(skill.description)
    wrapper.unmount()
  })

  it('does not reserve an empty numeric column when no detail is supplied', () => {
    const wrapper = mount(Es2SkillSummary, { props: { icon: 'icon.webp', title: 'Example', description: 'Description' } })
    expect(wrapper.attributes('data-has-detail')).toBeUndefined()
    expect(wrapper.find('[data-active-skill-cooldown]').exists()).toBe(false)
    wrapper.unmount()
  })
})
