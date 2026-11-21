import { describe, expect, it } from 'vitest'
import { STICK_RADIUS, moveVector, stickVector, upgradeKeyIndex } from './input'

describe('moveVector', () => {
  it('maps WASD and arrows to an axis vector and adds the joystick', () => {
    expect(moveVector({ KeyD: true, KeyS: true }, { x: 0, y: 0 })).toEqual({ x: 1, y: 1 })
    expect(moveVector({ ArrowLeft: true, ArrowUp: true }, { x: 0, y: 0 })).toEqual({ x: -1, y: -1 })
    expect(moveVector({ KeyA: true, KeyD: true }, { x: 0.5, y: -0.25 })).toEqual({ x: 0.5, y: -0.25 })
    expect(moveVector({}, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('stickVector', () => {
  it('scales inside the 43px radius and clamps the knob outside it', () => {
    expect(STICK_RADIUS).toBe(43)
    const inside = stickVector(21.5, 0)
    expect(inside).toEqual({ x: 0.5, y: 0, knobX: 21.5, knobY: 0 })
    const outside = stickVector(0, 86)
    expect(outside.x).toBeCloseTo(0)
    expect(outside.y).toBeCloseTo(1)
    expect(outside.knobY).toBeCloseTo(43)
  })
  it('handles a centred pointer without NaN', () => {
    expect(stickVector(0, 0)).toEqual({ x: 0, y: 0, knobX: 0, knobY: 0 })
  })
})

describe('upgradeKeyIndex', () => {
  it('maps Digit1..3 to choice indexes', () => {
    expect(upgradeKeyIndex('Digit1')).toBe(0)
    expect(upgradeKeyIndex('Digit3')).toBe(2)
    expect(upgradeKeyIndex('Digit4')).toBe(-1)
    expect(upgradeKeyIndex('KeyP')).toBe(-1)
  })
})

describe('joystick center stability', () => {
  it('ignores sub-4px finger jitter without reducing full-speed movement', () => {
    expect(stickVector(2, 2)).toEqual({ x: 0, y: 0, knobX: 0, knobY: 0 })
    expect(stickVector(STICK_RADIUS, 0).x).toBe(1)
  })
})
