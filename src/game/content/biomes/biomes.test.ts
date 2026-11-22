import { describe, expect, it } from 'vitest'
import { BIOMES, BIOME_IDS, CELL_SIZE, createBiomeEnvironment, createBiomeSession } from './index'
import { BIOMES_PACK } from '../packs/biomes'
import { createContentRegistry } from '../registry'

const snapshot = (id: typeof BIOME_IDS[number], seed = 123) => {
  const env = createBiomeEnvironment(id, { seed, maxCells: 16 })
  return Array.from({ length: 9 }, (_, index) => env.cell((index % 3) - 1, Math.floor(index / 3) - 1))
}

describe('biome content registration', () => {
  it('registers exactly four stages and distinct mechanics without touching the integration manifest', () => {
    const registry = createContentRegistry([BIOMES_PACK])
    expect(registry.packs[0]?.stages?.map(stage => stage.id)).toEqual(BIOME_IDS.map(id => `biomes:${id}`))
    expect(new Set(BIOMES.map(b => b.atmosphere.ground)).size).toBe(4)
    expect(new Set(BIOMES.flatMap(b => [...b.hazards])).size).toBe(8)
    expect(new Set(BIOMES.map(b => b.interaction)).size).toBe(4)
  })
})

describe.each(BIOME_IDS)('%s environment', id => {
  it('generates repeatable static geometry and unique scene art requirements', () => {
    const cells = snapshot(id)
    expect(cells).toEqual(snapshot(id))
    expect(cells.some(c => c.terrain.length)).toBe(true)
    expect(cells.some(c => c.hazards.length)).toBe(true)
    expect(cells.some(c => c.decorations.length)).toBe(true)
    const env = createBiomeEnvironment(id, { seed: 123 })
    expect(env.cell(2, 3)).toBe(env.cell(2, 3))
    expect(Object.isFrozen(env.cell(2, 3).terrain)).toBe(true)
  })

  it('keeps spawn safe and continuous navigable corridors open', () => {
    const env = createBiomeEnvironment(id)
    expect(env.obstacles(0, 0, 17)).toEqual([])
    expect(env.hazards(0, 0, 17)).toEqual([])
    for (let i = -5; i <= 5; i++) {
      const border = i * CELL_SIZE
      for (let j = -5; j <= 5; j++) {
        const center = (j + 0.5) * CELL_SIZE
        expect(env.obstacles(border, center, 55)).toEqual([])
        expect(env.obstacles(center, border, 55)).toEqual([])
      }
    }
  })

  it('resolves center, exact contact boundary and negative world-coordinate collisions', () => {
    const env = createBiomeEnvironment(id, { seed: 123 })
    const block = env.obstacles(-1000, -1000, 1200)[0]!
    expect(block).toBeDefined()
    const center = env.collide(block, 17)
    expect(Math.hypot(center.x - block.x, center.y - block.y)).toBeGreaterThanOrEqual(block.r + 17 - 1e-6)
    expect(env.collide({ x: block.x + block.r + 17, y: block.y }, 17))
      .toEqual({ x: block.x + block.r + 17, y: block.y })
    const free = env.collide({ x: -3000, y: -3000 }, 17)
    expect(Number.isFinite(free.x) && Number.isFinite(free.y)).toBe(true)
  })

  it('warns before damage, keeps idle contact harmless and cycles deterministically', () => {
    const env = createBiomeEnvironment(id, { seed: 42 })
    const h = env.hazards(1000, 800, 1600)[0]!
    expect(h).toBeDefined()
    const warning = h.period * ((h.quiet + h.warn) / 2) - h.offset
    const active = h.period * ((h.warn + 1) / 2) - h.offset
    const idle = h.period * h.quiet / 2 - h.offset
    expect(env.phase(h, warning)).toBe('warning')
    expect(env.phase(h, active)).toBe('active')
    expect(env.phase(h, idle)).toBe('idle')
    expect(env.contact(h, 0, warning).damagePerSecond).toBe(0)
    expect(env.contact(h, 0, active).damagePerSecond).toBeGreaterThan(0)
    expect(env.contact(h, 0, idle).damagePerSecond).toBe(0)
    expect(env.contact(h, 0, active + h.period)).toEqual(env.contact(h, 0, active))
  })

  it('culls decorations and exports identical collision and minimap geometry', () => {
    const env = createBiomeEnvironment(id, { seed: 123 })
    const view = { left: 0, top: 0, right: 1000, bottom: 700 }
    expect(env.visibleDecorations(view).every(d => d.x + d.r >= view.left && d.x - d.r <= view.right &&
      d.y + d.r >= view.top && d.y - d.r <= view.bottom)).toBe(true)
    expect(env.minimap(0, 0, 1050)).toEqual({
      obstacles: env.obstacles(0, 0, 1050),
      hazards: env.hazards(0, 0, 1050),
    })
  })

  it('evicts cached procedural cells and regenerates exact content during long runs', () => {
    const env = createBiomeEnvironment(id, { seed: 99, maxCells: 12 })
    const first = env.cell(-3, 4)
    for (let index = 0; index < 3000; index++) {
      env.cell(index - 1500, index % 9)
      expect(env.cacheSize()).toBeLessThanOrEqual(12)
    }
    expect(env.cell(-3, 4)).toEqual(first)
  })

  it('rejects invalid or unbounded generation and screen inputs', () => {
    expect(() => createBiomeEnvironment(id, { maxCells: 0 })).toThrow(RangeError)
    expect(() => createBiomeEnvironment(id, { seed: Number.NaN })).toThrow(RangeError)
    const env = createBiomeEnvironment(id)
    expect(() => env.cell(1.5, 0)).toThrow(RangeError)
    expect(() => env.hazards(0, 0, Infinity)).toThrow(RangeError)
    expect(() => env.obstacles(Number.MAX_VALUE, 0, 10)).toThrow(RangeError)
    expect(() => env.visibleDecorations({ left: 12, top: 0, right: 3, bottom: 5 })).toThrow(RangeError)
  })
})

describe('terrain interaction and scene transitions', () => {
  it('supports bounded, temporary environmental interactions', () => {
    const env = createBiomeEnvironment('cursed-forest', { seed: 77 })
    const nodes = Array.from({ length: 500 }, (_, i) => env.cell(i, 0).interactions).flat()
    expect(nodes.length).toBeGreaterThan(48)
    for (const node of nodes) env.interact(node, 0)
    expect(env.activeInteractions()).toBeLessThanOrEqual(48)
    const node = nodes[nodes.length - 1]!
    expect(env.interact(node, 0)).toBeNull()
    expect(env.interact(node, 11)).toMatchObject({ kind: 'ward-tree' })
  })

  it('clears prior geometry and interactions when switching environments', () => {
    const session = createBiomeSession('blood-moon-cathedral', { seed: 12, maxCells: 8 })
    const previous = session.current
    previous.cell(10, 10)
    expect(previous.cacheSize()).toBe(1)
    const current = session.enter('celestial-rift')
    expect(previous.cacheSize()).toBe(0)
    expect(current.definition.id).toBe('celestial-rift')
    expect(current.cacheSize()).toBe(0)
    session.reset()
    expect(current.cacheSize()).toBe(0)
  })
})
