import type { Hero, JobId, Point } from '../types'
import { getFiringOrigin } from '../weapon-geometry'
import type { HeroAnimation } from './animation'

export interface WeaponRig {
  shoulder: Point
  elbow: Point
  hand: Point
  supportShoulder: Point
  supportElbow: Point
  supportHand: Point
  upperLength: number
  foreLength: number
  aim: number
  bladeAngle: number
}

const clamp = (v: number): number => Math.max(0, Math.min(1, v))
const ease = (v: number): number => { const t = clamp(v); return t * t * (3 - 2 * t) }

/** Two rigid bone lengths, a joint that bends, and an unreachable-target clamp. */
function elbowFor(shoulder: Point, hand: Point, upper: number, fore: number, bend: 1 | -1): Point {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const originalDistance = Math.hypot(dx, dy) || 1
  const distance = Math.max(Math.abs(upper - fore) + 0.001, Math.min(upper + fore - 0.001, originalDistance))
  const ux = dx / originalDistance
  const uy = dy / originalDistance
  const along = (upper * upper + distance * distance - fore * fore) / (2 * distance)
  const away = Math.sqrt(Math.max(0, upper * upper - along * along)) * bend
  return { x: shoulder.x + ux * along - uy * away, y: shoulder.y + uy * along + ux * away }
}

/** All points use right-facing screen coordinates (the renderer mirrors exactly once). */
export function sampleWeaponRig(job: JobId, hero: Hero, anim: HeroAnimation): WeaponRig {
  const action = !anim.reducedMotion && (anim.pose === 'attack' || anim.pose === 'cast')
  const phase = action ? clamp(anim.phase) : 1
  const aim = Math.atan2(Math.sin(hero.aimAngle), Math.cos(hero.aimAngle) * hero.face)
  const pulse = action ? Math.sin(Math.PI * phase) : 0
  const shoulder: Point = { x: 10 + (job === 'knight' ? 0 : pulse * 4), y: -81 - pulse * 2 }
  const upperLength = 25
  const foreLength = 26
  let hand: Point = getFiringOrigin(job, 1)
  let bladeAngle = aim

  if (job === 'knight' && action) {
    // Raise the arm for anticipation, strike through the aim direction, then recover.
    const turn = -1.18 + 2.13 * ease((phase - 0.08) / 0.68) + aim * 0.32
    hand = { x: shoulder.x + Math.cos(turn) * 35, y: shoulder.y + Math.sin(turn) * 35 }
    bladeAngle = turn - 0.67
  } else if (job === 'wizard' && action) {
    // Staff hand stays at the spell emission point; the elbow and shoulder drive the thrust.
    shoulder.x += Math.sin(phase * Math.PI * 1.5) * 3
    bladeAngle = aim + (1 - ease(phase)) * -0.55
  } else if (job === 'ranger' && action) {
    // Release and follow-through, keeping the drawn bow grip and arrow exit coincident.
    shoulder.y -= Math.sin(phase * Math.PI * 1.5) * 3
  }

  const supportShoulder: Point = { x: -13, y: -82 }
  const supportHand: Point = job === 'ranger'
    ? { x: 22 - pulse * 17, y: -60 + pulse * 4 }
    : job === 'wizard'
      ? { x: -32 + pulse * 7, y: -60 - pulse * 10 }
      : { x: -28 + pulse * 5, y: -63 - pulse * 8 }
  return {
    shoulder, elbow: elbowFor(shoulder, hand, upperLength, foreLength, -1), hand,
    supportShoulder, supportElbow: elbowFor(supportShoulder, supportHand, 24, 27, 1), supportHand,
    upperLength, foreLength, aim, bladeAngle,
  }
}
