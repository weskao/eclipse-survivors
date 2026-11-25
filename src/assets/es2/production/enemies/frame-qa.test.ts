import { describe, expect, it } from 'vitest'
import { inspectAtlasPixels } from './frame-qa'

const pixelBuffer = () => new Uint8ClampedArray(9 * 3 * 4)
function drawPixel(pixels: Uint8ClampedArray, frame: number, x: number, y: number): void {
  pixels.set([160, 30, 60, 255], (y * 9 + frame * 3 + x) * 4)
}

describe('decoded enemy atlas QA', () => {
  it('identifies exact duplicate neighboring poses', () => {
    const pixels = pixelBuffer()
    drawPixel(pixels, 0, 1, 1)
    drawPixel(pixels, 1, 1, 1)
    drawPixel(pixels, 2, 2, 1)
    expect(inspectAtlasPixels(pixels, 9, 3, 3, 3).duplicatePairs).toEqual([[0, 1]])
  })

  it('reports frame-edge contact and empty frames without automatically approving the artwork', () => {
    const pixels = pixelBuffer()
    drawPixel(pixels, 0, 0, 1)
    drawPixel(pixels, 1, 1, 1)
    const result = inspectAtlasPixels(pixels, 9, 3, 3, 3)
    expect(result.borderRiskFrames).toEqual([0])
    expect(result.blankFrames).toEqual([2])
  })

  it('rejects incorrect frame geometry and unreadable buffers', () => {
    expect(() => inspectAtlasPixels(pixelBuffer(), 8, 3, 3, 3)).toThrow(/atlas dimensions/)
    expect(() => inspectAtlasPixels(new Uint8ClampedArray(10), 9, 3, 3, 3)).toThrow(/pixel buffer/)
  })
})
