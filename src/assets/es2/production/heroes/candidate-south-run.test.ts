import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from '../../../../game/render/es2/hero-candidate-atlas'

const root = 'src/assets/es2/production/heroes'
const heroes = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const

describe('all three South-facing 4-frame candidates remain honest QA-only assets', () => {
  for (const hero of heroes) {
    it(`${hero}: matches its committed WebP integrity and provenance manifest`, () => {
      const dir = join(process.cwd(), root, hero, 'candidates/south-2026-11-23')
      const source = join(dir, 'run-south-4frames@3x.webp')
      const report = join(dir, 'manifest.json')
      expect(existsSync(source)).toBe(true)
      expect(existsSync(report)).toBe(true)
      const image = readFileSync(source)
      const manifest = JSON.parse(readFileSync(report, 'utf8'))
      expect(manifest.hero).toBe(hero)
      expect(manifest.pose).toBe('run')
      expect(manifest.direction).toBe('S')
      expect(manifest.frameCount).toBe(4)
      expect(manifest.atlasPixels).toEqual([1536, 1536])
      expect(manifest.outputCellPixels).toEqual([768, 768])
      expect(manifest.status).toBe('QA_PENDING')
      expect(manifest.native3x).toBe('unverified')
      expect(manifest.runtimeApplied).toBe(false)
      expect(manifest.frameQA).toHaveLength(4)
      expect(manifest.bytes).toBe(image.length)
      expect(image.toString('ascii', 0, 4)).toBe('RIFF')
      expect(image.toString('ascii', 8, 12)).toBe('WEBP')
      expect(image.readUInt32LE(4) + 8).toBe(image.length)
      expect(image.readUIntLE(24, 3) + 1).toBe(1536)
      expect(image.readUIntLE(27, 3) + 1).toBe(1536)
      expect(createHash('sha256').update(image).digest('hex')).toBe(manifest.webpSHA256)
      expect(HERO_CANDIDATE_ATLASES.some(atlas => atlas.hero === hero
        && atlas.direction === 'S' && atlas.pose === 'run' && atlas.cellPixels === 768)).toBe(true)
    })
  }

  it('samples all four candidate slots without borrowing neighboring cells', () => {
    for (let index = 0; index < 4; index++) {
      const rect = heroCandidateRect(index, 768)!
      expect(rect.x + rect.size).toBeLessThanOrEqual(1536)
      expect(rect.y + rect.size).toBeLessThanOrEqual(1536)
    }
    expect(heroCandidateRect(4, 768)).toBeNull()
  })
})
