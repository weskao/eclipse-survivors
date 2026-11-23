import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const qa = JSON.parse(readFileSync(join(dir, 'eclipse-seraph-native3x-QA.json'), 'utf8'))

describe('Eclipse Seraph 3x review candidate: safe source/atlas contract', () => {
  it('keeps the authored 3 phase candidate isolated until visual sign-off', () => {
    expect(qa.candidateFor).toBe('eclipse-seraph')
    expect(qa.status).toBe('QA_PENDING')
    expect(qa.runtimeTarget.active).toBe(false)
    expect(qa.acceptance.humanArtApproval).toBe('pending')
    expect(qa.acceptance.inGame1xScreenshot).toBe('pending')
    expect(qa.source.upscaledFromExisting192px).toBe(false)
  })

  it('verifies the transparent WebP bytes, full dimensions and exact safe phase rectangles', () => {
    const a = qa.atlas
    const bytes = readFileSync(join(dir, qa.path))
    expect(bytes.length).toBe(qa.assetBytes)
    expect(bytes.length).toBeLessThanOrEqual(qa.maxBytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(qa.assetSha256)
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
    expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
    expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
    expect(bytes[20]! & 0x10).toBe(0x10)
    expect(bytes.readUIntLE(24, 3) + 1).toBe(a.width)
    expect(bytes.readUIntLE(27, 3) + 1).toBe(a.height)
    expect(a.frames).toBe(3)
    expect(a.width).toBe(a.columns * a.cellWidth)
    expect(a.height).toBe(a.rows * a.cellHeight)
    expect(a.sourceRect.width).toBe(724)
    expect(a.sourceRect.height).toBe(724)
    expect(qa.runtimeTarget.requiredNativeSourceDetailPx).toBe(3 * qa.runtimeTarget.maxDrawPx)
    expect(a.sourceRect.width).toBeGreaterThanOrEqual(qa.runtimeTarget.requiredNativeSourceDetailPx)
    for (let phase = 0; phase < 3; phase++) {
      const sourceX = phase * a.cellWidth + a.sourceRect.insetX
      expect(sourceX).toBeGreaterThanOrEqual(phase * a.cellWidth + a.transparentGutterPx)
      expect(sourceX + a.sourceRect.width).toBeLessThanOrEqual((phase + 1) * a.cellWidth - a.transparentGutterPx)
      expect(a.sourceRect.insetY).toBeGreaterThanOrEqual(a.transparentGutterPx)
      expect(a.sourceRect.insetY + a.sourceRect.height).toBeLessThanOrEqual(a.cellHeight - a.transparentGutterPx)
    }
  })

  it('keeps the original generated high-detail master with a verified checksum', () => {
    expect(qa.source.masterCommittedToRepo).toBe(true)
    expect(qa.source.originalGeneratedFramePixels).toBeGreaterThanOrEqual(708)
    const master = readFileSync(join(dir, qa.source.masterFile))
    expect(master.length).toBe(qa.source.masterBytes)
    expect(createHash('sha256').update(master).digest('hex')).toBe(qa.source.masterSha256)
    expect(master.toString('ascii', 0, 4)).toBe('RIFF')
    expect(master.toString('ascii', 8, 12)).toBe('WEBP')
  })
})
