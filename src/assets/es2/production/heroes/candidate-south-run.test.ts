import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from '../../../game/render/es2/hero-candidate-atlas'

const dir = 'src/assets/es2/production/heroes/shadowblade/candidates/south-2026-11-23'

describe('new South-facing Shadowblade run candidate (not yet gameplay-approved)', () => {
  it('has original-image identity, four cleanly packed cells and truthful QA risk', () => {
    const file = join(process.cwd(), dir, 'run-south-4frames@3x.webp')
    const report = join(process.cwd(), dir, 'manifest.json')
    expect(existsSync(file)).toBe(true)
    expect(existsSync(report)).toBe(true)
    const image = readFileSync(file)
    const manifest = JSON.parse(readFileSync(report, 'utf8'))
    expect(manifest.hero).toBe('shadowblade')
    expect(manifest.direction).toBe('S')
    expect(manifest.frameCount).toBe(4)
    expect(manifest.atlasPixels).toEqual([1536, 1536])
    expect(manifest.outputCellPixels).toEqual([768, 768])
    expect(manifest.status).toBe('QA_PENDING')
    expect(manifest.native3x).toBe('unverified')
    expect(manifest.runtimeApplied).toBe(false)
    expect(manifest.allSourceEdgesSafe).toBe(false)
    expect(manifest.frameQA).toHaveLength(4)
    expect(manifest.frameQA.every((f: { sourceClippingRisk: boolean }) => f.sourceClippingRisk)).toBe(true)
    expect(image.toString('ascii',0,4)).toBe('RIFF')
    expect(image.toString('ascii',8,12)).toBe('WEBP')
    expect(image.readUInt32LE(4)+8).toBe(image.length)
    expect(image.readUIntLE(24,3)+1).toBe(1536)
    expect(image.readUIntLE(27,3)+1).toBe(1536)
    expect(createHash('sha256').update(image).digest('hex')).toBe(manifest.webpSHA256)
    expect(HERO_CANDIDATE_ATLASES.some(x => x.hero === 'shadowblade'
      && 'direction' in x && x.direction === 'S' && x.pose === 'run')).toBe(true)
    expect(heroCandidateRect(2,768)).toEqual({ x:0,y:768,size:768 })
  })
})
