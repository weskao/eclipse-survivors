import { describe, expect, it } from 'vitest'
import { joystickVector } from './joystick'

describe('scaled virtual joystick math', () => {
  it('normalizes finger movement for different pad sizes and keeps a dead zone', () => {
    expect(joystickVector(1, 1, 122)).toEqual({ x: 0, y: 0, knobX: 0, knobY: 0 })
    expect(joystickVector(43, 0, 122).x).toBeCloseTo(1)
    expect(joystickVector(64.5, 0, 183).x).toBeCloseTo(1)
    expect(joystickVector(500, 0, 122).knobX).toBeCloseTo(43)
    expect(joystickVector(0, 0, 0)).toEqual({ x: 0, y: 0, knobX: 0, knobY: 0 })
  })
})
