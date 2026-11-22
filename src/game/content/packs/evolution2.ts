import type { ContentContext, ContentPack } from '../contracts'
import { executeEvolution } from '../evolution2/combat'
import { EVOLUTION2_EFFECTS } from '../evolution2/cues'
import { EVOLUTION2_RECIPES } from '../evolution2/recipes'

// Resolve every packaged 3x illustration once at bundle build; keep legacy
// glyphs as an explicit fallback if a source URL is absent.
const productionArt = import.meta.glob('../../../assets/es2/production/evolutions/*@3x.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

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
    iconSrc: productionArt[`../../../assets/es2/production/evolutions/${recipe.id.split(':')[1]}@3x.webp`],
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
    onTick(context: ContentContext) { executeEvolution(context, recipe) },
  })),
  effects: EVOLUTION2_EFFECTS,
}
