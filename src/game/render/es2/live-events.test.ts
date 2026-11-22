import { describe, expect, it } from 'vitest'
import { createContentRegistry, MAX_CONTENT_EFFECTS } from '../../content/registry'
import { COMBAT_VFX_PACK, createCombatVfxPack } from '../../content/packs/combat-vfx'
import { createHero, createState, resetRun } from '../../state'
import type { GameHooks, Mob } from '../../types'
import { COMBAT_FX_SPECS } from './combat-vfx'
import { createLiveCombatVfxAdapter, type ConfirmedCombatVfxEvent } from './live-events'

const hooks: GameHooks = { end() {}, sfx() {}, message() {}, offerUpgrades() {} }
function setup() {
  const state = createState()
  state.hero = createHero('knight')
  state.W = 800
  state.H = 600
  const registry = createContentRegistry([COMBAT_VFX_PACK])
  const adapter = createLiveCombatVfxAdapter(effect => registry.addEffect(state, effect))
  return { state, registry, adapter }
}

describe('ES2 authoritative live VFX bridge', () => {
  it('maps every one of the 18 confirmed gameplay cues to its authored effect', () => {
    const { state, adapter } = setup()
    COMBAT_FX_SPECS.forEach((spec, index) => {
      const event = {
        sequence: index + 1, kind: spec.kind, x: 120 + index, y: 210 + index, angle: Math.PI / 3,
      } as ConfirmedCombatVfxEvent
      expect(adapter.emit(event)).toBe(true)
      expect(state.content.effects[index]).toMatchObject({
        id: spec.id, x: event.x, y: event.y, angle: event.angle,
        max: spec.duration, life: spec.duration,
      })
    })
    expect(state.content.effects).toHaveLength(18)
  })

  it('emits once per ordered authoritative sequence without retaining an event history', () => {
    const { state, adapter } = setup()
    const event: ConfirmedCombatVfxEvent = { sequence: 1, kind: 'critical-hit', x: 10, y: 20 }
    expect(adapter.emit(event)).toBe(true)
    expect(adapter.emit(event)).toBe(false)
    expect(adapter.emit({ ...event, sequence: 0 })).toBe(false)
    expect(adapter.emit({ ...event, sequence: 2 })).toBe(true)
    expect(state.content.effects).toHaveLength(2)
    expect(adapter.lastSequence).toBe(2)
  })

  it('rejects invented, malformed, and directionless release events before consuming their IDs', () => {
    const { state, adapter } = setup()
    expect(adapter.emit({ sequence: 1, kind: 'sword-slash', x: 1, y: 2 } as ConfirmedCombatVfxEvent)).toBe(false)
    expect(adapter.emit({ sequence: 1, kind: 'critical-hit', x: Infinity, y: 2 })).toBe(false)
    expect(adapter.emit({ sequence: 1, kind: 'invented', x: 1, y: 2 } as unknown as ConfirmedCombatVfxEvent)).toBe(false)
    expect(adapter.emit({ sequence: 1.5, kind: 'critical-hit', x: 1, y: 2 })).toBe(false)
    expect(adapter.emit({ sequence: 1, kind: 'sword-slash', x: 1, y: 2, angle: Math.PI / 2 })).toBe(true)
    expect(state.content.effects).toHaveLength(1)
    expect(adapter.lastSequence).toBe(1)
  })

  it('keeps the 96 effect budget and resets without stale event keys or retained effects', () => {
    const { state, registry, adapter } = setup()
    for (let i = 1; i <= MAX_CONTENT_EFFECTS; i++) {
      expect(adapter.emit({ sequence: i, kind: 'enemy-death', x: i, y: 50 })).toBe(true)
    }
    expect(adapter.emit({ sequence: 97, kind: 'enemy-death', x: 0, y: 50 })).toBe(false)
    expect(state.content.effects).toHaveLength(96)
    registry.tick(state, 4, hooks)
    expect(state.content.effects).toHaveLength(0)
    expect(adapter.emit({ sequence: 97, kind: 'enemy-death', x: 0, y: 50 })).toBe(false)
    expect(adapter.emit({ sequence: 98, kind: 'enemy-death', x: 0, y: 50 })).toBe(true)
    resetRun(state)
    adapter.reset()
    expect(state.content.effects).toHaveLength(0)
    expect(adapter.lastSequence).toBe(-1)
    expect(adapter.emit({ sequence: 1, kind: 'critical-hit', x: 1, y: 2 })).toBe(true)
    adapter.dispose()
    expect(adapter.emit({ sequence: 2, kind: 'critical-hit', x: 1, y: 2 })).toBe(false)
  })

  it('keeps world-space effect positions and immutable direction snapshots', () => {
    const { state, adapter } = setup()
    expect(adapter.emit({ sequence: 1, kind: 'projectile-trail', x: 510, y: 420, angle: -0.75 })).toBe(true)
    state.hero!.aimAngle = 0.8
    expect(state.content.effects[0]).toMatchObject({ x: 510, y: 420, angle: -0.75 })
  })

  it('deduplicates legacy kill and victory callbacks, but permits new runs and states', () => {
    const pack = createCombatVfxPack()
    const registry = createContentRegistry([pack])
    const first = createState()
    first.hero = createHero('knight')
    const mob = { x: 130, y: 150 } as Mob
    registry.emit(first, { type: 'kill', mob, damage: 40 }, hooks)
    registry.emit(first, { type: 'kill', mob, damage: 40 }, hooks)
    registry.emit(first, { type: 'run-complete', win: true }, hooks)
    registry.emit(first, { type: 'run-complete', win: true }, hooks)
    expect(first.content.effects.map(f => f.id)).toEqual(['combat-vfx:enemy-death', 'combat-vfx:victory-finish'])
    registry.emit(first, { type: 'reset' }, hooks)
    first.content.effects = []
    registry.emit(first, { type: 'kill', mob, damage: 40 }, hooks)
    expect(first.content.effects.map(f => f.id)).toEqual(['combat-vfx:enemy-death'])
    const second = createState()
    second.hero = createHero('knight')
    registry.emit(second, { type: 'kill', mob, damage: 40 }, hooks)
    expect(second.content.effects).toHaveLength(1)
  })
})
