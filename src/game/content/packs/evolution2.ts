import type { ContentPack } from '../contracts'
import { executeEvolution } from '../evolution2/combat'
import { EVOLUTION2_EFFECTS } from '../evolution2/cues'
import { EVOLUTION2_RECIPES } from '../evolution2/recipes'

/**
 * Independent optional content pack. The integration owner alone wires it into
 * CONTENT_PACKS alongside the separately implemented weapons pack.
 * Prerequisite weapons are referenced by canonical ID, never redefined here.
 */
export const EVOLUTION2_PACK: ContentPack = {
  id: 'evolution2',
  abilities: EVOLUTION2_RECIPES.map(recipe => ({
    id: recipe.id,
    kind: 'evolution' as const,
    icon: recipe.icon,
    title: recipe.title,
    desc: recipe.desc,
    rarity: 'legendary' as const,
    maxLevel: 1,
    isEvolution: true,
    cooldownSeconds: recipe.cooldownSeconds,
    requires: [
      { id: recipe.weaponId, level: recipe.weaponLevel },
      { id: recipe.passiveId, level: recipe.passiveLevel },
    ],
    requirements: `${recipe.weaponTitle} Lv.${recipe.weaponLevel} + ${recipe.passiveTitle} Lv.${recipe.passiveLevel}`,
    onTick(context) { executeEvolution(context, recipe) },
  })),
  effects: EVOLUTION2_EFFECTS,
}
