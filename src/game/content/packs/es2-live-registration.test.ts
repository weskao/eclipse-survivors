import { expect, it } from 'vitest'
import { createContentRegistry } from '../registry'
import { CONTENT_PACKS } from './index'

// This is a production integration gate, not a registration-only unit test.
it('registers all ten ES2 content packs including new heroes in the live engine manifest', () => {
  const required = ['weapons', 'bosses', 'evolution2', 'relics', 'factions', 'waves', 'biomes', 'events', 'combat-vfx', 'heroes']
  expect(CONTENT_PACKS.map(pack => pack.id).sort()).toEqual(required.sort())
  const registry = createContentRegistry(CONTENT_PACKS)
  expect(registry.abilities.filter(a => a.kind === 'weapon')).toHaveLength(15)
  expect(registry.packs.find(p => p.id === 'heroes')?.abilities).toHaveLength(6)
  expect(registry.abilities.filter(a => a.kind === 'evolution')).toHaveLength(12)
  expect(registry.packs.find(p => p.id === 'factions')?.enemies).toHaveLength(10)
  expect(registry.packs.find(p => p.id === 'biomes')?.stages).toHaveLength(4)
  expect(registry.packs.find(p => p.id === 'events')?.worldEvents).toHaveLength(12)
  expect(registry.packs.find(p => p.id === 'combat-vfx')?.effects?.length).toBeGreaterThanOrEqual(15)
})
