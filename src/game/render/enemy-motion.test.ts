import { describe, expect, it } from 'vitest'
import { createFakeCtx } from './fakes'
import { applyEnemyRecoil, applyEnemyPose, drawEnemyRelease, ENEMY_RELEASE_ART } from './enemy-motion'
import { ENEMY_DEFINITIONS } from '../content/enemies/definitions'
import { createFactionRuntime, spawnFactionEnemy, damageFactionEnemy, tickFactionEnemies } from '../content/enemies/runtime'

describe('enemy visual motion follows real combat without moving hitboxes', () => {
  it('recoils in the direction of a real hit and expires in simulation time', () => {
    const runtime = createFactionRuntime()
    const e = spawnFactionEnemy(runtime, 'berserker', 100, 0)!
    expect(damageFactionEnemy(runtime, e, 1, 0, 0)).toBe(1)
    expect(e.hitTime).toBeGreaterThan(0)
    expect(e.hitX).toBe(1)
    expect(e.hitY).toBe(0)
    const x = e.x, y = e.y
    const { ctx, calls } = createFakeCtx()
    applyEnemyRecoil(ctx, e.hitTime!, e.hitX!, e.hitY!, 0.5, false)
    expect(calls).toContain('rotate')
    expect([e.x, e.y]).toEqual([x, y])
    const reduced = createFakeCtx()
    applyEnemyRecoil(reduced.ctx, e.hitTime!, 1, 0, 0.5, true)
    expect(reduced.calls).toHaveLength(0)
    e.state = 'recover'; e.timer = 2
    tickFactionEnemies({ runtime, hero: { x: 0, y: 0 }, width: 800, height: 600, onHeroDamage: () => true }, 0.5)
    expect(e.hitTime).toBe(0)
  })
  it('has a distinct release texture for every faction and every legacy attack', () => {
    for (const kind of [...Object.keys(ENEMY_DEFINITIONS), 'pounce', 'dive', 'jab', 'slam', 'bolt']) {
      expect(ENEMY_RELEASE_ART[kind]).toBeTruthy()
    }
    expect(new Set(Object.values(ENEMY_RELEASE_ART)).size).toBe(Object.keys(ENEMY_RELEASE_ART).length)
  })
  it('only draws actual visible release art once, and does not duplicate it with a fallback', () => {
    const { ctx, drawn } = createFakeCtx()
    const image = { complete: true, naturalWidth: 384 } as HTMLImageElement
    const art = { 'crystal-sentinel': image }
    drawEnemyRelease(ctx, 'crystal-sentinel', 40, 100, 0, 400, 68, 0.2, false, 800, 600, art)
    expect(drawn).toEqual([image])
    drawEnemyRelease(ctx, 'crystal-sentinel', -900, -900, 0, 400, 68, 0.2, false, 800, 600, art)
    drawEnemyRelease(ctx, 'crystal-sentinel', 40, 100, 0, 400, 68, 0, false, 800, 600, art)
    expect(drawn).toEqual([image])
  })
  it('does not emit an attack accent when a windup is cancelled', () => {
    const runtime = createFactionRuntime()
    const e = spawnFactionEnemy(runtime, 'crystal-sentinel', 0, 0)!
    e.state = 'windup'; e.timer = 0.01
    const arena = { runtime, hero: { x: 100, y: 0 }, width: 800, height: 600, lineOfSight: () => false, onHeroDamage: () => true }
    tickFactionEnemies(arena, 0.02)
    expect(e.releaseFx ?? 0).toBe(0)
    e.state = 'windup'; e.timer = 0.01
    tickFactionEnemies({ ...arena, lineOfSight: () => true }, 0.02)
    expect(e.releaseFx).toBeGreaterThan(0)
  })
  it('keeps attack motion static with reduced motion', () => {
    const { ctx, calls } = createFakeCtx()
    applyEnemyPose(ctx, 'windup', 0.8, 1, 1, 0.5, true)
    expect(calls).toHaveLength(0)
  })
})
