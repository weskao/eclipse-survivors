import { dist } from './math'
import type { MoveInput } from './types'

export const STICK_RADIUS = 43
/** Keys whose default browser action (scroll) the game suppresses. */
export const PREVENT_DEFAULT_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export type KeyState = Partial<Record<string, boolean>>

export function moveVector(keys: KeyState, stick: MoveInput): MoveInput {
  return {
    x: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x,
    y: (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + stick.y,
  }
}

/** Joystick offset from the pad centre → normalised input and the clamped knob offset. */
export function stickVector(dx: number, dy: number): MoveInput & { knobX: number; knobY: number } {
  // A small dead zone prevents accidental drift from the center of a touch pad.
  const d = dist(dx, dy)
  if (d < 4) return { x: 0, y: 0, knobX: 0, knobY: 0 }
  const factor = Math.min(d, STICK_RADIUS) / Math.max(1, d)
  return { x: dx / Math.max(STICK_RADIUS, d), y: dy / Math.max(STICK_RADIUS, d), knobX: dx * factor, knobY: dy * factor }
}

/** `Digit1..3` → upgrade choice index, otherwise -1. */
export const upgradeKeyIndex = (code: string): number => ['Digit1', 'Digit2', 'Digit3'].indexOf(code)
