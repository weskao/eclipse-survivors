import { describe, expect, it } from 'vitest'
import { isInDrawRange } from '../../../src/game/performance/es2/visibility'

const viewport = { width: 390, height: 844, offsetX: 0, offsetY: 0 }

describe('conservative render-only culling', () => {
  it('retains circles that touch any viewport edge and rejects fully hidden ones', () => {
    expect(isInDrawRange(-10, 100, 10, viewport)).toBe(true)
    expect(isInDrawRange(400, 100, 10, viewport)).toBe(true)
    expect(isInDrawRange(200, 854, 10, viewport)).toBe(true)
    expect(isInDrawRange(200, -10, 10, viewport)).toBe(true)
    expect(isInDrawRange(-10.01, 100, 10, viewport)).toBe(false)
    expect(isInDrawRange(401, 100, 10, viewport)).toBe(false)
    expect(isInDrawRange(-100, 100, 10, viewport, 100)).toBe(true)
  })
  it('accounts for world-to-screen offsets without mutating simulation actors', () => {
    const actors = [{ x: -2000, y: 0 }, { x: 100, y: 100 }]
    const visible = actors.filter(a => isInDrawRange(a.x, a.y, 20, { ...viewport, offsetX: 0 }))
    expect(visible).toHaveLength(1)
    expect(actors).toHaveLength(2)
    expect(isInDrawRange(-2000, 0, 20, { ...viewport, offsetX: 2100 })).toBe(true)
  })
})
