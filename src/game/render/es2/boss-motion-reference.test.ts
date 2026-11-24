import { describe, expect, it } from 'vitest'
import { BOSS_MOTION_REFERENCES, sampleBossAttackReference, drawBossAttackReference } from './boss-motion-reference'
import type { BossSnapshot } from '../../content/bosses/controller'
import type { BossId } from '../../content/bosses/definitions'
import type { Ctx2D } from '../ctx'

const ids: BossId[] = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph']
const cue = { attackId: 'preview', shape: 'circle' as const, x: 0, y: 0, radius: 50, innerRadius: 0, width: 0, length: 0, angle: 0, safeAngle: 0, damage: 0, color: '#fff', harmless: true }
const snapshot = (id: BossId, phase: 1 | 2 | 3, progress?: number, life?: number): BossSnapshot => ({
  id, phase, projectiles: [],
  telegraphs: progress === undefined ? [] : [{ ...cue, stage: 'warning', progress }],
  impacts: life === undefined ? [] : [{ ...cue, life, max: 1 }],
})
const image = { complete: true, naturalWidth: 1448, naturalHeight: 1086 } as HTMLImageElement

describe('DEV boss action source references (not native-3x production art)', () => {
  it.each(ids)('%s has six distinct in-bounds attack references per phase', id => {
    const reference = BOSS_MOTION_REFERENCES[id]
    expect(reference.phases).toHaveLength(3)
    for (const row of reference.phases) {
      expect(row).toHaveLength(6)
      expect(new Set(row.map(r => r.join(','))).size).toBe(6)
      for (const [x, y, right, bottom] of row) {
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0)
        expect(right).toBeGreaterThan(x); expect(bottom).toBeGreaterThan(y)
        expect(right).toBeLessThanOrEqual(1448); expect(bottom).toBeLessThanOrEqual(1086)
      }
    }
  })
  it.each(ids)('%s advances through warning and release poses using encounter time', id => {
    for (const phase of [1, 2, 3] as const) {
      const frames = [snapshot(id, phase, 0), snapshot(id, phase, .5), snapshot(id, phase, 1),
        snapshot(id, phase, undefined, 1), snapshot(id, phase, undefined, .5), snapshot(id, phase, undefined, 0)]
      expect(frames.map(s => sampleBossAttackReference(s))).toEqual(BOSS_MOTION_REFERENCES[id].phases[phase - 1])
      expect(sampleBossAttackReference(snapshot(id, phase))).toBeNull()
    }
  })
  it('retains static fallback for incomplete source, no attack, and reduced motion', () => {
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const s = snapshot('infernal-titan', 3, .5)
    expect(drawBossAttackReference(ctx, image, s, 236, true)).toBe(false)
    expect(drawBossAttackReference(ctx, { ...image, complete: false } as HTMLImageElement, s, 236)).toBe(false)
    expect(drawBossAttackReference(ctx, image, snapshot('infernal-titan', 3), 236)).toBe(false)
    expect(calls).toHaveLength(0)
    expect(drawBossAttackReference(ctx, image, s, 236)).toBe(true)
    const [, , , , , x, y, w, h] = calls[0] as [unknown, number, number, number, number, number, number, number, number]
    expect(x).toBe(-w / 2)
    expect(y + h).toBeCloseTo(4)
    expect(Math.max(w, h)).toBeCloseTo(236 * 1.24)
  })
})
