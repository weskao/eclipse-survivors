import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_NORTHERN_RUN_ATLASES } from '../../../../game/render/es2/hero-candidate-atlas'

describe('batch-5 authored northern source integrity', () => {
  for (const [hero, direction] of [['shadowblade', 'N'], ['spirit-summoner', 'NE']] as const) {
    it(hero + '/' + direction + ' preserves source and output bytes and safe padded cells', () => {
      const folder = direction.toLowerCase() + '-2026-11-24-batch-5'
      const dir = join(process.cwd(), 'src/assets/es2/production/heroes', hero, 'candidates', folder)
      const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
      const src = readFileSync(join(dir, 'source.png'))
      const atlas = readFileSync(join(dir, m.atlasFile))
      const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
      expect(hash(src)).toBe(m.sourceSHA256)
      expect(hash(atlas)).toBe(m.webpSHA256)
      expect(atlas.length).toBe(m.bytes)
      expect([src.readUInt32BE(16), src.readUInt32BE(20)]).toEqual([1254, 1254])
      expect(m.sourceCellPixels).toEqual([627, 627])
      expect(m.outputCellPixels).toEqual([768, 768])
      expect(m.resampled).toBe(false)
      expect(m.frameCount).toBe(4)
      expect(new Set(m.frames.map((frame: { rgbaSHA256: string }) => frame.rgbaSHA256)).size).toBe(4)
      for (const frame of m.frames) {
        const [x0,y0,x1,y1] = frame.originalAlphaBounds
        expect(Math.min(x0,y0,627-x1,627-y1)).toBeGreaterThan(0)
        expect(frame.outputAlphaBounds).toEqual([x0+70,y0+70,x1+70,y1+70])
        expect(Math.min(x0+70,y0+70,768-x1-70,768-y1-70)).toBeGreaterThanOrEqual(8)
      }
      const clip = HERO_NORTHERN_RUN_ATLASES.find(c => c.hero === hero && c.direction === direction)
      expect(clip?.url).toContain('/' + folder + '/' + m.atlasFile)
      expect(clip?.footBottoms).toEqual(m.footBottoms)
      expect(m.status).toBe('QA_PENDING')
      expect(m.runtimeApplied).toBe(false)
      expect(m.qaGameplayApplied).toBe(true)
      expect(m.native3x).toBe('unverified')
    })
  }
})
