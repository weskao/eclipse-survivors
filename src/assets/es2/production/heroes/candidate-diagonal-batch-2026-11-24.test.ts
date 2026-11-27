import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_DIAGONAL_RUN_ATLASES } from '../../../../game/render/es2/hero-candidate-atlas'

describe('six imported diagonal run candidates', () => {
  for (const clip of HERO_DIAGONAL_RUN_ATLASES) {
    it(clip.hero + '/' + clip.direction + ' preserves original and repaired source bytes', () => {
      const dir = join(process.cwd(), 'src/assets/es2/production/heroes', clip.hero, 'candidates', clip.direction.toLowerCase() + '-2026-11-24-batch-3')
      const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
      const sha = (file: string) => createHash('sha256').update(readFileSync(join(dir, file))).digest('hex')
      expect(sha(m.originalSourceFile)).toBe(m.originalSourceSHA256)
      expect(sha(m.sourceFile)).toBe(m.sourceSHA256)
      expect(sha(m.atlasFile)).toBe(m.webpSHA256)
      for (const name of [m.originalSourceFile, m.sourceFile]) {
        const png = readFileSync(join(dir, name))
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1254,1254])
      }
      expect(m.sourceCellPixels).toEqual([627,627])
      expect(m.resampled).toBe(false)
      expect(Math.min(...m.sourceCellPixels)).toBeGreaterThanOrEqual(3 * 147)
      expect(m.atlasPixels).toEqual([1536,1536])
      expect(m.footBottoms).toEqual(clip.footBottoms)
      expect(m.frameCount).toBe(4)
      expect(new Set(m.frames.map((f: { rgbaSHA256: string }) => f.rgbaSHA256)).size).toBe(4)
      for (const f of m.frames) {
        const [x0,y0,x1,y1] = f.originalAlphaBounds
        expect(Math.min(x0,y0,627-x1,627-y1)).toBeGreaterThanOrEqual(8)
      }
      expect(m.marginRepair.maxAlphaRemoved).toBeLessThan(64)
      expect(m.status).toBe('QA_PENDING')
      expect(m.native3x).toBe('unverified')
      expect(m.runtimeApplied).toBe(false)
      expect(m.qaGameplayApplied).toBe(true)
    })
  }
})
