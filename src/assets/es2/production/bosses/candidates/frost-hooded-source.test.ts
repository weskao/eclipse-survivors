import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const folder = dirname(fileURLToPath(import.meta.url))
const qa = JSON.parse(readFileSync(join(folder, 'frost-sovereign-native3x-QA.json'), 'utf8')) as {
  assetBytes: number
  assetSha256: string
  path: string
  source: {
    visualIdentity?: string
    masterCommittedToRepo: boolean
    masterSha256?: string
    masterBytes?: number
    sourceExport?: string
    processing?: {
      sourceFramePixels: number
      edgeFadePx: number
      retainedMainComponent: boolean
      upscaledFromLegacy: boolean
    }
  }
  acceptance: { humanArtApproval: string }
}

describe('Frost Sovereign hooded canonical identity candidate: immutable source provenance', () => {
  it('requires real new hooded-armor art, not the mismatched ice-queen candidate', () => {
    expect(qa.source.visualIdentity).toBe('hooded-silver-armored-frost-sovereign')
    expect(qa.source.processing).toMatchObject({
      sourceFramePixels: 724, edgeFadePx: 32,
      retainedMainComponent: true, upscaledFromLegacy: false,
    })
    expect(qa.assetSha256).toBe('60bcb8c7a0a240d571bce0f2f58c848f0097792b34af72c0210aabdee1398ba2')
    const atlas = readFileSync(join(folder, qa.path))
    expect(atlas.length).toBe(qa.assetBytes)
    expect(createHash('sha256').update(atlas).digest('hex')).toBe(qa.assetSha256)
    expect(qa.acceptance.humanArtApproval).toBe('pending')
  })

  it('preserves the full high-detail master independently of the compressed WebP atlas', () => {
    expect(qa.source.masterCommittedToRepo).toBe(true)
    expect(qa.source.sourceExport).toBe('sources/frost-sovereign-master@source.webp')
    const source = readFileSync(join(folder, qa.source.sourceExport!))
    expect(source.toString('ascii', 0, 4)).toBe('RIFF')
    expect(source.toString('ascii', 8, 12)).toBe('WEBP')
    expect(source.length).toBe(qa.source.masterBytes)
    expect(createHash('sha256').update(source).digest('hex')).toBe(qa.source.masterSha256)
    expect(qa.source.masterSha256).toBe('59278f38fa34dff431c6b6bc911d3ae2c218132f448b8a871668ee60a99e5ac1')
  })
})
