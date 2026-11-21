import { describe, expect, it } from 'vitest'
import { createState } from '../state'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { createRenderAssets, drawFrame } from './index'

describe('frame allocation behavior', () => {
  it('reuses weather gradients across steady-state frames and invalidates when scene changes', () => {
    const s = createState()
    s.W = 960
    s.H = 540
    const { ctx } = createFakeCtx()
    const original = ctx.createLinearGradient
    let gradients = 0
    ctx.createLinearGradient = (...args) => { gradients++; return original(...args) }
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    drawFrame(ctx, s, 1, assets)
    drawFrame(ctx, s, 1, assets)
    expect(gradients).toBe(1)
    s.currentScene = 1
    drawFrame(ctx, s, 1, assets)
    expect(gradients).toBe(2)
  })
})
