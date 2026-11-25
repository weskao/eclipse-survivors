import { describe, expect, it } from 'vitest'
import { BOSS_ATTACKS, type BossAttackId } from './definitions'
import { ATTACK_PRESENTATION } from './attack-presentation'
import { createFakeCtx } from '../../render/fakes'
import { drawBossImpacts, drawBossTelegraphs, loadBossAttackSprites, loadBossProjectileSprites } from './render'
import { drawBossParticles, type ParticleBudget } from './cinematic-particles'
import type { BossSnapshot, BossTelegraph } from './controller'

const ids = Object.keys(BOSS_ATTACKS) as BossAttackId[]
const geometry = (id: BossAttackId): BossTelegraph => {
  const a = BOSS_ATTACKS[id]
  return { attackId: id, shape: a.shape, x: 400, y: 300, radius: a.radius, innerRadius: a.innerRadius ?? 0,
    width: a.width ?? 0, length: a.length ?? 0, angle: 0, safeAngle: 0, damage: a.damage, color: '#ba92ff', harmless: a.kind === 'summon', progress: 0.8, stage: 'warning' }
}
const image = { complete: true, naturalWidth: 768 } as HTMLImageElement
describe('cinematic boss VFX', () => {
  it('preloads 25 release textures and seven distinct projectile textures', () => {
    const urls: string[] = []
    const make = () => ({ set src(url: string) { urls.push(url) } }) as HTMLImageElement
    expect(Object.keys(loadBossAttackSprites(make))).toHaveLength(25)
    expect(Object.keys(loadBossProjectileSprites(make))).toHaveLength(7)
    expect(new Set(urls).size).toBe(32)
  })
  it.each(ids)('%s paints one material texture and bounded particles inside a clip', id => {
    const t = geometry(id), f = createFakeCtx()
    const s: BossSnapshot = { id: ATTACK_PRESENTATION[id].boss, phase: 1, telegraphs: [], projectiles: [], impacts: [{ ...t, life: 0.35, max: 0.56 }] }
    drawBossImpacts(f.ctx, s, 0, 0, false, 1000, 800, { [id]: image })
    expect(f.drawn).toEqual([image])
    expect(f.calls).toContain('clip')
    expect(f.calls.filter(x => x === 'fill').length).toBeLessThanOrEqual(2)
    expect(f.calls).not.toContain('stroke')
    const reduced = createFakeCtx()
    drawBossImpacts(reduced.ctx, s, 0, 0, true, 1000, 800, { [id]: image })
    expect(reduced.drawn).toEqual([image])
    expect(reduced.calls).not.toContain('fill')
  })
  it('does not double-paint active hazards during release', () => {
    const id = 'darkness-field', t = geometry(id), f = createFakeCtx()
    const s: BossSnapshot = { id: 'abyss-monarch', phase: 2, telegraphs: [{ ...t, stage: 'active' }], projectiles: [], impacts: [{ ...t, life: 0.4, max: 0.56 }] }
    drawBossTelegraphs(f.ctx, s, 0, 0, false, 1000, 800, undefined, { [id]: image })
    drawBossImpacts(f.ctx, s, 0, 0, false, 1000, 800, { [id]: image })
    expect(f.drawn).toEqual([image])
  })
  it('uses a hard shared particle ceiling and batches all fragments into two fills per effect', () => {
    const f = createFakeCtx(), budget: ParticleBudget = { remaining: 11 }
    const t = geometry('titan-rage')
    drawBossParticles(f.ctx, t, ATTACK_PRESENTATION['titan-rage'], 'release', 0.3, budget, '#ffad67', '#fff0ce')
    expect(budget.remaining).toBe(0)
    expect(f.calls.filter(x => x === 'fill')).toHaveLength(2)
    const count = f.calls.length
    drawBossParticles(f.ctx, t, ATTACK_PRESENTATION['titan-rage'], 'release', 0.3, budget, '#ffad67', '#fff0ce')
    expect(f.calls.length).toBe(count)
  })
})
