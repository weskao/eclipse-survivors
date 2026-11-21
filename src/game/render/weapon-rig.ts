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

/** Solve the elbow geometrically, retaining both rigid bone lengths. */
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

/**
 * Reference artwork: knight sword LEFT; ranger bow RIGHT; wizard staff LEFT,
 * spell-emitting hand RIGHT. Coordinates are right-facing and relative to feet.
 * A negative world-facing direction is mirrored once by drawCharacter.
 */
export function sampleWeaponRig(job: JobId, hero: Hero, anim: HeroAnimation): WeaponRig {
  const action = !anim.reducedMotion && (anim.pose === 'attack' || anim.pose === 'cast')
  const phase = action ? clamp(anim.phase) : 1
  const aim = Math.atan2(Math.sin(hero.aimAngle), Math.cos(hero.aimAngle) * hero.face)
  const pulse = action ? Math.sin(Math.PI * phase) : 0
  const rightHandWeapon = job === 'ranger'
  const shoulder: Point = rightHandWeapon
    ? { x: 10 + pulse * 3, y: -81 - pulse * 2 }
    : { x: -15, y: -80 - pulse * 2 }
  const upperLength = 25
  const foreLength = 26
  const restHand: Point = job === 'ranger' ? getFiringOrigin('ranger', 1)
    : job === 'wizard' ? { x: -29, y: -56 } : { x: -29, y: -54 }
  let hand: Point = restHand
  let bladeAngle = aim

  if (job === 'knight' && action) {
    // A cross-body cut around the LEFT shoulder; continuity at start and end
    // avoids teleporting the sword between consecutive combat cycles.
    const restAngle = Math.atan2(restHand.y + 80, restHand.x + 15)
    const stroke = phase < 0.6 ? ease(phase / 0.6) : 1 - ease((phase - 0.6) / 0.4)
    const turn = restAngle - stroke * (1.8 - aim * 0.20)
    const reach = Math.hypot(restHand.x + 15, restHand.y + 80)
    hand = { x: shoulder.x + Math.cos(turn) * reach, y: shoulder.y + Math.sin(turn) * reach }
    bladeAngle += turn - restAngle
  } else if (job === 'wizard' && action) {
    // The staff rises and thrusts; the OTHER hand keeps the spell origin fixed.
    hand = { x: restHand.x + pulse * 13, y: restHand.y - pulse * 15 }
    bladeAngle -= (1 - ease(phase)) * 0.35
  } else if (job === 'ranger' && action) {
    // The bow hand is fixed; recoil and string tension change the arm joints.
    shoulder.y -= Math.sin(phase * Math.PI * 1.5) * 3
  }

  const supportShoulder: Point = { x: rightHandWeapon ? -13 : 12, y: -82 + pulse * 2 }
  const supportHand: Point = job === 'ranger'
    ? { x: -18 + pulse * 13, y: -60 - pulse * 4 }
    : job === 'wizard'
      ? getFiringOrigin('wizard', 1)
      : { x: 29 - pulse * 5, y: -63 - pulse * 7 }
  return {
    shoulder, elbow: elbowFor(shoulder, hand, upperLength, foreLength, rightHandWeapon ? -1 : 1), hand,
    supportShoulder, supportElbow: elbowFor(supportShoulder, supportHand, 24, 27, rightHandWeapon ? 1 : -1), supportHand,
    upperLength, foreLength, aim, bladeAngle,
  }
}
