import { describe, expect, it } from 'vitest'
import { BIOME_IDS, createBiomeEnvironment } from './index'
import { createBiomeRuntime } from './runtime'

describe.each(BIOME_IDS)('%s playable runtime', id => {
  it('uses physical circular obstacles for swept player movement and line of sight', () => {
    const game = createBiomeRuntime(id, { seed: 42 })
    const obstacle = game.environment.obstacles(-1000, -1000, 1200)[0]!
    expect(obstacle).toBeDefined()
    const from = { x: obstacle.x - obstacle.r - 65, y: obstacle.y }
    const to = { x: obstacle.x + obstacle.r + 65, y: obstacle.y }
    expect(game.lineOfSight(from, to, 8)).toBe(false)
    const moved = game.move(from, { x: 3000, y: 0 }, .1, 17)
    expect(moved.x).toBeLessThanOrEqual(obstacle.x - obstacle.r - 17 + 1e-6)
    expect(game.lineOfSight({ x: 0, y: 0 }, { x: 0, y: 0 }, 17)).toBe(true)
  })

  it('shares damage geometry with minimap and advances hazard time only while playing', () => {
    const game = createBiomeRuntime(id, { seed: 99 })
    const hazard = game.environment.hazards(900, 900, 1500)[0]!
    expect(hazard).toBeDefined()
    const active = hazard.period * ((hazard.warn + 1) / 2) - hazard.offset
    game.advance(active)
    expect(game.contact(hazard, 0).phase).toBe('active')
    expect(game.contact(hazard, 0).damagePerSecond).toBeGreaterThan(0)
    expect(game.minimap(hazard.x, hazard.y, 100)).toEqual(game.environment.minimap(hazard.x, hazard.y, 100))
    game.advance(5, true)
    expect(game.time).toBe(active)
    expect(game.contact(hazard, 0).phase).toBe('active')
  })

  it('replays geometry after 3000-cell traversal and retains a bounded cache', () => {
    const game = createBiomeRuntime(id, { seed: 5, maxCells: 6 })
    const first = game.environment.cell(7, -8)
    for (let i = 0; i < 3000; i++) game.environment.cell(i, -12)
    expect(game.environment.cacheSize()).toBeLessThanOrEqual(6)
    expect(game.environment.cell(7, -8)).toEqual(first)
  })

  it('rejects non-finite movement, invalid radius and unbounded visibility rays', () => {
    const game = createBiomeRuntime(id)
    expect(() => game.move({ x: 0, y: 0 }, { x: Infinity, y: 0 }, .1, 17)).toThrow(RangeError)
    expect(() => game.move({ x: 0, y: 0 }, { x: 10, y: 0 }, .1, -1)).toThrow(RangeError)
    expect(() => game.lineOfSight({ x: 0, y: 0 }, { x: 5000, y: 0 })).toThrow(RangeError)
    expect(() => game.advance(-1)).toThrow(RangeError)
  })
})

it('repeated biome transitions reset temporal state without changing seeded generation', () => {
  const game = createBiomeRuntime('cursed-forest', { seed: 42, maxCells: 8 })
  const origin = game.environment.cell(4, 7)
  const node = game.environment.interactions(4 * 420 + 210, 7 * 420 + 210, 400)[0]!
  if (node) game.interact(node)
  game.advance(10)
  for (let i = 0; i < 40; i++) {
    const target = BIOME_IDS[i % BIOME_IDS.length]!
    const old = game.environment
    game.enter(target)
    expect(old.cacheSize()).toBe(0)
    expect(game.time).toBe(0)
    expect(game.environment.cacheSize()).toBe(0)
  }
  game.enter('cursed-forest')
  expect(game.environment.cell(4, 7)).toEqual(origin)
  expect(game.environment.activeInteractions()).toBe(0)
  expect(createBiomeEnvironment('cursed-forest', { seed: 42 }).cell(4, 7)).toEqual(origin)
})
