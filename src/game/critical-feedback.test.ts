import { describe, expect, it } from 'vitest'
import { hit, damageHero } from './combat'
import { sampleHeroImpact } from './health-impact'
import { BALANCE } from './config'
import { createContentRegistry } from './content/registry'
import { COMBAT_VFX_PACK } from './content/packs/combat-vfx'
import { createHeroSpecializationAdapter, type HeroSpecializationAdapter } from './content/heroes'
import { createState, resetRun } from './state'
import type { GameHooks, Mob } from './types'
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

  it('draws critical numbers with a legible label even when motion is reduced', () => {
    const s = createState()
    s.W = 320; s.H = 568
    s.numberFx = [{ x: 120, y: 140, life: 0.6, value: 1204, boss: false, critical: true }]
    const normal = createFakeCtx()
    const labels: string[] = []
    const sizes: string[] = []
    normal.ctx.fillText = text => { labels.push(String(text)); sizes.push(normal.ctx.font) }
    drawNumbers(normal.ctx, s, 0, 0)
    expect(labels).toContain('1204')
    expect(labels.some(label => label.includes('!') || label.includes('暴擊'))).toBe(true)
    expect(sizes.some(font => font.includes('28px'))).toBe(true)

    const reduced = createFakeCtx()
    const reducedLabels: string[] = []
    reduced.ctx.fillText = text => reducedLabels.push(String(text))
    drawNumbers(reduced.ctx, s, 0, 0, true)
    expect(reducedLabels).toEqual(labels)
    expect(reduced.calls).not.toContain('scale')
  })
})
