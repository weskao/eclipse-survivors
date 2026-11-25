import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'

const root = resolve(process.cwd(),
  'src/assets/es2/production/heroes/crimson-paladin/candidates/south-2026-11-23')
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')

describe('Crimson Paladin South-run source art (candidate QA only)', () => {
  it('keeps real committed source/WebP bytes, 2x2 cells, and SHA provenance', () => {
    const source = HERO_CANDIDATE_ATLASES.find(
      a => a.hero === 'crimson-paladin' && a.pose === 'run' && a.direction === 'S')
    expect(source?.cellPixels).toBe(768)

    const m = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
    const png = readFileSync(resolve(root, 'source-south-4frames.png'))
    const webp = readFileSync(resolve(root, 'run-south-4frames@3x.webp'))
    expect([m.hero, m.pose, m.direction, m.frameCount])
      .toEqual(['crimson-paladin', 'run', 'S', 4])
    expect([m.status, m.runtimeApplied, m.native3x])
      .toEqual(['QA_PENDING', false, 'unverified'])
    expect([m.sourceOriginalPixels, m.sourceCellPixels, m.atlasPixels, m.outputCellPixels])
      .toEqual([[1254, 1254], [627, 627], [1536, 1536], [768, 768]])
    expect(hash(png)).toBe(m.sourceSHA256)
    expect(hash(webp)).toBe(m.webpSHA256)
    expect(webp.length).toBe(m.bytes)

    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1254, 1254])
    expect(webp.toString('ascii', 0, 4)).toBe('RIFF')
    expect(webp.toString('ascii', 8, 16)).toBe('WEBPVP8X')
    expect(webp.readUIntLE(24, 3) + 1).toBe(1536)
    expect(webp.readUIntLE(27, 3) + 1).toBe(1536)
    expect(webp.readUInt32LE(4) + 8).toBe(webp.length)

    expect(m.frameQA).toHaveLength(4)
    expect(m.allVisibleSourceEdgesSafeAtAlphaGt8).toBe(true)
    for (let i = 0; i < 4; i++) {
      const frame = m.frameQA[i]
      expect(frame.index).toBe(i)
      expect(frame.sourceVisibleBorderTouch).toBe(false)
      expect(frame.sourceVisualMarginMinPx).toBeGreaterThanOrEqual(10)
      expect(frame.outputVisualMarginMinPx).toBeGreaterThanOrEqual(60)
      expect(heroCandidateRect(i, 768)).toEqual({
        x: (i % 2) * 768, y: Math.floor(i / 2) * 768, size: 768,
      })
    }
    expect(heroCandidateRect(4, 768)).toBeNull()
  })
})
