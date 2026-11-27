import { describe, expect, it } from 'vitest'
import { bossPhasePose, bossPhaseBudget, BOSS_PHASE_SLOTS, type BossPhasePose } from './boss-phase-choreography'
import { BOSS_DEFINITIONS, type BossId } from '../../content/bosses/definitions'
import { drawBossPhaseCanvas } from './boss-phase-canvas'
import { createFakeCtx } from '../fakes'
import type { BossSnapshot } from '../../content/bosses/controller'

const snapshot = (id: BossId, phase: 2 | 3, progress: number): BossSnapshot => ({
  id, phase, telegraphs: [], projectiles: [],
  bodyMotion: { pose: 'transform', phase, progress, x: 100, y: 200 },
})
const pose = (): BossPhasePose => ({ x: 0, y: 0, width: 0, height: 0, rotation: 0, alpha: 0, texture: 'seal', additive: false })
describe('world-space boss transformations', () => {
  it('keeps eight different transformations finite and bounded; phase III grows further', () => {
    const signatures = new Set<string>()
    for (const id of Object.keys(BOSS_DEFINITIONS) as BossId[]) {
      const radii: number[] = []
      for (const phase of [2, 3] as const) {
        const out = pose()
        const signature: number[] = []
        let reach = 0
        for (const p of [0, .15, .32, .5, .7, .9, 1]) {
          for (let slot = 0; slot < BOSS_PHASE_SLOTS; slot++) {
            if (!bossPhasePose(out, snapshot(id, phase, p), slot, false)) continue
            expect([out.x, out.y, out.width, out.height, out.rotation, out.alpha].every(Number.isFinite)).toBe(true)
            expect(out.alpha).toBeGreaterThan(0)
            expect(out.alpha).toBeLessThanOrEqual(.85)
            expect(out.width).toBeGreaterThan(0)
            reach = Math.max(reach, Math.hypot(out.x, out.y) + out.width / 2)
            signature.push(out.x, out.y, out.width, out.rotation)
          }
        }
        signatures.add(signature.join(','))
        radii.push(reach)
      }
      expect(radii[1]).toBeGreaterThan(radii[0]!)
    }
    expect(signatures.size).toBe(8)
  })
  it('has a stable reduced-motion seal, no moving motes, no non-transform effects', () => {
    const a = pose(), b = pose()
    expect(bossPhasePose(a, snapshot('abyss-monarch', 3, .1), 0, true)).toBe(true)
    expect(bossPhasePose(b, snapshot('abyss-monarch', 3, .8), 0, true)).toBe(true)
    expect(a).toEqual(b)
    expect(bossPhaseBudget(true, 'high')).toBe(2)
    expect(bossPhaseBudget(false, 'low')).toBeLessThan(bossPhaseBudget(false, 'high'))
    const idle = snapshot('abyss-monarch', 2, .5)
    expect(bossPhasePose(a, { ...idle, bodyMotion: { ...idle.bodyMotion!, pose: 'idle' } }, 0, false)).toBe(false)
  })
  it('canvas draws visible transformations and respects opacity off and viewport culling', () => {
    const { ctx, calls } = createFakeCtx()
    drawBossPhaseCanvas(ctx, snapshot('frost-sovereign', 3, .5), 0, 0, 800, 600, false, 1, 'low')
    expect(calls).toContain('stroke')
    const count = calls.length
    drawBossPhaseCanvas(ctx, snapshot('frost-sovereign', 3, .5), 0, 0, 800, 600, false, 0, 'low')
    drawBossPhaseCanvas(ctx, snapshot('frost-sovereign', 3, .5), -5000, 0, 800, 600, false, 1, 'low')
    expect(calls.length).toBe(count)
  })
})
