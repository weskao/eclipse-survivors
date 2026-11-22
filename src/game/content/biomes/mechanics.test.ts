import { describe, expect, it } from 'vitest'
import { BIOME_IDS, createBiomeEnvironment, type Hazard } from './index'

const activeAt = (hazard: Hazard) => hazard.period * ((hazard.warn + 1) / 2) - hazard.offset

describe.each(BIOME_IDS)('%s distinctive hazards', id => {
  it('generates both biome-specific types and preserves their readable warning phases', () => {
    const env = createBiomeEnvironment(id, { seed: 42 })
    const hazards = []
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) {
      hazards.push(...env.cell(i, j).hazards)
    }
    expect(new Set(hazards.map(h => h.kind)).size).toBe(2)
    for (const h of hazards.slice(0, 12)) {
      expect(env.phase(h, h.period * ((h.quiet + h.warn) / 2) - h.offset)).toBe('warning')
      expect(env.phase(h, activeAt(h))).toBe('active')
    }
  })
})

it('Cursed Forest ward-tree interaction temporarily suppresses active poison or roots', () => {
  const env = createBiomeEnvironment('cursed-forest', { seed: 42 })
  let pair: { node: { x: number; y: number }; hazard: Hazard } | undefined
  for (let i = -20; i < 20 && !pair; i++) for (let j = -20; j < 20 && !pair; j++) {
    const cell = env.cell(i, j)
    const node = cell.interactions[0]
    const hazard = cell.hazards[0]
    if (node && hazard && Math.hypot(node.x - hazard.x, node.y - hazard.y) < 172) {
      pair = { node, hazard }
    }
  }
  expect(pair).toBeDefined()
  const { node, hazard } = pair!
  const t = activeAt(hazard)
  expect(env.contact(hazard, 0, t).damagePerSecond).toBeGreaterThan(0)
  expect(env.interact(node, t)?.kind).toBe('ward-tree')
  expect(env.contact(hazard, 0, t).damagePerSecond).toBe(0)
  const afterExpiry = t + hazard.period * Math.ceil(10 / hazard.period)
  expect(env.contact(hazard, 0, afterExpiry).damagePerSecond).toBeGreaterThan(0)
})

it('Celestial Rift applies outward force without recomputing static hazard geometry', () => {
  const env = createBiomeEnvironment('celestial-rift', { seed: 42 })
  let rift: Hazard | undefined
  for (let i = -10; i < 10 && !rift; i++) for (let j = -10; j < 10 && !rift; j++) {
    rift = env.cell(i, j).hazards.find(h => h.kind === 'rift')
  }
  expect(rift).toBeDefined()
  const at = { x: rift!.x + 5, y: rift!.y }
  const contact = env.contact(at, 0, activeAt(rift!))
  expect(contact.phase).toBe('active')
  expect(contact.push.x).toBeGreaterThan(0)
  expect(contact.speedMultiplier).toBe(1)
})
