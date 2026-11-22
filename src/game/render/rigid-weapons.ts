import type { Hero, JobId } from '../types'
import type { HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'
import { sampleWeaponRig } from './weapon-rig'
import { domCanvas, type MakeCanvas } from './sprites'

type ImageSource = HTMLImageElement | HTMLCanvasElement
type Polygon = readonly (readonly [number, number])[]

/**
 * Source-image weapon silhouettes (normalised UV coordinates).
 * A rigid sword, bow, or staff is cut out once; only the remaining costume
 * is allowed through the existing articulated texture renderer.
 *
 * Keep the original intentional curvature of the ranger's bow unchanged.
 */
const MASKS: Record<JobId, readonly Polygon[]> = {
  knight: [[
    [0, .96], [0, .78], [.15, .54], [.20, .43], [.25, .39],
    [.31, .44], [.26, .53], [.20, .61], [.11, .77], [.04, .95],
  ]],
  ranger: [[
    [.64, .79], [.69, .66], [.76, .56], [.78, .40], [.82, .25],
    [.89, .10], [.97, .07], [1, .08], [.96, .21], [.92, .34],
    [.91, .48], [.87, .61], [.81, .73], [.72, .83],
  ]],
  wizard: [
    [[.01, .06], [.08, 0], [.32, 0], [.37, .13], [.31, .25],
      [.24, .28], [.16, .22], [.06, .27], [0, .18]],
    [[.18, .18], [.25, .18], [.44, 1], [.36, 1]],
  ],
}

/**
 * Separate projectile/charge silhouettes from original art. These pixels must
 * never be drawn on the body or the persistent rigid weapon after firing.
 * Normalised points follow the loaded arrow and the caster's right-hand orb.
 */
const PROJECTILE_MASKS: Partial<Record<JobId, readonly Polygon[]>> = {
  ranger: [[
    [.59, .50], [.63, .43], [.77, .23], [.80, .18],
    [.83, .19], [.80, .26], [.66, .47], [.62, .52],
  ]],
  wizard: [[
    [.73, .15], [.79, .10], [.89, .09], [.98, .15],
    [1, .24], [.98, .33], [.90, .38], [.79, .34], [.73, .27],
  ]],
}

// Original illustration's weapon-hand attachment, not an independent stretch point.
const GRIPS: Record<JobId, readonly [number, number]> = {
  knight: [.22, .50], ranger: [.73, .55], wizard: [.26, .50],
}

export interface RigidWeaponLayers {
  body: HTMLCanvasElement
  weapon: HTMLCanvasElement
  /** Arrow on the bowstring or charge in the casting hand; never cached in the body. */
  projectile?: HTMLCanvasElement
  grip: readonly [number, number]
}

function outline(ctx: CanvasRenderingContext2D, polygons: readonly Polygon[], width: number, height: number): void {
  ctx.beginPath()
  for (const path of polygons) {
    for (let i = 0; i < path.length; i++) {
      const [u, v] = path[i]!
      if (i === 0) ctx.moveTo(u * width, v * height)
      else ctx.lineTo(u * width, v * height)
    }
    ctx.closePath()
  }
}

/** Rigid image masks are created once, never during steady-state animation. */
export function createRigidWeaponLayers(
  image: ImageSource, job: JobId, makeCanvas: MakeCanvas = domCanvas,
): RigidWeaponLayers | null {
  const width = 'naturalWidth' in image ? image.naturalWidth : image.width
  const height = 'naturalHeight' in image ? image.naturalHeight : image.height
  if (width <= 1 || height <= 1) return null
  const body = makeCanvas(width, height)
  const weapon = makeCanvas(width, height)
  const projectile = job === 'knight' ? undefined : makeCanvas(width, height)
  const b = body.getContext('2d')
  const w = weapon.getContext('2d')
  const p = projectile?.getContext('2d')
  if (!b || !w || (projectile && !p)) return null

  b.drawImage(image, 0, 0)
  b.save()
  b.globalCompositeOperation = 'destination-out'
  b.fillStyle = '#000'
  outline(b, MASKS[job], width, height)
  b.fill()
  if (PROJECTILE_MASKS[job]) {
    outline(b, PROJECTILE_MASKS[job]!, width, height)
    b.fill()
  }
  b.restore()

  w.save()
  outline(w, MASKS[job], width, height)
  w.clip()
  w.drawImage(image, 0, 0)
  w.restore()
  if (PROJECTILE_MASKS[job]) {
    w.save()
    w.globalCompositeOperation = 'destination-out'
    w.fillStyle = '#000'
    outline(w, PROJECTILE_MASKS[job]!, width, height)
    w.fill()
    w.restore()
    p!.save()
    outline(p!, PROJECTILE_MASKS[job]!, width, height)
    p!.clip()
    p!.drawImage(image, 0, 0)
    p!.restore()
  }

  return { body, weapon, projectile, grip: GRIPS[job] }
}

const memo = new WeakMap<ImageSource, Partial<Record<JobId, RigidWeaponLayers>>>()

/** Source reference changes automatically invalidate its corresponding cutouts. */
export function getRigidWeaponLayers(image: ImageSource, job: JobId, makeCanvas: MakeCanvas = domCanvas): RigidWeaponLayers | null {
  let byJob = memo.get(image)
  if (!byJob) {
    byJob = {}
    memo.set(image, byJob)
  }
  if (!byJob[job]) {
    const layers = createRigidWeaponLayers(image, job, makeCanvas)
    if (!layers) return null
    byJob[job] = layers
  }
  return byJob[job]!
}

/**
 * A single affine rigid-body transform. No grid warping, non-uniform scaling,
 * shape interpolation, or per-piece deformation is ever applied to the weapon.
 */
export function drawRigidWeapon(
  ctx: Ctx2D, layers: RigidWeaponLayers, job: JobId, hero: Hero, anim: HeroAnimation,
  width: number, height: number,
): void {
  const rest = sampleWeaponRig(job, hero, { ...anim, pose: 'idle', phase: 0 })
  const posed = sampleWeaponRig(job, hero, anim)
  const pivotX = (layers.grip[0] - .5) * width
  const pivotY = (layers.grip[1] - 1) * height + 4
  // Match the body's displayed height while preserving the original artwork's
  // width/height ratio. Never stretch a sword, bow, or staff along only one axis.
  const rigidWidth = height * layers.weapon.width / layers.weapon.height
  const action = anim.pose === 'attack' || anim.pose === 'cast'
  const turn = (job === 'ranger' && action ? posed.aim * .45 : 0)
    + (job === 'wizard' && action ? posed.aim * .35 : 0)
    + posed.bladeAngle - rest.bladeAngle
  ctx.save()
  ctx.translate(pivotX + posed.hand.x - rest.hand.x, pivotY + posed.hand.y - rest.hand.y)
  ctx.rotate(turn)
  ctx.drawImage(layers.weapon, -layers.grip[0] * rigidWidth, -layers.grip[1] * height, rigidWidth, height)
  ctx.restore()
}

/** World projectiles spawn at the START of strike. Reload art is visible only
 * during the next windup / ready-hold, never release, recovery or damage. */
export function loadedProjectileVisible(job: JobId, hero: Hero, anim: HeroAnimation): boolean {
  return job !== 'knight' && hero.strike <= 0
    && (anim.actionStage === 'windup' || anim.actionStage === 'hold')
    && anim.pose !== 'death' && anim.pose !== 'hurt' && anim.pose !== 'dash'
}

/** Pre-rendered source art, only overlaid during ready/windup. Never in an atlas. */
export function drawLoadedProjectile(
  ctx: Ctx2D, layers: RigidWeaponLayers, job: JobId, hero: Hero, anim: HeroAnimation,
  _width: number, height: number,
): void {
  if (!layers.projectile || !loadedProjectileVisible(job, hero, anim)) return
  const rigidWidth = height * layers.projectile.width / layers.projectile.height
  ctx.save()
  // Arrow follows the bow grip. Caster's held charge follows the spell hand.
  if (job === 'ranger') {
    const rest = sampleWeaponRig(job, hero, { ...anim, pose: 'idle', phase: 0 })
    const posed = sampleWeaponRig(job, hero, anim)
    ctx.translate(posed.hand.x - rest.hand.x, posed.hand.y - rest.hand.y)
  } else {
    ctx.globalAlpha *= anim.actionStage === 'windup' ? 0.74 : 1
  }
  ctx.drawImage(layers.projectile, -rigidWidth / 2, -height + 4, rigidWidth, height)
  ctx.restore()
}
