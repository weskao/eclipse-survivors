import type { Hero, JobId } from '../types'
import type { HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'
import atlasUrl from '../../assets/hero-combat-atlas.webp'

/**
 * Real, manually composited RGBA art, not skinned pixels from a static portrait.
 * Atlas layout: 4 columns x (3 rows per hero), 48x60 source pixels per cell.
 * The art contains twelve full-body action poses for each playable character.
 */
const WIDTH = 48
const HEIGHT = 60
const COLUMNS = 4
const FRAMES = 12
const ROWS_PER_HERO = 3
const ROW: Record<JobId, number> = { knight: 0, ranger: 3, wizard: 6 }

export function loadPaintedHeroAtlas(): HTMLImageElement {
  const image = new Image()
  image.src = atlasUrl
  return image
}

export function frameForPose(
  job: JobId, anim: HeroAnimation,
): { x: number; y: number } {
  let index = 11 // stable neutral-ready pose, not an attacking/charged frame
  if (anim.pose === 'attack' || anim.pose === 'cast') {
    index = Math.min(FRAMES - 1, Math.max(0, Math.floor(anim.frame * FRAMES / anim.count)))
  } else if (anim.pose === 'run') {
    index = [9, 10, 11, 10][Math.floor(anim.phase * 4) % 4]!
  } else if (anim.pose === 'dash') {
    index = 8
  } else if (anim.pose === 'hurt') {
    index = 9
  } else if (anim.pose === 'victory') {
    index = 10
  }
  return { x: (index % COLUMNS) * WIDTH, y: (ROW[job] + Math.floor(index / COLUMNS)) * HEIGHT }
}

/**
 * Draw one complete, undeformed pose. No weapon mesh, bow overlay, duplicate
 * arrow or spell charge is drawn on top of the baked frame.
 * The live shot remains a separate world-space effect in drawShots().
 */
export function drawPaintedHero(
  ctx: Ctx2D, atlas: HTMLImageElement, job: JobId, hero: Hero,
  anim: HeroAnimation, _width: number, height: number,
): boolean {
  if (!atlas.complete || atlas.naturalWidth !== WIDTH * COLUMNS ||
    atlas.naturalHeight !== HEIGHT * ROWS_PER_HERO * 3) return false
  const frame = frameForPose(job, anim)
  const renderedWidth = height * WIDTH / HEIGHT // uniform x/y scale
  ctx.save()
  if (hero.face < 0) ctx.scale(-1, 1)
  ctx.drawImage(atlas, frame.x, frame.y, WIDTH, HEIGHT,
    -renderedWidth / 2, -height + 4, renderedWidth, height)
  ctx.restore()
  return true
}
