import { STICK_RADIUS, stickVector } from '../../input'
import type { MoveInput } from '../../types'

export type JoystickVector = MoveInput & { knobX: number; knobY: number }

/** Share the existing game deadzone/input normalization, scaled to the physical pad size. */
export function joystickVector(dx: number, dy: number, padSize: number): JoystickVector {
  if (!Number.isFinite(padSize) || padSize <= 0) return { x: 0, y: 0, knobX: 0, knobY: 0 }
  const scale = 122 / padSize
  const vector = stickVector(dx * scale, dy * scale)
  return {
    x: vector.x, y: vector.y,
    knobX: vector.knobX * STICK_RADIUS / STICK_RADIUS / scale,
    knobY: vector.knobY / scale,
  }
}
