import { describe, expect, it } from 'vitest'
import { createState, createHero } from '../state'
import { emitHitImpact } from '../fx'
import { createFakeCtx } from './fakes'
import { drawHitImpact } from './hit-impact'
import { drawImpactWaves } from './effects'
import { createContentRegistry } from '../content/registry'
import { COMBAT_VFX_PACK } from '../content/packs/combat-vfx'
import { hit, damageHero } from '../combat'
import { healthCriticalVersion } from '../health-impact'
import type { GameHooks, Mob } from '../types'

describe('directional combat contact', () => {
  it('emits a single short critical impact in the true force direction, not a radial overlay', () => {
    const s = createState(); s.hero = createHero('knight')
    s.hero.x = 0; s.hero.y = 0
    const mob: Mob = { x: 30, y: 40, type: 'goblin', hp: 100, max: 100, r: 20, speed: 20, dmg: 5, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    const hooks: GameHooks = { end() {}, message() {}, offerUpgrades() {}, sfx() {}, consumeCriticalHit: () => true, content: (state, event) => registry.emit(state, event, hooks) }
    hit(s, mob, 20, hooks)
    expect(s.impactWaves).toHaveLength(1)
    expect(s.impactWaves[0]).toMatchObject({ contact: 'critical', angle: Math.atan2(40, 30) })
    expect(s.content.effects).toHaveLength(0)
    expect(s.numberFx[0]?.critical).toBe(true)
    expect(s.fx).toHaveLength(0)
    expect(mob.hp).toBe(80)
  })
  it('uses one cached image and no circular outline or radial strokes', () => {
    const {ctx, calls, drawn} = createFakeCtx()
    const image = { complete: true, naturalWidth: 384 } as HTMLImageElement
    drawHitImpact(ctx, 'critical', 80, 0.2, false, false, image)
    expect(drawn).toEqual([image])
    expect(calls).not.toContain('arc')
    expect(calls).not.toContain('ellipse')
    expect(calls).not.toContain('stroke')
  })
  it('fallback is a single filled directional shape, not a ring', () => {
    const {ctx,calls} = createFakeCtx()
    drawHitImpact(ctx, 'normal', 50, 0.3, true, true, undefined)
    expect(calls).not.toContain('ellipse')
    expect(calls).not.toContain('stroke')
    expect(calls.filter(c => c === 'fill')).toHaveLength(1)
    expect(ctx.globalAlpha).toBeLessThanOrEqual(0.48)
  })
  it('culls offscreen contact and respects disabled VFX', () => {
    const s = createState(); s.W = 800; s.H = 600
    emitHitImpact(s, -2000, -2000, 30, 0, false)
    const f = createFakeCtx(); drawImpactWaves(f.ctx, s, 0, 0)
    expect(f.calls).toHaveLength(0)
    emitHitImpact(s, 200, 200, 30, 0, true)
    drawImpactWaves(f.ctx, s, 0, 0, false, false, 0)
    expect(f.calls).toHaveLength(0)
  })
})

it('makes heavy contact larger without fabricating a critical hit, and preserves real crit identity', () => {
  const s = createState(); s.hero = createHero('knight'); s.mode = 'play'
  const make = (): Mob => ({ x: 40, y: 0, type: 'goblin', hp: 100, max: 100, r: 20, speed: 20, dmg: 5, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 })
  const hooks: GameHooks = { end() {}, message() {}, offerUpgrades() {}, sfx() {} }
  const normal = make(), heavy = make(), critical = make()
  hit(s, normal, 5, hooks)
  hit(s, heavy, 30, hooks)
  hit(s, critical, 5, { ...hooks, consumeCriticalHit: () => true })
  expect(s.impactWaves[1]!.size).toBeGreaterThan(s.impactWaves[0]!.size)
  expect(s.impactWaves[1]!.life).toBeGreaterThan(s.impactWaves[0]!.life)
  expect(s.numberFx[1]!.critical).toBe(false)
  expect(healthCriticalVersion(critical)).toBeGreaterThan(0)
  expect(healthCriticalVersion(heavy)).toBe(0)
  expect([normal.hp, heavy.hp, critical.hp]).toEqual([95, 70, 95])
  const hp = s.hero.hp
  damageHero(s, hp * .3, hooks)
  expect(s.hero.hp).toBeCloseTo(hp * .7)
  expect(s.impactWaves.at(-1)?.contact).toBe('normal')
})
