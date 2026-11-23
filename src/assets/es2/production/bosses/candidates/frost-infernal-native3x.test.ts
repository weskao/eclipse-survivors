import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const ids = ['frost-sovereign', 'infernal-titan'] as const

interface CandidateQA {
  candidateFor: string
  status: string
  path: string
  assetSha256: string
  assetBytes: number
  maxBytes: number
  atlas: {
    width: number; height: number; frames: number; columns: number; rows: number
    cellWidth: number; cellHeight: number; transparentGutterPx: number
    sourceRect: { insetX: number; insetY: number; width: number; height: number }
  }
  source: { originalGeneratedFramePixels: number; upscaledFromExisting192px: boolean; masterCommittedToRepo: boolean; masterFile: string; masterBytes: number; masterSha256: string }
  runtimeTarget: { maxDrawPx: number; requiredNativeSourceDetailPx: number; active: boolean }
  acceptance: { humanArtApproval: string; inGame1xScreenshot: string }
}

describe('Frost Sovereign / Infernal Titan unapproved 3x candidate integrity', () => {
  for (const id of ids) {
    it(id + ': requires actual native-detail frame bytes and safe gutters', () => {
      const qa = JSON.parse(readFileSync(join(dir, id + '-native3x-QA.json'), 'utf8')) as CandidateQA
      const bytes = readFileSync(join(dir, qa.path))
      expect(qa.candidateFor).toBe(id)
      expect(qa.status).toBe('QA_PENDING')
      expect(qa.runtimeTarget.active).toBe(false)
      expect(qa.source.upscaledFromExisting192px).toBe(false)
      expect(qa.acceptance.humanArtApproval).toBe('pending')
      expect(qa.acceptance.inGame1xScreenshot).toBe('pending')
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
      const a = qa.atlas, r = qa.runtimeTarget, inset = a.sourceRect
      expect(a.frames).toBe(3)
      expect(a.width).toBe(a.columns * a.cellWidth)
      expect(a.height).toBe(a.rows * a.cellHeight)
      expect(r.requiredNativeSourceDetailPx).toBe(3 * r.maxDrawPx)
      expect(qa.source.originalGeneratedFramePixels).toBeGreaterThanOrEqual(r.requiredNativeSourceDetailPx)
      expect(qa.source.masterCommittedToRepo).toBe(true)
      const master = readFileSync(join(dir, qa.source.masterFile))
      expect(master.length).toBe(qa.source.masterBytes)
      expect(createHash('sha256').update(master).digest('hex')).toBe(qa.source.masterSha256)
      expect(inset.width).toBe(qa.source.originalGeneratedFramePixels)
      expect(inset.height).toBe(qa.source.originalGeneratedFramePixels)
      expect(inset.insetX).toBeGreaterThanOrEqual(a.transparentGutterPx)
      expect(inset.insetY).toBeGreaterThanOrEqual(a.transparentGutterPx)
      for (let frame = 0; frame < 3; frame++) {
        const x = frame * a.cellWidth + inset.insetX
        expect(x).toBeGreaterThanOrEqual(frame * a.cellWidth + a.transparentGutterPx)
        expect(x + inset.width).toBeLessThanOrEqual((frame + 1) * a.cellWidth - a.transparentGutterPx)
      }
      expect(inset.insetY + inset.height).toBeLessThanOrEqual(a.cellHeight - a.transparentGutterPx)
    })
  }
})
