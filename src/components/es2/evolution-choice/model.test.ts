import { describe, expect, it } from 'vitest'
import { createHero, createState } from '../../../game/state'
import { EVOLUTION2_RECIPES } from '../../../game/content/evolution2/recipes'
import { evolutionChoices } from './model'

describe('Evolution2 selection view model', () => {
  it('shows all twelve recipes with accurate current and required levels', () => {
    const state = createState()
    state.hero = createHero('knight')
    const choices = evolutionChoices(state)
    expect(choices).toHaveLength(12)
    expect(new Set(choices.map(choice => choice.id)).size).toBe(12)
    for (const choice of choices) {
      expect(choice.requiredWeaponLevel).toBe(3)
      expect(choice.requiredPassiveLevel).toBe(3)
      expect(choice.weaponLevel).toBe(0)
      expect(choice.passiveLevel).toBe(0)
      expect(choice.eligible).toBe(false)
      expect(choice.unlocked).toBe(false)
    }
  })

  it('enables only fully satisfied recipes and disables previously acquired evolutions', () => {
    const state = createState()
    state.hero = createHero('knight')
    const recipe = EVOLUTION2_RECIPES[0]!
    state.content.levels[recipe.weaponId] = recipe.weaponLevel
    expect(evolutionChoices(state)[0]!.eligible).toBe(false)
    state.hero.skills[recipe.passiveId] = recipe.passiveLevel
    expect(evolutionChoices(state)[0]!.eligible).toBe(true)
    expect(evolutionChoices(state)[1]!.eligible).toBe(false)
    state.content.levels[recipe.id] = 1
    const acquired = evolutionChoices(state)[0]!
    expect(acquired.unlocked).toBe(true)
    expect(acquired.eligible).toBe(false)
    expect(acquired.weaponLevel).toBe(3)
    expect(acquired.passiveLevel).toBe(3)
  })

  it('never enables choices without a hero or after per-run reset', () => {
    const state = createState()
    expect(evolutionChoices(state).every(choice => !choice.eligible)).toBe(true)
    state.hero = createHero('knight')
    const recipe = EVOLUTION2_RECIPES[11]!
    state.content.levels[recipe.weaponId] = 3
    state.hero.skills[recipe.passiveId] = 3
    expect(evolutionChoices(state)[11]!.eligible).toBe(true)
    state.content.levels = {}
    state.hero.skills = {}
    expect(evolutionChoices(state)[11]!.eligible).toBe(false)
  })
})
