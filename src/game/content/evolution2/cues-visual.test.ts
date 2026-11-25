import { describe, expect, it } from 'vitest'
import { createState } from '../../state'
import { createFakeCtx } from '../../render/fakes'
import { EVOLUTION2_RECIPES } from './recipes'
import { createEvolutionCueEffects } from './cues'

const readyImage = () => ({ src: '', complete: true, naturalWidth: 768, naturalHeight: 768 }) as HTMLImageElement

describe('all twelve evolution skill effects use authored game art', () => {
  it('paints each distinct transparent evolution VFX at the true camera-projected combat position', () => {
    const created: HTMLImageElement[] = []
    const effects = createEvolutionCueEffects(() => {
      const image = readyImage()
      created.push(image)
      return image
    })
    const state = createState()
    state.W = 800
    state.H = 500
    expect(effects).toHaveLength(EVOLUTION2_RECIPES.length)
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i]!
      const { ctx, calls } = createFakeCtx()
      const drawn: unknown[][] = []
      ctx.drawImage = ((...args: unknown[]) => { drawn.push(args) }) as typeof ctx.drawImage
      effect.draw(ctx, state, { id: effect.id, x: 90, y: 65, life: 0.5, max: 0.75 }, 110, 40)
      expect(drawn, effect.id).toHaveLength(1)
      expect(calls).not.toContain('stroke')
      expect(calls).not.toContain('fill')
      expect(drawn[0]![0]).toBe(created[i])
      expect(drawn[0]![1]).toBeLessThan(200)
      expect(drawn[0]![1]).toBeGreaterThan(90)
      expect(drawn[0]![2]).toBeGreaterThan(0)
      expect(created[i]!.src).toContain(EVOLUTION2_RECIPES[i]!.id.split(':')[1] + '.svg')
    }
    expect(new Set(created.map(img => img.src)).size).toBe(12)
  })

  it('creates no images, gradients, or geometry for offscreen cues and caches artwork per ability', () => {
    const created: HTMLImageElement[] = []
    const effects = createEvolutionCueEffects(() => {
      const image = readyImage(); created.push(image); return image
    })
    const state = createState()
    state.W = 800; state.H = 500
    const visible = { id: effects[0]!.id, x: 120, y: 100, life: 0.5, max: 0.75 }
    const ctx = createFakeCtx()
    effects[0]!.draw(ctx.ctx, state, { ...visible, x: 99999 }, 0, 0)
    expect(created).toHaveLength(0)
    expect(ctx.calls).not.toContain('arc')
    effects[0]!.draw(ctx.ctx, state, visible, 0, 0)
    effects[0]!.draw(ctx.ctx, state, visible, 0, 0)
    expect(created).toHaveLength(1)
  })
})
