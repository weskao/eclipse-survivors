import { describe, expect, it } from 'vitest'
import { biomePalette, nearbyHazards, nearbyObstacles, resolveObstacleCollision, hazardPhase } from './world'

describe('biome geometry', () => {
  it('gives all four biomes distinct palettes, obstacles, and hazards', () => {
    expect(new Set(biomePalette.map(p => p.ground)).size).toBe(4)
    const obstacles = [0, 1, 2, 3].map(scene => nearbyObstacles(scene, 0, 0, 900))
    expect(obstacles.every(o => o.length > 0)).toBe(true)
    expect(new Set(obstacles.map(o => JSON.stringify(o.slice(0, 4)))).size).toBe(4)
    expect([0, 1, 2, 3].every(scene => nearbyHazards(scene, 0, 0, 900).length > 0)).toBe(true)
  })

  it('keeps the origin clear and pushes a player outside collidable scenery', () => {
    for (let scene = 0; scene < 4; scene++) {
      const items = nearbyObstacles(scene, 0, 0, 1000)
      expect(items.every(o => Math.hypot(o.x, o.y) > o.r + 70)).toBe(true)
      for (const o of items.slice(0, 6)) {
        const result = resolveObstacleCollision(scene, o.x, o.y, 17)
        expect(Math.hypot(result.x - o.x, result.y - o.y)).toBeGreaterThanOrEqual(o.r + 16.9)
      }
    }
  })

  it('telegraphs hazards before their active damage phase', () => {
    const storm = nearbyHazards(1, 0, 0, 1000)[0]!
    const states = Array.from({ length: 45 }, (_, i) => hazardPhase(1, storm, i / 10))
    expect(states).toContain('warning')
    expect(states).toContain('active')
    expect(states).toContain('idle')
    expect(hazardPhase(3, nearbyHazards(3, 0, 0, 1000)[0]!, 5)).toBe('active')
  })
})
