import type { SpecializationId } from '../../content/heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'
import shadowblade from '../../../assets/es2/production/heroes/shadowblade-8dir@3x.webp'
import summoner from '../../../assets/es2/production/heroes/spirit-summoner-8dir@3x.webp'
import paladin from '../../../assets/es2/production/heroes/crimson-paladin-8dir@3x.webp'
import shadowAction from '../../../assets/es2/production/heroes/shadowblade-run-attack@3x.webp'
import summonerAction from '../../../assets/es2/production/heroes/spirit-summoner-run-attack@3x.webp'
import paladinAction from '../../../assets/es2/production/heroes/crimson-paladin-run-attack@3x.webp'

/**
 * Original authoring grid cut into 32 isolated 128px cells per hero.
 * Columns follow the runtime's direction octants E, SE, S, SW, W, NW, N, NE;
 * rows are idle, run, attack and cast. HeroAnimation already owns direction.
 */
export const PRODUCTION_HERO_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade,
  'spirit-summoner': summoner,
  'crimson-paladin': paladin,
})

/** Separate authored 8-frame right-facing motion strip for each existing 8-direction hero. */
export const PRODUCTION_HERO_ACTION_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade: shadowAction,
  'spirit-summoner': summonerAction,
  'crimson-paladin': paladinAction,
})

type AtlasWithAction = HTMLImageElement & { actionStrip?: HTMLImageElement }
export type ProductionHeroArtwork = Record<SpecializationId, HTMLImageElement>

export function loadProductionHeroes(makeImage: () => HTMLImageElement = () => new Image()): ProductionHeroArtwork {
  const result = {} as ProductionHeroArtwork
  for (const id of Object.keys(PRODUCTION_HERO_SOURCES) as SpecializationId[]) {
    const image = makeImage() as AtlasWithAction
    image.src = PRODUCTION_HERO_SOURCES[id]
    const action = makeImage()
    action.src = PRODUCTION_HERO_ACTION_SOURCES[id]
    image.actionStrip = action
    result[id] = image
  }
  return result
}

/** Exact 448px action-strip indexing, never read from a neighbor cell. */
export function productionHeroActionFrame(anim: HeroAnimation): number {
  if (anim.reducedMotion) return 0
  if (anim.pose === 'run' || anim.pose === 'dash')
    return Math.abs(Math.floor(anim.frame)) % 3
  if (anim.pose === 'attack' || anim.pose === 'cast')
    return 3 + Math.min(4, Math.floor(Math.max(0, Math.min(0.9999, anim.phase)) * 5))
  return 0
}

/** Legacy 4×96-pixel strips remain supported for existing fallback tests and consumers. */
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

export interface ProductionHeroSourceRect {
  readonly x: number
  readonly y: number
  readonly width: 128
  readonly height: 128
}

/**
 * Exact per-cell crop, no adjacent frame interpolation or fake left/right flip.
 * Hurt/death/victory intentionally use the already-authored legacy fallback,
 * since their eight-direction artwork is not supplied by this source atlas.
 */
export function productionHeroDirectionRect(anim: HeroAnimation): ProductionHeroSourceRect | null {
  const row = anim.reducedMotion ? 0 :
    anim.pose === 'idle' ? 0 :
      anim.pose === 'run' || anim.pose === 'dash' ? 1 :
        anim.pose === 'attack' ? 2 :
          anim.pose === 'cast' ? 3 : -1
  if (row < 0) return null
  const dir = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  return { x: dir * 128, y: row * 128, width: 128, height: 128 }
}

export function drawProductionHeroFrame(
  ctx: Ctx2D, image: HTMLImageElement, anim: HeroAnimation, width: number, height: number,
): boolean {
  if (!image.complete) return false
  if (image.naturalWidth === 1024 && image.naturalHeight === 512) {
    // Keep the legacy authored eight directions for every view except E, where
    // an independently illustrated, high-detail 8-frame run/attack sequence
    // can be shown. The new strip is single-direction: never pretend it is 8-way.
    const action = (image as AtlasWithAction).actionStrip
    const octant = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
    const acting = anim.pose === 'run' || anim.pose === 'dash' || anim.pose === 'attack' || anim.pose === 'cast'
    if (!anim.reducedMotion && octant === 0 && acting
      && action?.complete && action.naturalWidth === 3584 && action.naturalHeight === 448) {
      const frame = productionHeroActionFrame(anim)
      const paintedWidth = width * 1.3
      const paintedHeight = height * 1.25
      ctx.drawImage(action, frame * 448, 0, 448, 448,
        -paintedWidth / 2, 4 - paintedHeight, paintedWidth, paintedHeight)
      return true
    }
    const r = productionHeroDirectionRect(anim)
    if (!r) return false
    // The authored body occupies only the middle ~50px of each 128px cell.
    // Normalize that visible silhouette to the original three heroes' scale,
    // with the authored feet (~70% down the cell) on the unchanged ground point.
    // This changes artwork only, never collision, hitboxes or actor geometry.
    const scale = 2.5
    const paintedWidth = width * scale
    const paintedHeight = height * scale
    ctx.drawImage(image, r.x, r.y, r.width, r.height,
      -paintedWidth / 2, 4 - paintedHeight * 0.7, paintedWidth, paintedHeight)
    return true
  }
  if (image.naturalWidth !== 384 || image.naturalHeight !== 96) return false
  ctx.drawImage(image, productionHeroFrame(anim) * 96, 0, 96, 96,
    -width / 2, -height + 4, width, height)
  return true
}
