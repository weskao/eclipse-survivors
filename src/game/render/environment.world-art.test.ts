import { describe, expect, it, vi } from 'vitest'
import { drawWorldMarkers } from './environment'
import type { Ctx2D } from './ctx'
import type { GameState } from '../types'
import type { WorldRuntimeImages } from './es2/production-world'

const chest = { complete: true, naturalWidth: 192, naturalHeight: 192 } as HTMLImageElement
const state = {
  W: 800, H: 600, worldClock: 0, time: 0,
  events: [{ id: 1, kind: 'chest', x: 200, y: 300, expiresAt: 100 }],
  challengePoint: null,
} as unknown as GameState
function canvas() {
  const drawImage = vi.fn()
  const fillText = vi.fn()
  const ctx = {
    createRadialGradient: () => ({ addColorStop: () => {} }),
    save: () => {}, restore: () => {}, translate: () => {},
    beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    ellipse: () => {}, fillRect: () => {}, drawImage, fillText,
  } as unknown as Ctx2D
  return { ctx, drawImage, fillText }
}

describe('live world markers use the existing production treasure artwork', () => {
  it('paints the decoded chest at a native 3x-safe gameplay size instead of the diamond text glyph', () => {
    const { ctx, drawImage, fillText } = canvas()
    drawWorldMarkers(ctx, state, 0, 0, { chest } as WorldRuntimeImages)
    expect(drawImage).toHaveBeenCalledWith(chest, 176, 260, 48, 48)
    expect(fillText).not.toHaveBeenCalledWith('◆', 200, 286)
  })

  it('preserves the readable diamond fallback while the image is not decoded', () => {
    const { ctx, drawImage, fillText } = canvas()
    const loadingChest = { ...chest, complete: false } as HTMLImageElement
    drawWorldMarkers(ctx, state, 0, 0, { chest: loadingChest } as WorldRuntimeImages)
    expect(drawImage).not.toHaveBeenCalled()
    expect(fillText).toHaveBeenCalledWith('◆', 200, 286)
  })
})
