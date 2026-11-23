import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const qa = JSON.parse(readFileSync(join(dir, 'abyss-monarch-native3x-QA.json'), 'utf8')) as {
  candidateFor: string
  status: string
  path: string
  assetBytes: number
  assetSha256: string
  maxBytes: number
  atlas: {
    width: number; height: number; frames: number; columns: number; rows: number
    cellWidth: number; cellHeight: number; transparentGutterPx: number
    sourceRect: { insetX: number; insetY: number; width: number; height: number }
  }
  source: { drawnFramePixels: number; upscaledFromExisting192px: boolean; masterCommittedToRepo: boolean; masterFile: string; masterBytes: number; masterSha256: string; originalGeneratedSheetPixels: { width: number; height: number } }
  runtimeTarget: { maxDrawPx: number; requiredNativeSourceDetailPx: number; active: boolean }
  acceptance: { humanArtApproval: string; inGame1xScreenshot: string }
}

describe('ES2 bosses: native-detail Abyss Monarch candidate (NOT approved)', () => {
  it('keeps the new visual candidate isolated from the currently approved runtime paths', () => {
    expect(qa.candidateFor).toBe('abyss-monarch')
    expect(qa.status).toBe('QA_PENDING')
    expect(qa.runtimeTarget.active).toBe(false)
    expect(qa.acceptance.humanArtApproval).toBe('pending')
    expect(qa.acceptance.inGame1xScreenshot).toBe('pending')
    expect(qa.source.upscaledFromExisting192px).toBe(false)
  })

  it('retains the original authored PNG master instead of an upscaled 192px sprite', () => {
    expect(qa.source.masterCommittedToRepo).toBe(true)
    expect(qa.source.masterFile).toMatch(/^[a-z0-9-]+\.png$/)
    const path = join(dir, qa.source.masterFile)
    expect(existsSync(path), 'Missing full-resolution PNG source master').toBe(true)
    const bytes = readFileSync(path)
    expect(bytes.length).toBe(qa.source.masterBytes)
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(bytes.readUInt32BE(16)).toBe(qa.source.originalGeneratedSheetPixels.width)
    expect(bytes.readUInt32BE(20)).toBe(qa.source.originalGeneratedSheetPixels.height)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(qa.source.masterSha256)
    expect(qa.source.drawnFramePixels * 3).toBe(qa.source.originalGeneratedSheetPixels.width)
    expect(qa.source.drawnFramePixels).toBe(qa.source.originalGeneratedSheetPixels.height)
  })

  it('has exact WebP bytes, alpha, dimensions, SHA-256 and budget', () => {
    expect(qa.path).toMatch(/^[a-z0-9-]+\.webp$/i)
    const bytes = readFileSync(join(dir, qa.path))
    expect(bytes.length).toBe(qa.assetBytes)
    expect(bytes.length).toBeLessThanOrEqual(qa.maxBytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(qa.assetSha256)
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
    expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
    expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
    expect(bytes[20]! & 0x10).toBe(0x10)
    expect(bytes.readUIntLE(24, 3) + 1).toBe(qa.atlas.width)
    expect(bytes.readUIntLE(27, 3) + 1).toBe(qa.atlas.height)
  })

  it('defines three independent phase source rectangles with honest 3x source pixels', () => {
    const { atlas: a, runtimeTarget: r } = qa
    expect(a.frames).toBe(3)
    expect(a.columns * a.rows).toBe(a.frames)
    expect(a.width).toBe(a.columns * a.cellWidth)
    expect(a.height).toBe(a.rows * a.cellHeight)
    expect(r.requiredNativeSourceDetailPx).toBe(Math.ceil(3 * r.maxDrawPx))
    expect(qa.source.drawnFramePixels).toBeGreaterThanOrEqual(r.requiredNativeSourceDetailPx)
    expect(a.sourceRect.width).toBe(qa.source.drawnFramePixels)
    expect(a.sourceRect.height).toBe(qa.source.drawnFramePixels)
    expect(a.sourceRect.insetX).toBeGreaterThanOrEqual(a.transparentGutterPx)
    expect(a.sourceRect.insetY).toBeGreaterThanOrEqual(a.transparentGutterPx)
    expect(a.sourceRect.insetX + a.sourceRect.width + a.transparentGutterPx).toBeLessThanOrEqual(a.cellWidth)
    expect(a.sourceRect.insetY + a.sourceRect.height + a.transparentGutterPx).toBeLessThanOrEqual(a.cellHeight)
    for (let phase = 0; phase < a.frames; phase++) {
      const sourceX = phase * a.cellWidth + a.sourceRect.insetX
      expect(sourceX).toBeGreaterThanOrEqual(phase * a.cellWidth + a.transparentGutterPx)
      expect(sourceX + a.sourceRect.width).toBeLessThanOrEqual((phase + 1) * a.cellWidth - a.transparentGutterPx)
    }
  })
})
