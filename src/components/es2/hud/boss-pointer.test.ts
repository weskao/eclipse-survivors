import { describe, expect, it } from 'vitest'
import type { GameState, Mob } from '../../../game/types'
import { locateOffscreenBoss } from './boss-pointer'

const boss = (x: number, y: number, hp = 100): Mob => ({
  type: 'boss', x, y, hp, max: 100, r: 48, speed: 1, dmg: 1,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})
const viewport = (width: number, height: number): Pick<GameState, 'W' | 'H' | 'hero' | 'cam'> => ({
  W: width, H: height, hero: { x: 0, y: 0 } as GameState['hero'], cam: { x: 0, y: 0 },
})

describe('offscreen boss tracker geometry', () => {
  it('hides visible and defeated bosses, including when their sprites are partially visible', () => {
    const s = viewport(375, 812)
    expect(locateOffscreenBoss(s, boss(0, 0))).toBeNull()
    expect(locateOffscreenBoss(s, boss(-290, 0))).toBeNull()
    expect(locateOffscreenBoss(s, boss(-800, 0, 0))).toBeNull()
    expect(locateOffscreenBoss({ ...s, hero: null }, boss(500, 0))).toBeNull()
  })
  it('points toward the true boss with world-space distance and stays within compact safe bounds', () => {
    const s = viewport(375, 812)
    const right = locateOffscreenBoss(s, boss(800, 0))!
    expect(right).not.toBeNull()
    expect(right.angle).toBe(0)
    expect(right.distance).toBe(800)
    expect(right.left).toBeLessThanOrEqual(299)
    expect(right.top).toBeGreaterThanOrEqual(300)
    const left = locateOffscreenBoss(s, boss(-900, 0))!
    expect(left.angle).toBe(180)
    expect(left.left).toBeGreaterThanOrEqual(75)
    const above = locateOffscreenBoss(s, boss(0, -1000))!
    expect(above.angle).toBe(-90)
    expect(above.top).toBeGreaterThanOrEqual(300)
  })
  it('keeps the pointer inside short-landscape bounds and rotates diagonally', () => {
    const s = viewport(640, 320)
    const corner = locateOffscreenBoss(s, boss(700, -700))!
    expect(corner.angle).toBe(-45)
    expect(corner.left).toBeGreaterThanOrEqual(110)
    expect(corner.left).toBeLessThanOrEqual(564)
    expect(corner.top).toBeGreaterThanOrEqual(95)
    expect(corner.top).toBeLessThanOrEqual(235)
  })
})
