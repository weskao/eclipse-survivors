import { describe, expect, it } from 'vitest'
import { hit, damageHero } from './combat'
import { sampleHeroImpact } from './health-impact'
import { BALANCE } from './config'
import { createContentRegistry } from './content/registry'
import { COMBAT_VFX_PACK } from './content/packs/combat-vfx'
import { createHeroSpecializationAdapter, type HeroSpecializationAdapter } from './content/heroes'
import { createState, resetRun } from './state'
import type { GameHooks, Mob, NumberFx } from './types'
import { createFakeCtx } from './render/fakes'
import { drawNumbers } from './render/effects'

function mob(x = 50): Mob {
  return { x, y: 0, type: 'slime', hp: 200, max: 200, r: 15, speed: 0, dmg: 5,
    phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }
}
const baseHooks = (): GameHooks => ({ sfx() {}, message() {}, offerUpgrades() {}, end() {} })

describe('authoritative critical feedback', () => {
  it('flags real Shadowblade critical hits and emits the existing local critical impact', () => {
    const s = createState()
    s.mode = 'play'
    const registry = createContentRegistry([COMBAT_VFX_PACK])
    const rolls = [0.1, 0.9]
    let adapter!: HeroSpecializationAdapter
    const hooks: GameHooks = {
      ...baseHooks(),
      modifyOutgoingDamage: amount => adapter.modifyOutgoingDamage(amount),
      consumeCriticalHit: () => adapter.consumeCriticalHit(),
      content: (state, event) => registry.emit(state, event, hooks),
    }
    adapter = createHeroSpecializationAdapter(s, 'shadowblade', hooks, () => rolls.shift() ?? 0.9)
    adapter.reset()
    const enemy = mob()
    hit(s, enemy, 20, hooks)
    expect(s.numberFx[0]).toMatchObject({ value: 34, critical: true })
    expect(s.impactWaves.filter(effect => effect.contact === 'critical')).toHaveLength(1)
    expect(s.content.effects.filter(effect => effect.id === 'combat-vfx:critical-hit')).toHaveLength(0)

    hit(s, enemy, 20, hooks)
    expect(s.numberFx[1]).toMatchObject({ value: 20, critical: false })
    expect(s.impactWaves.filter(effect => effect.contact === 'critical')).toHaveLength(1)
    expect(s.content.effects.filter(effect => effect.id === 'combat-vfx:critical-hit')).toHaveLength(0)
  })

  it('does not infer crits from the normal damage boost of other heroes', () => {
    const s = createState()
    s.mode = 'play'
    let adapter!: HeroSpecializationAdapter
    const hooks: GameHooks = {
      ...baseHooks(),
      modifyOutgoingDamage: amount => adapter.modifyOutgoingDamage(amount),
      consumeCriticalHit: () => adapter.consumeCriticalHit(),
    }
    adapter = createHeroSpecializationAdapter(s, 'spirit-summoner', hooks)
    adapter.reset()
    hit(s, mob(), 20, hooks)
    expect(s.numberFx[0]?.critical).toBe(false)
  })

  it('uses local impact feedback for routine hits but permits small recoil on heavy damage', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'
    const hero = s.hero!
    damageHero(s, hero.max * 0.08, baseHooks())
    expect(s.cameraKick).toBe(0)
    expect(sampleHeroImpact(hero, s.worldClock)).toBeUndefined()
    expect(s.numberFx.at(-1)).toMatchObject({ received: true, value: Math.round(hero.max * 0.08) })
    hero.inv = 0
    damageHero(s, hero.max * 0.3, baseHooks())
    expect(s.cameraKick).toBe(0) // no second/global recoil alongside the directional impact
    const impact = sampleHeroImpact(hero, s.worldClock)!
    expect(impact.severity).toBe('heavy')
    expect(Math.hypot(impact.offsetX, impact.offsetY)).toBeGreaterThan(0)
    expect(Math.hypot(impact.offsetX, impact.offsetY)).toBeLessThanOrEqual(BALANCE.combat.heroHitFeedback.heavy.shakePx + 1e-9)
    expect(sampleHeroImpact(hero, s.worldClock + 1)).toBeUndefined()
  })

  it('separates player health loss from enemy damage with a clear red minus-number', () => {
    const s = createState()
    s.W = 320; s.H = 568
    s.numberFx = [{ x: 120, y: 150, life: 0.7, value: 34, boss: false, received: true }]
    const { ctx } = createFakeCtx()
    const seen: { text: string; color: string }[] = []
    ctx.fillText = value => seen.push({ text: String(value), color: String(ctx.fillStyle) })
    drawNumbers(ctx, s, 0, 0, true)
    expect(seen.some(x => x.text === '−34' && x.color === '#ff737b')).toBe(true)
  })

  it('records the authoritative damage multiplier on the number', () => {
    const s = createState()
    s.mode = 'play'
    resetRun(s)
    s.mode = 'play'
    const hooks: GameHooks = { ...baseHooks(), modifyOutgoingDamage: amount => amount * 2.5, consumeCriticalHit: () => true }
    hit(s, mob(), 20, hooks)
    expect(s.numberFx.at(-1)).toMatchObject({ value: 50, critical: true, multiplier: 2.5 })
  })

  /** Paints one number and records every text glyph with its font and colours. */
  function paint(fx: Omit<NumberFx, 'x' | 'y'>, reduced = false) {
    const s = createState()
    s.W = 320; s.H = 568
    s.numberFx = [{ x: 120, y: 160, ...fx }]
    const fake = createFakeCtx()
    const filled: { text: string; font: string; fill: string }[] = []
    const strokes: string[] = []
    fake.ctx.fillText = text => filled.push({ text: String(text), font: fake.ctx.font, fill: String(fake.ctx.fillStyle) })
    fake.ctx.strokeText = () => strokes.push(String(fake.ctx.strokeStyle))
    drawNumbers(fake.ctx, s, 0, 0, reduced)
    const px = Number(/(\d+)px/.exec(filled[0]?.font ?? '')?.[1])
    return { filled, strokes, px, fill: filled[0]?.fill, calls: fake.calls }
  }

  it('presents crits and higher multipliers through the number itself, with no caption text', () => {
    const normal = paint({ life: 0.8, value: 20, boss: false })
    const amplified = paint({ life: 0.8, value: 28, boss: false, multiplier: 1.4 })
    const crit = paint({ life: 0.8, value: 34, boss: false, critical: true, multiplier: 1.7 })
    const devastating = paint({ life: 0.8, value: 50, boss: false, critical: true, multiplier: 2.5 })
    for (const shot of [normal, amplified, crit, devastating]) {
      expect(shot.filled.map(x => x.text)).toHaveLength(1)
      expect(shot.filled[0]!.text).toMatch(/^\d+$/)
    }
    // Size escalates with the actual multiplier tier.
    expect(normal.px).toBeLessThan(amplified.px)
    expect(amplified.px).toBeLessThan(crit.px)
    expect(crit.px).toBeLessThan(devastating.px)
    // Distinct colour AND silhouette (an extra coloured rim) mark crit tiers, not colour alone.
    expect(new Set([normal.fill, amplified.fill, crit.fill, devastating.fill]).size).toBe(4)
    expect(normal.strokes).toHaveLength(1)
    expect(crit.strokes).toHaveLength(2)
    expect(devastating.strokes).toHaveLength(2)
    expect(crit.strokes[0]).not.toBe(devastating.strokes[0])
  })

  it('grades incoming hero damage by severity without caption text', () => {
    const base = { life: 0.8, value: 30, boss: false, received: true } as const
    const tiers = [
      paint(base),
      paint({ ...base, severity: 'heavy' }),
      paint({ ...base, critical: true, severity: 'critical' }),
      paint({ ...base, critical: true, severity: 'extreme' }),
    ]
    for (const shot of tiers) expect(shot.filled.map(x => x.text)).toEqual(['−30'])
    for (let i = 1; i < tiers.length; i++) expect(tiers[i]!.px).toBeGreaterThan(tiers[i - 1]!.px)
    expect(new Set(tiers.map(x => x.fill)).size).toBe(4)
    expect(tiers[0]!.fill).toBe('#ff737b')
  })

  it('keeps tier size and colour but drops pop and shake under reduced motion', () => {
    const fx = { life: 0.8, value: 50, boss: false, critical: true, multiplier: 2.5 }
    const moving = paint(fx)
    const reduced = paint(fx, true)
    expect(reduced.filled).toEqual(moving.filled.map(x => ({ ...x })))
    expect(moving.calls).toContain('scale')
    expect(reduced.calls).not.toContain('scale')
    expect(reduced.calls.filter(x => x === 'translate')).toHaveLength(1)
  })
})
