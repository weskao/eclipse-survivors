import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('imported South candidate source integrity and honest 3x status', () => {
  for (const [hero, folder] of [
    ['shadowblade', 'south-2026-11-24-batch-2'],
    ['shadowblade', 'south-2026-11-24-margin-repair'],
    ['crimson-paladin', 'south-2026-11-24-batch-2'],
    ['spirit-summoner', 'south-2026-11-24-mist-repair'],
  ]) {
    it(`${hero}/${folder}: preserves source, SHA and independent non-resampled frames`, () => {
      const dir = join(process.cwd(), 'src/assets/es2/production/heroes', hero!, 'candidates', folder!)
      const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
      const source = readFileSync(join(dir, 'source.png'))
      const atlas = readFileSync(join(dir, 'run-south-4frames@3x.webp'))
      const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex')
      expect(sha(source)).toBe(m.sourceSHA256)
      expect(sha(atlas)).toBe(m.webpSHA256)
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([1254, 1254])
      expect(m.sourceCellPixels).toEqual([627, 627])
      expect(m.atlasPixels).toEqual([1536, 1536])
      expect(m.resampled).toBe(false)
      expect(Math.min(...m.sourceCellPixels)).toBeGreaterThanOrEqual(3 * 147)
      expect(new Set(m.frames.map((f: { rgbaSHA256: string }) => f.rgbaSHA256)).size).toBe(4)
      for (const f of m.frames) {
        const [x0,y0,x1,y1] = f.originalAlphaBounds
        expect(Math.min(x0,y0,627-x1,627-y1)).toBeGreaterThanOrEqual(8)
      }
      if (hero === 'spirit-summoner') {
        const original = readFileSync(join(dir, m.originalSourceFile))
        expect(sha(original)).toBe(m.originalSourceSHA256)
        expect(m.sourceSHA256).not.toBe(m.originalSourceSHA256)
        expect(m.footBottoms).toEqual([606, 630, 659, 629])
        expect(m.qaGameplayApplied).toBe(true)
      }
      expect(m.native3x).toBe('unverified')
      expect(m.status).toBe('QA_PENDING')
      expect(m.runtimeApplied).toBe(false)
    })
  }
})
