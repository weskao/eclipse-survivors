import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHero, createState } from '../../../game/state'
import { EVOLUTION2_RECIPES } from '../../../game/content/evolution2/recipes'
import EvolutionChoicePanel from './EvolutionChoicePanel.vue'

describe('EvolutionChoicePanel accessibility and claims', () => {
  it('renders twelve named recipes and both prerequisite level counters', () => {
    const state = createState()
    state.hero = createHero('knight')
    const wrapper = mount(EvolutionChoicePanel, { props: { state, active: true } })
    expect(wrapper.findAll('button')).toHaveLength(12)
    expect(wrapper.text()).toContain('Shadow Daggers')
    expect(wrapper.text()).toContain('Haste')
    expect(wrapper.text()).toContain('0 / 3')
    expect(wrapper.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('emits only for eligible recipes and prevents selecting unlocked choices', async () => {
    const state = createState()
    state.hero = createHero('knight')
    const recipe = EVOLUTION2_RECIPES[0]!
    const wrapper = mount(EvolutionChoicePanel, { props: { state, active: true } })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('choose')).toBeUndefined()
    state.content.levels[recipe.weaponId] = 3
    state.hero.skills[recipe.passiveId] = 3
    await wrapper.setProps({ state: { ...state, content: { ...state.content }, hero: { ...state.hero } } })
    expect(wrapper.findAll('button')[0]!.attributes('disabled')).toBeUndefined()
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('choose')).toEqual([[recipe.id]])
    state.content.levels[recipe.id] = 1
    await wrapper.setProps({ state: { ...state, content: { ...state.content } } })
    expect(wrapper.findAll('button')[0]!.attributes('disabled')).toBeDefined()
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('choose')).toHaveLength(1)
  })

  it('uses authored artwork on every evolution and readable ready/locked styling', () => {
    const state = createState()
    state.hero = createHero('knight')
    const wrapper = mount(EvolutionChoicePanel, { props: { state, active: true } })
    expect(wrapper.findAll('.es2-evolution-art')).toHaveLength(EVOLUTION2_RECIPES.length)
    const source = readFileSync(resolve(process.cwd(), 'src/components/es2/evolution-choice/EvolutionChoicePanel.vue'), 'utf8')
    expect(source).toContain('es2-evolution-card::before')
    expect(source).toContain('.es2-evolution-card.is-ready')
    expect(source).toContain('prefers-reduced-motion: reduce')
  })

  it('does not expose actions when inactive', () => {
    const state = createState()
    state.hero = createHero('knight')
    const wrapper = mount(EvolutionChoicePanel, { props: { state, active: false } })
    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})
