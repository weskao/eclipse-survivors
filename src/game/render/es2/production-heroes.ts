import type { SpecializationId } from '../../content/heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'
import { heroes as atlasManifest } from '../../../assets/es2/production/heroes/c104-atlas-manifest.json'
import shadowblade from '../../../assets/es2/production/heroes/shadowblade-c104-atlas@3x.webp'
import summoner from '../../../assets/es2/production/heroes/spirit-summoner-c104-atlas@3x.webp'
import paladin from '../../../assets/es2/production/heroes/crimson-paladin-c104-atlas@3x.webp'

/**
 * Runtime atlases cut from the c104 hero sheets by scripts/es2/build_c104_hero_atlases.py.
 * Row = section * 8 + direction octant (E, SE, S, SW, W, NW, N, NE); column = frame.
 * Section 0 is the run cycle, section 1 the authored attack/cast cycle.
 */
export const PRODUCTION_HERO_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade,
  'spirit-summoner': summoner,
  'crimson-paladin': paladin,
})

export type C104HeroAtlas = (typeof atlasManifest)[SpecializationId]
export const C104_HERO_ATLASES: Readonly<Record<SpecializationId, C104HeroAtlas>> = atlasManifest
const ATLAS_LIST: readonly C104HeroAtlas[] = Object.values(atlasManifest)

export type ProductionHeroArtwork = Record<SpecializationId, HTMLImageElement>

export function loadProductionHeroes(makeImage: () => HTMLImageElement = () => new Image()): ProductionHeroArtwork {
  const result = {} as ProductionHeroArtwork
  for (const id of Object.keys(PRODUCTION_HERO_SOURCES) as SpecializationId[]) {
    const image = makeImage()
    image.src = PRODUCTION_HERO_SOURCES[id]
    result[id] = image
  }
  return result
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

/** Decoded image dimensions identify which hero atlas it is (unique per hero, asserted in tests). */
function atlasFor(image: HTMLImageElement): C104HeroAtlas | undefined {
  if (!image.complete) return undefined
  for (const atlas of ATLAS_LIST) {
    if (image.naturalWidth === atlas.width && image.naturalHeight === atlas.height) return atlas
  }
  return undefined
}

export const isDirectionalHeroAtlas = (image: HTMLImageElement): boolean => atlasFor(image) !== undefined

export interface ProductionHeroSourceRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Exact per-cell crop, no adjacent-frame interpolation or fake left/right flip.
 * Hurt/death/victory have no c104 artwork and return null so the legacy fallback draws.
 */
export function productionHeroCellRect(atlas: C104HeroAtlas, anim: HeroAnimation): ProductionHeroSourceRect | null {
  const action = anim.pose === 'attack' || anim.pose === 'cast'
  if (!action && anim.pose !== 'idle' && anim.pose !== 'run' && anim.pose !== 'dash') return null
  const section = atlas.sections[action && !anim.reducedMotion ? 1 : 0]!
  const still = anim.reducedMotion || anim.pose === 'idle' || !(anim.count > 0)
  const frame = still ? 0 : Math.min(section.frames - 1, Math.max(0, Math.floor(anim.frame * section.frames / anim.count)))
  const dir = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  const { width, height } = atlas.cell
  return { x: frame * width, y: (section.rowOffset + dir) * height, width, height }
}

/** Square source box framing the authored body in one atlas row (for DOM portraits/previews). */
export function heroBodyBox(atlas: C104HeroAtlas, row: number): { x: number; y: number; side: number } {
  const side = Math.round(atlas.bodyHeight * 1.25)
  return {
    x: atlas.cell.anchorX - side / 2,
    y: row * atlas.cell.height + Math.max(0, atlas.cell.baseline + 4 - side),
    side,
  }
}

export function drawProductionHeroFrame(
  ctx: Ctx2D, image: HTMLImageElement, anim: HeroAnimation, width: number, height: number,
): boolean {
  if (!image.complete) return false
  const atlas = atlasFor(image)
  if (atlas) {
    const r = productionHeroCellRect(atlas, anim)
    if (!r) return false
    // Normalize the authored body to the original heroes' on-screen height with the
    // feet on the unchanged ground point. Artwork only: collision and hitboxes are untouched.
    const k = (height * 0.977) / atlas.bodyHeight
    ctx.drawImage(image, r.x, r.y, r.width, r.height,
      -atlas.cell.anchorX * k, 4 - atlas.cell.baseline * k, r.width * k, r.height * k)
    return true
  }
  if (image.naturalWidth !== 384 || image.naturalHeight !== 96) return false
  ctx.drawImage(image, productionHeroFrame(anim) * 96, 0, 96, 96,
    -width / 2, -height + 4, width, height)
  return true
}
