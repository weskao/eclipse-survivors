import type { JobId, Point } from './types'

/**
 * Relative to the hero's ground contact point, in world coordinates.
 * Keep these grip offsets in sync with the right-facing 2D limb rig.
 */
export function getFiringOrigin(job: JobId, face: 1 | -1): Point {
  const x = job === 'ranger' ? 32 : job === 'wizard' ? 35 : 31
  const y = job === 'ranger' ? -62 : job === 'wizard' ? -58 : -57
  return { x: face * x, y }
}
