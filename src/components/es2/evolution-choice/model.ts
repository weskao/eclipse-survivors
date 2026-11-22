import type { ContentId, GameState } from '../../../game/types'
import { EVOLUTION2_RECIPES } from '../../../game/content/evolution2/recipes'

export interface EvolutionChoice {
  readonly id: ContentId
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly weaponTitle: string
  readonly passiveTitle: string
  readonly weaponLevel: number
  readonly passiveLevel: number
  readonly requiredWeaponLevel: number
  readonly requiredPassiveLevel: number
  readonly eligible: boolean
  readonly unlocked: boolean
}

/** Presentation only. The host must still use applyUpgrade/registry.acquire to authorize a claim. */
export function evolutionChoices(state: Pick<GameState, 'hero' | 'content'>): EvolutionChoice[] {
  return EVOLUTION2_RECIPES.map(recipe => {
    const weaponLevel = state.content.levels[recipe.weaponId] ?? 0
    const passiveLevel = state.hero?.skills[recipe.passiveId] ?? 0
    const unlocked = (state.content.levels[recipe.id] ?? 0) > 0
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.desc,
      icon: recipe.icon,
      weaponTitle: recipe.weaponTitle,
      passiveTitle: recipe.passiveTitle,
      weaponLevel,
      passiveLevel,
      requiredWeaponLevel: recipe.weaponLevel,
      requiredPassiveLevel: recipe.passiveLevel,
      eligible: !!state.hero && !unlocked
        && weaponLevel >= recipe.weaponLevel && passiveLevel >= recipe.passiveLevel,
      unlocked,
    }
  })
}
