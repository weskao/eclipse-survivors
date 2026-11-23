import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../state'
import { createFakeCtx } from './fakes'
import { drawOrbs, drawShots } from './effects'
import { drawEnemyProjectiles } from './enemy-attacks'
import { drawLiveFactionProjectiles } from './es2/production-factions'
import { createFactionRuntime } from '../content/enemies/runtime'
import { loadProjectileSprites } from './projectile-art'

const sprites = loadProjectileSprites(() =>
  ({ src: '', complete: true, naturalWidth: 192 }) as HTMLImageElement)

describe('authored gameplay effects are used by real rendering entrypoints', () => {
  it('paints different authored sprites for ranger arrows, mage bolts, and orbit weapons', () => {
    const state = createState()
    resetRun(state); state.W = 800; state.H = 600
    state.shots = [
      { x: 100, y: 110, vx: 400, vy: 0, life: 1, d: 10, kind: 'arrow', r: 5 },
      { x: 180, y: 110, vx: 300, vy: 0, life: 1, d: 10, kind: 'magic', r: 9 },
    ]
    const { ctx, drawn } = createFakeCtx()
    drawShots(ctx, state, 0, 0, null, sprites)
    expect(drawn).toContain(sprites['ranger-arrow'])
    expect(drawn).toContain(sprites['arcane-bolt'])
    state.hero!.skills.orb = 1
    drawOrbs(ctx, state, state.hero!, 0, 0, sprites)
    expect(drawn).toContain(sprites['gravity-core'])
  })

  it('uses enemy and faction-specific attack sprites without touching projectile simulation', () => {
    const state = createState()
    state.W = 800; state.H = 600
    state.enemyShots = [{ x: 80, y: 90, vx: 200, vy: 30, radius: 9, damage: 6, life: 1 }]
    const { ctx, drawn } = createFakeCtx()
    drawEnemyProjectiles(ctx, state, 0, 0, sprites)
    expect(drawn).toContain(sprites['enemy-hex'])

    const runtime = createFactionRuntime()
    runtime.projectiles.push({ x: 200, y: 210, vx: 120, vy: 0,
      radius: 10, damage: 6, life: 1, sourceId: 1, kind: 'fire-imp', status: undefined })
    drawLiveFactionProjectiles(ctx, state, runtime, 0, 0, sprites)
    expect(drawn).toContain(sprites['enemy-ember'])
  })
})
