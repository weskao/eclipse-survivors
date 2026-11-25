import { describe, expect, it } from 'vitest'
import { BOSS_ATTACKS, type BossAttackId } from '../../content/bosses/definitions'
import type { BossImpact } from '../../content/bosses/controller'
import { impactGeometry, particleLimit, visibleImpact, runVfxPass } from './plan'

const impact = (id: BossAttackId): BossImpact => {
  const a = BOSS_ATTACKS[id]
  return { attackId: id, x: 200, y: 100, shape: a.shape, radius: a.radius, innerRadius: a.innerRadius ?? 0,
    width: a.width ?? 0, length: a.length ?? 0, angle: 0.7, safeAngle: 1.2, damage: a.damage, color: '#fff', harmless: false, life: 0.3, max: 0.56 }
}
describe('Pixi VFX pass ownership and bounds', () => {
  it.each(Object.keys(BOSS_ATTACKS) as BossAttackId[])('%s preserves its actual release geometry', id => {
    const t = impact(id), g = impactGeometry(t)!
    if (BOSS_ATTACKS[id].kind === 'projectile') {
      expect(g.shape).toBe('circle')
      expect(g.radius).toBeLessThan(60)
    } else {
      expect(g.shape).toBe(t.shape)
      expect(g.radius).toBe(t.radius)
      expect(g.innerRadius).toBe(t.innerRadius)
      expect(g.width).toBe(t.width)
      expect(g.length).toBe(t.length)
    }
    expect(g.rotation).toBe(t.shape === 'arena' ? t.safeAngle : t.shape === 'beam' ? t.angle : 0)
  })
  it('culls offscreen effects but keeps a beam crossing the viewport', () => {
    const t = impact('radiant-lance')
    expect(visibleImpact({ ...t, x: -200, y: 100, angle: 0 }, impactGeometry(t)!, 0, 0, 800, 600)).toBe(true)
    expect(visibleImpact({ ...t, x: -5000 }, impactGeometry(t)!, 0, 0, 800, 600)).toBe(false)
  })
  it('keeps a strict particle ceiling and removes motion in accessibility mode', () => {
    expect(particleLimit(false, 'high')).toBe(88)
    expect(particleLimit(false, 'medium')).toBe(48)
    expect(particleLimit(false, 'low')).toBe(24)
    expect(particleLimit(true, 'high')).toBe(0)
  })
  it('has exactly one successful rendering owner; GPU failure invokes Canvas fallback', () => {
    let gpu = 0, fallback = 0
    runVfxPass(() => { gpu++; return true }, () => { fallback++ })
    expect([gpu, fallback]).toEqual([1, 0])
    runVfxPass(() => false, () => { fallback++ })
    runVfxPass(() => { throw Error('context lost') }, () => { fallback++ })
    expect(fallback).toBe(2)
  })
})
