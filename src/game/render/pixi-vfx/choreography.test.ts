import { describe, expect, it } from 'vitest'
import { BOSS_ATTACKS, type BossAttackId } from '../../content/bosses/definitions'
import { choreography, particlePose, particleFrame, releaseEnvelope, type ParticlePose } from './choreography'
import { impactGeometry } from './plan'
import type { BossImpact } from '../../content/bosses/controller'

const ids = Object.keys(BOSS_ATTACKS) as BossAttackId[]
const pose = (): ParticlePose => ({ x: 0, y: 0, rotation: 0, width: 0, height: 0, alpha: 0, kind: 'spark' })
function geometry(id: BossAttackId) {
  const a = BOSS_ATTACKS[id]
  const t: BossImpact = { attackId: id, shape: a.shape, x: 0, y: 0, radius: a.radius, innerRadius: a.innerRadius ?? 0,
    width: a.width ?? 0, length: a.length ?? 0, angle: 0, safeAngle: 0, damage: a.damage, harmless: false, color: '#fff', life: .3, max: 1 }
  return impactGeometry(t)!
}
describe('25 authored boss choreography contracts', () => {
  it('has a distinct choreography signature per attack, including duration, material and motion', () => {
    expect(new Set(ids.map(id => JSON.stringify(choreography(id)))).size).toBe(25)
    for (const id of ids) {
      const c = choreography(id)
      expect(c.duration).toBeGreaterThanOrEqual(.72)
      expect(c.duration).toBeLessThanOrEqual(1.25)
      expect(c.count).toBeLessThanOrEqual(64)
      expect(c.count).toBeGreaterThanOrEqual(24)
    }
  })
  it.each(ids)('%s is deterministic and finite at every stage; all particle centers stay in the actual mask', id => {
    const c = choreography(id), g = geometry(id), a = pose(), b = pose()
    for (const stage of ['warning', 'active', 'release'] as const) for (const t of [0,.2,.5,.9,1]) for (let i = 0; i < c.count; i++) {
      particlePose(a, c, g, stage, t, i)
      particlePose(b, c, g, stage, t, i)
      expect(a).toEqual(b)
      expect([a.x,a.y,a.rotation,a.width,a.height,a.alpha].every(Number.isFinite)).toBe(true)
      expect(a.alpha).toBeGreaterThanOrEqual(0)
      expect(a.alpha).toBeLessThanOrEqual(1)
      if (g.shape === 'beam') {
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x).toBeLessThanOrEqual(g.length)
        expect(Math.abs(a.y)).toBeLessThanOrEqual(g.width)
      } else {
        const r = Math.hypot(a.x,a.y)
        expect(r).toBeLessThanOrEqual(g.radius + 1e-6)
        if (g.shape === 'ring') expect(r).toBeGreaterThanOrEqual(g.innerRadius - 1e-6)
        if (g.shape === 'arena') expect(Math.abs(Math.atan2(a.y,a.x))).toBeGreaterThanOrEqual(Math.PI/5 - 1e-6)
      }
    }
  })
  it('collapse pulls in, crystal bursts move out, beam particles advance, feathers drift', () => {
    for (const [id, inward] of [['abyss-collapse', true], ['winter-burst', false]] as const) {
      const c = choreography(id), g = geometry(id), a = pose(), b = pose()
      particlePose(a,c,g,'release',.15,0); particlePose(b,c,g,'release',.8,0)
      expect(Math.hypot(a.x,a.y) > Math.hypot(b.x,b.y)).toBe(inward)
    }
    const a = pose(), b = pose(), c = choreography('radiant-lance'), g = geometry('radiant-lance')
    particlePose(a,c,g,'release',.15,0); particlePose(b,c,g,'release',.8,0)
    expect(b.x).toBeGreaterThan(a.x)
    expect(choreography('seraph-finale').material).toBe('feather')
  })
  it('release opacity has a peak and fades to zero without restarting', () => {
    const c = choreography('titan-rage')
    expect(releaseEnvelope(c, 0)).toBeGreaterThan(0)
    expect(releaseEnvelope(c,.18)).toBeGreaterThan(releaseEnvelope(c,.85))
    expect(releaseEnvelope(c,1)).toBe(0)
    expect(particleFrame('high',false)).toBe(160)
    expect(particleFrame('low',false)).toBe(48)
    expect(particleFrame('high',true)).toBe(0)
  })
})
