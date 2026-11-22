import type { SpecializationId } from '../../content/heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'
import shadowblade from '../../../assets/es2/production/heroes/shadowblade-action@3x.webp'
import summoner from '../../../assets/es2/production/heroes/spirit-summoner-action@3x.webp'
import paladin from '../../../assets/es2/production/heroes/crimson-paladin-action@3x.webp'

/** Authored 384×96 action strips: 4 distinct 3× frames, one per 96×96 slot. */
export const PRODUCTION_HERO_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade,
  'spirit-summoner': summoner,
  'crimson-paladin': paladin,
})

export type ProductionHeroArtwork = Record<SpecializationId, HTMLImageElement>

/** Load once on renderer mount; never allocate Image inside the hot draw loop. */
export function loadProductionHeroes(makeImage: () => HTMLImageElement = () => new Image()): ProductionHeroArtwork {
  const result = {} as ProductionHeroArtwork
  for (const id of Object.keys(PRODUCTION_HERO_SOURCES) as SpecializationId[]) {
    const image = makeImage()
    image.src = PRODUCTION_HERO_SOURCES[id]
    result[id] = image
  }
  return result
}

/** The gameplay projectile already exists at strike start: never redraw held windup. */
export function productionHeroFrame(anim: HeroAnimation): number {
  if (anim.reducedMotion) return 0
  switch (anim.pose) {
    case 'attack':
    case 'cast':
      return anim.phase < 0.55 ? 2 : 3
    case 'dash':
      return 1
    case 'run':
      return Math.floor(anim.frame / 2) % 2
    case 'hurt':
    case 'death':
      return 3
    default:
      return 0
  }
}

/** Mirrors direction with the enclosing Canvas transform; returns false until decoded. */
export function drawProductionHeroFrame(
  ctx: Ctx2D, image: HTMLImageElement, anim: HeroAnimation, width: number, height: number,
): boolean {
  if (!image.complete || image.naturalWidth !== 384 || image.naturalHeight !== 96) return false
  ctx.drawImage(image, productionHeroFrame(anim) * 96, 0, 96, 96,
    -width / 2, -height + 4, width, height)
  return true
}
