import { describe, expect, it } from 'vitest'
import { createContentRegistry, MAX_CONTENT_EFFECTS } from '../../content/registry'
import { createHero, createState, resetRun } from '../../state'
import type { Ctx2D } from '../ctx'
import type { GameHooks } from '../../types'
import { COMBAT_VFX_PACK, createCombatVfxPack, emitCombatVfx } from '../../content/packs/combat-vfx'
import { COMBAT_FX_SPECS } from './combat-vfx'

const hooks: GameHooks = { end() {}, sfx() {}, message() {}, offerUpgrades() {} }
const state = () => {
  const s = createState()
  s.W = 800; s.H = 600; s.hero = createHero('knight')
  return s
}
function fakeCanvas() {
  const calls: string[] = []
  const values: Record<string, unknown> = { strokeStyle: '', fillStyle: '', globalAlpha: 1 }
  const ctx = new Proxy(values, {
    get(target, key) {
      if (key in target) return target[String(key)]
      return (...args: unknown[]) => {
        if (key === 'stroke' || key === 'fill') calls.push(String(key) + ':' + String(target[key === 'stroke' ? 'strokeStyle' : 'fillStyle']))
        else calls.push(String(key) + ':' + args.join(','))
      }
    },
    set(target, key, value) {
      target[String(key)] = value
      if (key === 'globalAlpha') calls.push('alpha:' + value)
      return true
    },
  }) as unknown as Ctx2D
  return { ctx, calls }
}
const queue = (kind: Parameters<typeof emitCombatVfx>[1], angle = 0) => {
  const registry = createContentRegistry([COMBAT_VFX_PACK])
  const s = state()
  expect(emitCombatVfx(fx => registry.addEffect(s, fx), kind, 80, 90, { angle })).toBe(true)
  return { registry, s }
}

