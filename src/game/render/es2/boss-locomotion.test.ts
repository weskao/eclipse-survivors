import { describe, expect, it } from 'vitest'
import { createState } from '../../state'
import type { Mob } from '../../types'
import { drawCharacter } from '../characters'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from '../fakes'
import { createRenderAssets } from '../index'

describe('Four boss locomotion poses reuse the authored phase artwork', () => {
  it.each(['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph'] as const)(
    '%s shows motion when chasing while preserving reduced-motion mode',
    id => {
      const state = createState()
      state.W = 800; state.H = 600
      const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
      const atlas = { complete: true, naturalWidth: 576, naturalHeight: 192 } as HTMLImageElement
      const boss: Mob = {
        x: 0, y: 0, type: 'boss', bossArtId: id, bossMoving: true, bossPhase: 1,
        hp: 200, max: 200, r: 48, speed: 100, dmg: 10,
        phase: 1.3, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
      }
      function draw(reduced: boolean) {
        const { ctx, drawn } = createFakeCtx()
        const turns: number[] = []
        ctx.rotate = angle => { turns.push(angle) }
        drawCharacter(ctx, state, assets.art, assets.sprites, boss, 400, 300, reduced,
          undefined, undefined, undefined, { image: atlas, phase: 1 })
        return { turns, drawn }
      }
      const moving = draw(false)
      expect(moving.drawn).toContain(atlas)
      expect(moving.turns).toHaveLength(1)
      expect(Math.abs(moving.turns[0]!)).toBeGreaterThan(0)
      expect(draw(true).turns).toHaveLength(0)
      boss.bossMoving = false
      expect(draw(false).turns).toHaveLength(0)
    },
  )
})
