import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { BOSS_ATTACKS, type BossAttackId } from './definitions'
import { ATTACK_PRESENTATION } from './attack-presentation'
import { drawBossImpacts, drawBossTelegraphs, loadBossMaterialSprites, bossMaterialKind } from './render'
import { createFakeCtx } from '../../render/fakes'
import type { BossSnapshot, BossTelegraph } from './controller'

const image = { complete: true, naturalWidth: 768 } as HTMLImageElement
const detail = { complete: true, naturalWidth: 384 } as HTMLImageElement
const materials = { abyss: image, frost: image, infernal: image, seraph: image }
const geometry = (id: BossAttackId): BossTelegraph => {
  const a = BOSS_ATTACKS[id]
  return { attackId: id, shape: a.shape, x: 400, y: 300, radius: a.radius, innerRadius: a.innerRadius ?? 0,
    width: a.width ?? 0, length: a.length ?? 0, angle: 0, safeAngle: 0, damage: a.damage,
    color: '#ba92ff', harmless: a.kind === 'summon', progress: 0.8, stage: 'warning' }
}
describe('baked boss material art', () => {
  it.each(['abyss', 'frost', 'infernal', 'seraph'])('decodes the actual transparent 768px %s PNG', kind => {
    const bytes = readFileSync(new URL('../../../assets/es2/production/skills/boss-materials/' + kind + '.png', import.meta.url))
    expect(bytes.readUInt32BE(16)).toBe(768)
    expect(bytes.readUInt32BE(20)).toBe(768)
    const data: Uint8Array[] = []
    let transparent = false
    for (let off = 8; off + 12 <= bytes.length;) {
      const n = bytes.readUInt32BE(off), tag = bytes.toString('ascii', off + 4, off + 8)
      const part = bytes.subarray(off + 8, off + 8 + n)
      if (tag === 'IDAT') data.push(part)
      if (tag === 'tRNS') transparent = part.includes(0) && part.includes(255)
      off += 12 + n
    }
    const raw = inflateSync(Buffer.concat(data))
    expect(raw.length).toBe(768 * 769)
    expect(transparent).toBe(true)
    expect(new Set(raw).size).toBeGreaterThan(40)
  })
  it('loads four shared bitmaps, not 25 duplicate material images', () => {
    const urls: string[] = []
    const make = () => ({ set src(v: string) { urls.push(v) } }) as HTMLImageElement
    expect(Object.keys(loadBossMaterialSprites(make))).toHaveLength(4)
    expect(new Set(urls).size).toBe(4)
    expect(bossMaterialKind('shadow-sweep')).toBe('abyss')
    expect(bossMaterialKind('seraph-finale')).toBe('seraph')
  })
  it.each(Object.keys(BOSS_ATTACKS) as BossAttackId[])('%s draws clipped material plus attack-specific detail', id => {
    const t = geometry(id), s: BossSnapshot = { id: ATTACK_PRESENTATION[id].boss, phase: 1,
      telegraphs: [], projectiles: [], impacts: [{ ...t, life: 0.35, max: 0.56 }] }
    const f = createFakeCtx()
    drawBossImpacts(f.ctx, s, 0, 0, false, 1000, 800, { [id]: detail }, undefined, materials)
    expect(f.drawn).toEqual([image, detail])
    expect(f.calls.indexOf('clip')).toBeLessThan(f.calls.indexOf('drawImage'))
    expect(f.calls.filter(x => x === 'fill').length).toBeLessThanOrEqual(2)
  })
  it('does not draw two copies of a live hazard in both layers', () => {
    const id = 'darkness-field', t = geometry(id), s: BossSnapshot = { id: 'abyss-monarch', phase: 2,
      telegraphs: [{ ...t, stage: 'active' }], projectiles: [], impacts: [{ ...t, life: 0.4, max: 0.56 }] }
    const f = createFakeCtx()
    drawBossTelegraphs(f.ctx, s, 0, 0, false, 1000, 800, undefined, { [id]: detail }, undefined, materials)
    drawBossImpacts(f.ctx, s, 0, 0, false, 1000, 800, { [id]: detail }, undefined, materials)
    expect(f.drawn).toEqual([image, detail])
  })
})
