import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'

describe('Spirit Summoner South-run art candidate (staging only)', () => {
  it('imports the committed real WebP and traces its original edge risks', () => {
    const source = HERO_CANDIDATE_ATLASES.find(
      a => a.hero === 'spirit-summoner' && a.pose === 'run' && a.direction === 'S')
    expect(source?.cellPixels).toBe(768)
    const dir = resolve(process.cwd(),
      'src/assets/es2/production/heroes/spirit-summoner/candidates/south-2026-11-23')
    const webp = resolve(dir, 'run-south-4frames@3x.webp')
    const manifestPath = resolve(dir, 'manifest.json')
    expect(existsSync(webp)).toBe(true)
    expect(existsSync(manifestPath)).toBe(true)
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const bytes = readFileSync(webp)
    expect([m.hero, m.pose, m.direction]).toEqual(['spirit-summoner', 'run', 'S'])
    expect([m.frameCount, m.outputCellPixels, m.atlasPixels])
      .toEqual([4, [768, 768], [1536, 1536]])
    expect([m.status, m.runtimeApplied, m.native3x])
      .toEqual(['QA_PENDING', false, 'unverified'])
    expect(bytes.length).toBe(m.bytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.webpSHA256)
    expect(m.frameQA).toHaveLength(4)
    expect(m.allSourceEdgesSafe).toBe(m.frameQA.every(
      (frame: { sourceClippingRisk: boolean }) => !frame.sourceClippingRisk))
    for (const i of [0, 1, 2, 3])
      expect(heroCandidateRect(i, 768)).toEqual({
        x: (i % 2) * 768, y: Math.floor(i / 2) * 768, size: 768 })
  })
})
