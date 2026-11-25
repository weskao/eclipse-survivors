import knight from '../../assets/es2/production/skills/attack-knight.svg?url'
import shadowblade from '../../assets/es2/production/skills/attack-shadowblade.svg?url'
import paladin from '../../assets/es2/production/skills/attack-crimson-paladin.svg?url'
import summoner from '../../assets/es2/production/skills/attack-spirit-summoner.svg?url'
import type { HeroId } from '../types'
import wolf from '../../assets/es2/production/skills/spectral-wolf.svg?url'
import blazeAura from '../../assets/es2/production/skills/blaze-aura.svg?url'
import shieldAura from '../../assets/es2/production/skills/shield-aura.svg?url'
import sanctuaryAura from '../../assets/es2/production/skills/sanctuary-aura.svg?url'
import solarBeam from '../../assets/es2/production/skills/solar-beam.svg?url'

export const HERO_ATTACK_ART = { knight, shadowblade, 'crimson-paladin': paladin, 'spirit-summoner': summoner, wolf, 'blaze-aura': blazeAura, 'shield-aura': shieldAura, 'sanctuary-aura': sanctuaryAura, 'solar-beam': solarBeam } as const
export type HeroAttackArtId = keyof typeof HERO_ATTACK_ART
export type HeroAttackSprites = Partial<Record<HeroAttackArtId, HTMLImageElement>>
export const meleeArtId = (id: HeroId): HeroAttackArtId =>
  id === 'shadowblade' || id === 'crimson-paladin' ? id : 'knight'

let shared: HeroAttackSprites | undefined
export function loadHeroAttackArt(makeImage: () => HTMLImageElement = () => new Image()): HeroAttackSprites {
  const result: HeroAttackSprites = {}
  for (const id of Object.keys(HERO_ATTACK_ART) as HeroAttackArtId[]) {
    const image = makeImage()
    image.decoding = 'async'
    image.src = HERO_ATTACK_ART[id]
    result[id] = image
  }
  return result
}
export function sharedHeroAttackArt(): HeroAttackSprites {
  return shared ??= loadHeroAttackArt()
}
