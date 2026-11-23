import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import { createFactionRuntime, spawnFactionEnemy } from '../../content/enemies/runtime'
import { createFakeCtx } from '../fakes'
import { drawLiveFactionArt, type FactionArtwork } from './production-factions'

// The older develop-branch mobs draw at: slime 87x75, bat 114x92,
// goblin 92x108, golem 139x134, warlock 105x127.
// Previous 88-128px boxes looked tiny because transparent gutters contain only 64-92% of a pose.
// Bolder silhouette-specific sizes remain strictly smaller than the 236x246px original BOSS.
const expectedSize: Record<FactionKind, number> = {
   'shadow-assassin': 146,
  necromancer: 168,
  'dark-archer': 154,
  'plague-carrier': 184,
  'shield-guardian': 208,
  phantom: 152,
  'fire-imp': 142,
  'frost-wraith': 166,
  berserker: 180,
  'crystal-sentinel': 208,
}

const loaded = (side: number, columns = 1): HTMLImageElement => ({
  complete: true, naturalWidth: side * columns, naturalHeight: side,
}) as HTMLImageElement

describe('ES2 faction visual parity with develop monsters', () => {
  it('has a visual size for each faction and retains the ordinary monster size range', () => {
    expect(Object.keys(expectedSize).sort()).toEqual(Object.keys(ENEMY_DEFINITIONS).sort())
    for (const size of Object.values(expectedSize)) {
      expect(size).toBeGreaterThanOrEqual(140)
      expect(size).toBeLessThan(236)
    }
  })

  it('keeps the heavy guardian and crystal elite distinctly large but below a 236px boss', () => {
    expect(expectedSize['shield-guardian']).toBe(208)
    expect(expectedSize['crystal-sentinel']).toBe(208)
    expect(expectedSize['fire-imp']).toBeLessThan(expectedSize['shield-guardian'])
  })

  it('draws an enlarged enemy partly visible from below the viewport, without altering its collision', () => {
    const state = createState()
    resetRun(state)
    state.W = 300
    state.H = 300
    const runtime = createFactionRuntime()
    const enemy = spawnFactionEnemy(runtime, 'shield-guardian', 150, 420)!
    const oldRadius = enemy.radius
    const images = { 'shield-guardian': { body: loaded(324, 6), telegraph: loaded(150) } } as Partial<FactionArtwork>
    const { ctx } = createFakeCtx()
    const draws: unknown[][] = []
    const drawImage = ctx.drawImage.bind(ctx)
    ctx.drawImage = ((...args: unknown[]) => { draws.push(args); Reflect.apply(drawImage, ctx, args) }) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx, state, runtime, images, 0, 0)).toBe(1)
    expect(draws.some(call => call[0] === images['shield-guardian']!.body)).toBe(true)
    expect(enemy.radius).toBe(oldRadius)
    enemy.y = 900
    expect(drawLiveFactionArt(ctx, state, runtime, images, 0, 0)).toBe(0)
  })

  it.each(Object.entries(expectedSize) as [FactionKind, number][])(
    '%s draws at %ipx with unchanged hit radius, foot anchor and source crop',
    (kind, expected) => {
      const state = createState()
      resetRun(state)
      state.W = 900
      state.H = 600
      state.worldClock = 1
      const runtime = createFactionRuntime()
      const enemy = spawnFactionEnemy(runtime, kind, 300, 300)!
      enemy.state = 'windup'
      enemy.facingX = 1
      const originalRadius = enemy.radius
      const img = loaded(324, 6)
      const cue = loaded(150)
      const images = { [kind]: { body: img, telegraph: cue } } as Partial<FactionArtwork>
      const { ctx } = createFakeCtx()
      const calls: unknown[][] = []
      const drawImage = ctx.drawImage.bind(ctx)
      ctx.drawImage = ((...args: unknown[]) => {
        calls.push(args)
        Reflect.apply(drawImage, ctx, args)
      }) as typeof ctx.drawImage

      expect(drawLiveFactionArt(ctx, state, runtime, images, 0, 0)).toBe(1)
      const bodyCall = calls.find(call => call[0] === img)
      expect(bodyCall?.slice(3, 5)).toEqual([324, 324])
      expect(bodyCall?.slice(5)).toEqual([-expected / 2, -expected + 5, expected, expected])
      const warningCall = calls.find(call => call[0] === cue)
      expect(warningCall?.slice(5)).toEqual([-20, -expected - 18, 40, 40])
      expect(enemy.radius).toBe(originalRadius)
      expect(enemy.radius).toBe(ENEMY_DEFINITIONS[kind].radius)
    },
  )
})
