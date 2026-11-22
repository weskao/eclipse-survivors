import { describe, expect, it } from 'vitest'
import { createState } from '../state'
import { drawNumbers } from './effects'
import { createFakeCtx, fakeCanvasFactory } from './fakes'

describe('damage number raster cache', () => {
  it('reuses one stroked glyph image for repeated damage values across frames', () => {
    const state = createState()
    state.W = 960; state.H = 540
    state.numberFx = Array.from({ length: 48 }, (_, i) => ({
      x: 10 + i * 13, y: 110 + (i % 8) * 40, life: 0.3, value: 76, boss: false,
    }))
    const { make, made } = fakeCanvasFactory()
    const cache = { makeCanvas: make, labels: new Map() }
    const frame = createFakeCtx()
    drawNumbers(frame.ctx, state, 0, 0, cache)
    expect(made).toHaveLength(1)
    expect(frame.calls.filter(name => name === 'drawImage')).toHaveLength(48)
    expect(frame.calls).not.toContain('strokeText')
    expect(made[0]!.fake.calls.filter(name => name === 'strokeText')).toHaveLength(1)
    drawNumbers(frame.ctx, state, 0, 0, cache)
    expect(made).toHaveLength(1)
    expect(frame.calls.filter(name => name === 'drawImage')).toHaveLength(96)
    state.numberFx = [{ x: 80, y: 100, life: .3, value: 76, boss: true }]
    drawNumbers(frame.ctx, state, 0, 0, cache)
    expect(made).toHaveLength(2) // Boss styling has its own glyph.
  })

  it('caps cached damage values during long endless sessions', () => {
    const state = createState()
    state.W = 960; state.H = 540
    const { make } = fakeCanvasFactory()
    const cache = { makeCanvas: make, labels: new Map() }
    const frame = createFakeCtx()
    for (let i = 0; i < 180; i++) {
      state.numberFx = [{ x: 100, y: 100, life: .3, value: i, boss: false }]
      drawNumbers(frame.ctx, state, 0, 0, cache)
    }
    expect(cache.labels.size).toBeLessThanOrEqual(96)
  })
})
