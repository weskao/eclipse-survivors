import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import { createFactionRuntime, spawnFactionEnemy } from '../../content/enemies/runtime'
import { createFakeCtx, fakeArtwork } from '../fakes'
import { drawCharacter } from '../characters'
import type { Mob } from '../../types'
import { drawLiveFactionArt, type FactionArtwork } from './production-factions'

// The older develop-branch mobs draw at: slime 87x75, bat 114x92,
// goblin 92x108, golem 139x134, warlock 105x127.
// Previous 88-128px boxes looked tiny because transparent gutters contain only 64-92% of a pose.
// The heaviest factions must remain visually subordinate to the enlarged 255x266px BOSS.
const expectedSize: Record<FactionKind, number> = {
   'shadow-assassin': 146,
  necromancer: 168,
  'dark-archer': 154,
  'plague-carrier': 176,
  'shield-guardian': 198,
  phantom: 152,
  'fire-imp': 142,
  'frost-wraith': 166,
  berserker: 172,
  'crystal-sentinel': 198,
}

const loaded = (side: number, columns = 1): HTMLImageElement => ({
  complete: true, naturalWidth: side * columns, naturalHeight: side,
}) as HTMLImageElement

describe('ES2 faction visual parity with develop monsters', () => {
  it('has a visual size for each faction and retains the ordinary monster size range', () => {
    expect(Object.keys(expectedSize).sort()).toEqual(Object.keys(ENEMY_DEFINITIONS).sort())
    for (const size of Object.values(expectedSize)) {
      expect(size).toBeGreaterThanOrEqual(140)
      expect(size).toBeLessThan(255)
    }
  })

  it('keeps the heaviest elites distinctly smaller than the enlarged boss', () => {
    expect(expectedSize['shield-guardian']).toBe(198)
    expect(expectedSize['crystal-sentinel']).toBe(198)
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

describe('BOSS world-sprite hierarchy (visuals only)', () => {
  const bossIds = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph'] as const

  it.each(bossIds)('%s displays all three phases 8% larger with fixed foot anchor and hitbox', bossArtId => {
    const state = createState()
    state.W = 800
    state.H = 600
    const art = fakeArtwork(true)
    const boss: Mob = {
      x: 0, y: 0, type: 'boss', bossArtId, bossPhase: 1,
      hp: 200, max: 200, r: 48, speed: 100, dmg: 10,
      phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
    }
    const atlas = loaded(192, 3)

    for (const phase of [1, 2, 3] as const) {
      const { ctx } = createFakeCtx()
      const calls: unknown[][] = []
      const draw = ctx.drawImage.bind(ctx)
      ctx.drawImage = ((...args: unknown[]) => { calls.push(args); Reflect.apply(draw, ctx, args) }) as typeof ctx.drawImage

      drawCharacter(ctx, state, art, {}, boss, 400, 300, false,
        undefined, undefined, undefined, { image: atlas, phase })
      const actual = calls.find(call => call[0] === atlas)
      const side = 255 * (phase === 3 ? 1.24 : phase === 2 ? 1.12 : 1)
      expect(actual?.slice(5)).toEqual([-side / 2, -side + 4, side, side])
      expect(boss.r).toBe(48)
    }
  })

  it('enlarges the legacy BOSS art fallback by the same ratio without touching its hitbox', () => {
    const state = createState()
    state.W = 800
    state.H = 600
    const art = fakeArtwork(true)
    const boss: Mob = {
      x: 0, y: 0, type: 'boss', hp: 200, max: 200, r: 48, speed: 100, dmg: 10,
      phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
    }
    const { ctx } = createFakeCtx()
    const calls: unknown[][] = []
    const draw = ctx.drawImage.bind(ctx)
    ctx.drawImage = ((...args: unknown[]) => { calls.push(args); Reflect.apply(draw, ctx, args) }) as typeof ctx.drawImage

    drawCharacter(ctx, state, art, {}, boss, 400, 300)
    expect(calls.find(call => call[0] === art.boss)?.slice(1)).toEqual([-127.5, -262, 255, 266])
    expect(boss.r).toBe(48)
  })
})
