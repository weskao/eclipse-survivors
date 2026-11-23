import sprite0 from '../../assets/es2/production/projectiles/ranger-arrow.svg?url'
import sprite1 from '../../assets/es2/production/projectiles/arcane-bolt.svg?url'
import sprite2 from '../../assets/es2/production/projectiles/enemy-hex.svg?url'
import sprite3 from '../../assets/es2/production/projectiles/enemy-ember.svg?url'
import sprite4 from '../../assets/es2/production/projectiles/shadow-dagger.svg?url'
import sprite5 from '../../assets/es2/production/projectiles/holy-lance.svg?url'
import sprite6 from '../../assets/es2/production/projectiles/bone-spear.svg?url'
import sprite7 from '../../assets/es2/production/projectiles/ricochet-blade.svg?url'
import sprite8 from '../../assets/es2/production/projectiles/spectral-arrow.svg?url'
import sprite9 from '../../assets/es2/production/projectiles/gravity-core.svg?url'
import sprite10 from '../../assets/es2/production/projectiles/arcane-mine.svg?url'
import type { Ctx2D } from './ctx'

/** Authored vector artwork stays crisp on 3x screens without bitmap upscaling. */
export const PROJECTILE_ART = {
  'ranger-arrow': sprite0,
  'arcane-bolt': sprite1,
  'enemy-hex': sprite2,
  'enemy-ember': sprite3,
  'shadow-dagger': sprite4,
  'holy-lance': sprite5,
  'bone-spear': sprite6,
  'ricochet-blade': sprite7,
  'spectral-arrow': sprite8,
  'gravity-core': sprite9,
  'arcane-mine': sprite10,
} as const

export type ProjectileArtId = keyof typeof PROJECTILE_ART
export type ProjectileSprites = Record<ProjectileArtId, HTMLImageElement>

/** Decode once, never create Image instances in the combat frame loop. */
export function loadProjectileSprites(makeImage: () => HTMLImageElement = () => new Image()): ProjectileSprites {
  return Object.fromEntries((Object.entries(PROJECTILE_ART) as [ProjectileArtId, string][]).map(([id, url]) => {
    const image = makeImage()
    image.src = url
    return [id, image]
  })) as ProjectileSprites
}

let shared: ProjectileSprites | null = null
export function sharedProjectileSprites(): ProjectileSprites {
  return shared ?? (shared = loadProjectileSprites())
}

/** Called inside a caller-owned translate/rotate; return false for the old geometry fallback. */
export function drawProjectileSprite(
  ctx: Ctx2D, sprites: Partial<ProjectileSprites> | undefined, id: ProjectileArtId,
  width: number, height = width,
): boolean {
  const image = sprites?.[id]
  if (!image?.complete || image.naturalWidth <= 0) return false
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
  return true
}