describe('ES2 combat VFX contract', () => {
  it('registers 21 distinct namespaced effects with bounded durations', () => {
    expect(COMBAT_FX_SPECS).toHaveLength(21)
    const ids = COMBAT_FX_SPECS.map(fx => fx.id)
    expect(new Set(ids).size).toBe(COMBAT_FX_SPECS.length)
    expect(ids.every(id => id.startsWith('combat-vfx:'))).toBe(true)
    expect(COMBAT_FX_SPECS.every(fx => fx.duration > 0 && fx.duration <= 4)).toBe(true)
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    expect(registry.packs?.[0]?.effects?.map(fx => fx.id)).toEqual(ids)
  })

  it('keeps directional metadata and animation lifecycle without leaking objects', () => {
    const { registry, s } = queue('sword-slash', Math.PI / 2)
    expect(s.content.effects[0]).toMatchObject({ angle: Math.PI / 2, max: s.content.effects[0]?.life })
    const { ctx, calls } = fakeCanvas()
    registry.render(ctx, s, 0, 0)
    expect(calls).toContain('rotate:' + Math.PI / 2)
    registry.tick(s, 0.08, hooks)
    expect(s.content.effects[0]!.life).toBeLessThan(s.content.effects[0]!.max)
    registry.tick(s, 4, hooks)
    expect(s.content.effects).toHaveLength(0)
    resetRun(s)
    expect(s.content.effects).toHaveLength(0)
  })

  it('validates inputs and refuses an unbounded effect queue', () => {
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    const s = state()
    const add = (fx: Parameters<typeof registry.addEffect>[1]) => registry.addEffect(s, fx)
    expect(emitCombatVfx(add, 'fire-eruption', NaN, 0)).toBe(false)
    expect(emitCombatVfx(add, 'fire-eruption', 0, 0, { angle: Infinity })).toBe(false)
    expect(emitCombatVfx(add, 'fire-eruption', 0, 0, { life: 6 })).toBe(false)
    for (let i = 0; i < MAX_CONTENT_EFFECTS; i++)
      expect(emitCombatVfx(add, 'fire-eruption', i, 0)).toBe(true)
    expect(emitCombatVfx(add, 'fire-eruption', 100, 0)).toBe(false)
  })

  it('renders effects in emission order and rejects truly offscreen geometry', () => {
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    const s = state()
    emitCombatVfx(fx => registry.addEffect(s, fx), 'critical-hit', 80, 90)
    emitCombatVfx(fx => registry.addEffect(s, fx), 'frost-impact', 80, 90)
    emitCombatVfx(fx => registry.addEffect(s, fx), 'ultimate-attack', -10000, -10000)
    const { ctx, calls } = fakeCanvas()
    registry.render(ctx, s, 0, 0)
    const first = calls.findIndex(c => c.includes('#ffc577'))
    const second = calls.findIndex(c => c.includes('#94dfff'))
    expect(first).toBeGreaterThan(-1)
    expect(second).toBeGreaterThan(first)
    expect(calls.filter(c => c.startsWith('translate:'))).toHaveLength(2)
  })

  it('offers live reduced-motion, reduced-flashing and quality controls', () => {
    let quality: 'low' | 'high' = 'high'
    let reducedMotion = false
    let reducedFlashing = false
    const pack = createCombatVfxPack({ quality: () => quality, reducedMotion: () => reducedMotion, reducedFlashing: () => reducedFlashing })
    const registry = createContentRegistry([pack])
    const s = state()
    emitCombatVfx(fx => registry.addEffect(s, fx), 'fire-eruption', 80, 90)
    const high = fakeCanvas(); registry.render(high.ctx, s, 0, 0)
    quality = 'low'; reducedMotion = true; reducedFlashing = true
    const low = fakeCanvas(); registry.render(low.ctx, s, 0, 0)
    expect(low.calls.filter(c => c.startsWith('lineTo:')).length).toBeLessThan(high.calls.filter(c => c.startsWith('lineTo:')).length)
    expect(low.calls.filter(c => c.startsWith('alpha:')).every(c => Number(c.slice(6)) <= 0.55)).toBe(true)
  })

  it('restores Canvas state even when a draw operation fails', () => {
    const { registry, s } = queue('critical-hit')
    const { ctx, calls } = fakeCanvas()
    ctx.fill = () => { throw new Error('context unavailable') }
    expect(() => registry.render(ctx, s, 0, 0)).toThrow('context unavailable')
    expect(calls.filter(c => c.startsWith('save:'))).toHaveLength(2)
    expect(calls.filter(c => c.startsWith('restore:'))).toHaveLength(2)
  })

  it('renders every effect at multiple animation phases without losing Canvas balance', () => {
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    for (const spec of COMBAT_FX_SPECS) {
      const s = state()
      expect(emitCombatVfx(fx => registry.addEffect(s, fx), spec.kind, 400, 300, { angle: Math.PI / 3 })).toBe(true)
      const beginning = fakeCanvas()
      expect(() => registry.render(beginning.ctx, s, 0, 0)).not.toThrow()
      registry.tick(s, spec.duration * 0.4, hooks)
      const impact = fakeCanvas()
      expect(() => registry.render(impact.ctx, s, 0, 0)).not.toThrow()
      expect(impact.calls.filter(c => c.startsWith('save:')).length)
        .toBe(impact.calls.filter(c => c.startsWith('restore:')).length)
      expect(impact.calls.some(c => c.startsWith('stroke:') || c.startsWith('fill:'))).toBe(true)
      registry.tick(s, 4, hooks)
      expect(s.content.effects).toHaveLength(0)
    }
  })

  it('keeps the lightning centerline aligned with the confirmed segment heading', () => {
    const { registry, s } = queue('lightning-chain', 0)
    const { ctx, calls } = fakeCanvas()
    registry.render(ctx, s, 0, 0)
    // World-space segment direction is +X at angle=0; offsets are lateral.
    expect(calls).toContain('rotate:0')
    expect(calls).toContain('moveTo:-57,0')
    expect(calls.some(call => call.startsWith('lineTo:63,'))).toBe(true)
  })

  it('supports a new context and preserves direction after the hero turns', () => {
    const { registry, s } = queue('projectile-trail', -Math.PI / 4)
    s.hero!.aimAngle = Math.PI
    const first = fakeCanvas()
    const replacement = fakeCanvas()
    registry.render(first.ctx, s, 0, 0)
    registry.render(replacement.ctx, s, 0, 0)
    expect(first.calls).toContain('rotate:' + -Math.PI / 4)
    expect(replacement.calls).toContain('rotate:' + -Math.PI / 4)
    expect(replacement.calls.filter(c => c.startsWith('stroke:')).length).toBeGreaterThan(0)
  })

  it('only auto-emits effects grounded in events, not inferred critical hits', () => {
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    const s = state()
    registry.emit(s, { type: 'hit', mob: {} as never, damage: 999 }, hooks)
    expect(s.content.effects).toHaveLength(0)
    registry.emit(s, { type: 'run-complete', win: true }, hooks)
    expect(s.content.effects.map(fx => fx.id)).toEqual(['combat-vfx:victory-finish'])
  })
})
