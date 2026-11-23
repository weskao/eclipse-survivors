import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import { createFactionRuntime, spawnFactionEnemy } from '../../content/enemies/runtime'
import { createFakeCtx } from '../fakes'
import { drawLiveFactionArt, type FactionArtwork } from './production-factions'

// The older develop-branch mobs draw at: slime 87x75, bat 114x92,
// goblin 92x108, golem 139x134, warlock 105x127.
// Keep new faction silhouettes in a comparable, role-sensitive range.
const expectedSize: Record<FactionKind, number> = {
  'shadow-assassin': 92,
  necromancer: 108,
  'dark-archer': 96,
  'plague-carrier': 104,
  'shield-guardian': 128,
  phantom: 90,
  'fire-imp': 88,
  'frost-wraith': 102,
  berserker: 110,
  'crystal-sentinel': 128,
}

const loaded = (side: number, columns = 1): HTMLImageElement => ({
  complete: true, naturalWidth: side * columns, naturalHeight: side,
}) as HTMLImageElement

describe('ES2 faction visual parity with develop monsters', () => {
  it('has a visual size for each faction and retains the ordinary monster size range', () => {
    expect(Object.keys(expectedSize).sort()).toEqual(Object.keys(ENEMY_DEFINITIONS).sort())
    for (const size of Object.values(expectedSize)) {
      expect(size).toBeGreaterThanOrEqual(87)
      expect(size).toBeLessThanOrEqual(139)
    }
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
