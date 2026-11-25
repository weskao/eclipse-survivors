import { describe, expect, it, vi } from 'vitest'
import { createFakeCtx } from './fakes'
import { loadProjectileSprites } from './projectile-art'
import { drawEnergyMissile, drawZoneMotes } from './energy-art'
import { drawBossTelegraphs } from '../content/bosses/render'
import type { BossSnapshot } from '../content/bosses/controller'

const sprites = loadProjectileSprites(() => ({ src: '', complete: true, naturalWidth: 192 }) as HTMLImageElement)
const shot = { x: 100, y: 120, vx: 100, vy: 50, radius: 10, damage: 5, life: 1, color: '#aa88ff' }

describe('combat energy artwork', () => {
  it.each([
    ['abyss-monarch', 'enemy-hex'], ['frost-sovereign', 'arcane-bolt'],
    ['infernal-titan', 'enemy-ember'], ['eclipse-seraph', 'holy-lance'],
  ] as const)('%s uses its themed sprite without the old circle and bar', (id, art) => {
    const snapshot: BossSnapshot = { id, phase: 1, telegraphs: [], projectiles: [shot] }
    const full = createFakeCtx()
    drawBossTelegraphs(full.ctx, snapshot, 0, 0, false, 800, 600, sprites)
    expect(full.drawn).toEqual([sprites[art]])
    expect(full.calls).not.toContain('arc')
    expect(full.calls).toContain('fill')
    const reduced = createFakeCtx()
    drawBossTelegraphs(reduced.ctx, snapshot, 0, 0, true, 800, 600, sprites)
    expect(reduced.drawn).toEqual([sprites[art]])
    expect(reduced.calls).not.toContain('fill')
    const off = createFakeCtx()
    drawBossTelegraphs(off.ctx, { ...snapshot, projectiles: [{ ...shot, x: -2000 }] }, 0, 0, false, 800, 600, sprites)
    expect(off.drawn).toHaveLength(0)
  })

  it('draws a faceted fallback even if artwork has not decoded', () => {
    const { ctx, calls } = createFakeCtx()
    drawEnergyMissile(ctx, undefined, 'enemy-hex', 10, 1, '#aa88ff', '#fff', true)
    expect(calls).toContain('bezierCurveTo')
    expect(calls).not.toContain('arc')
    expect(calls).not.toContain('drawImage')
  })

  it('keeps all decorative vertices inside an annulus and removes animated motes in reduced motion', () => {
    const { ctx } = createFakeCtx()
    const move = vi.spyOn(ctx, 'moveTo'), line = vi.spyOn(ctx, 'lineTo')
    drawZoneMotes(ctx, 100, 200, 100, 65, 0.6, '#aa88ff')
    expect(move).toHaveBeenCalledTimes(12)
    for (const [x, y] of [...move.mock.calls, ...line.mock.calls]) {
      const r = Math.hypot(x - 100, y - 200)
      expect(r).toBeGreaterThan(65)
      expect(r).toBeLessThan(100)
    }
    move.mockClear()
    drawZoneMotes(ctx, 100, 200, 100, 65, 0.6, '#aa88ff', true)
    expect(move).not.toHaveBeenCalled()
  })
})
