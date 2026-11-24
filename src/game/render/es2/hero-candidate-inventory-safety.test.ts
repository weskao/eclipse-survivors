import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, HERO_SOUTH_RUN_DIRS, heroCandidateRect } from './hero-candidate-atlas'
import { productionHeroQAEastRect, productionHeroSouthRunRect } from './production-heroes'
import type { HeroAnimation } from '../animation'

const root = resolve(process.cwd(), 'src/assets/es2/production/heroes')
const eastManifest = JSON.parse(readFileSync(join(root, 'candidate-poses-2026-11-23.json'), 'utf8')) as {
  candidatePoseSources: Record<string, {
    file: string; webpSHA256: string; bytes: number; frames: number
    QA: string; native3x: string; runtimeApplied: boolean
  }>
}
const heroes = ['shadowblade', 'spirit-summoner', 'crimson-paladin']
const poses = ['run', 'attack', 'special']
const anim = (changes: Partial<HeroAnimation> = {}): HeroAnimation => ({
  pose: 'run', direction: 2, frame: 0, count: 10, phase: 0,
  reducedMotion: false, ...changes,
})

function webpDimensions(data: Buffer): [number, number] {
  expect(data.toString('ascii', 0, 4)).toBe('RIFF')
  expect(data.toString('ascii', 8, 12)).toBe('WEBP')
  expect(data.readUInt32LE(4) + 8).toBe(data.length)
  const kind = data.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1]
  if (kind === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff]
  if (kind === 'VP8L') return [
    1 + data[21]! + ((data[22]! & 0x3f) << 8),
    1 + (data[22]! >> 6) + (data[23]! << 2) + ((data[24]! & 0x0f) << 10),
  ]
  throw new Error('Unexpected WebP kind: ' + kind)
}

describe('ES2 all twelve candidate hero motion atlases (real assets, QA only)', () => {
  it('inventories exactly three East action clips and one South run clip per hero', () => {
    expect(HERO_CANDIDATE_ATLASES).toHaveLength(12)
    const found = new Set(HERO_CANDIDATE_ATLASES.map(c => c.hero + ':' + c.direction + ':' + c.pose))
    expect(found.size).toBe(12)
    for (const hero of heroes) {
      for (const pose of poses) expect(found.has(hero + ':E:' + pose)).toBe(true)
      expect(found.has(hero + ':S:run')).toBe(true)
    }
  })

  it('checks binary dimensions, exact manifest SHA, no duplicate files, and provisional status', () => {
    const hashes = new Set<string>()
    for (const clip of HERO_CANDIDATE_ATLASES) {
      const expected = clip.direction === 'E'
        ? eastManifest.candidatePoseSources[clip.hero + ':' + clip.pose]
        : JSON.parse(readFileSync(join(root, clip.hero,
          'candidates', HERO_SOUTH_RUN_DIRS[clip.hero], 'manifest.json'), 'utf8')) as {
            webpSHA256: string; bytes: number; frameCount: number
            status: string; native3x: string; runtimeApplied: boolean
          }
      expect(expected, clip.hero + '/' + clip.pose + '/' + clip.direction).toBeDefined()
      if (!expected) continue
      const path = resolve(root, clip.hero, 'candidates',
        clip.direction === 'E' ? 'east-2026-11-23' : HERO_SOUTH_RUN_DIRS[clip.hero],
        clip.pose + '-' + (clip.direction === 'E' ? 'east' : 'south') + '-4frames@3x.webp')
      expect(path.startsWith(root + sep)).toBe(true)
      const data = readFileSync(path)
      expect(data.length).toBe(expected.bytes)
      expect(webpDimensions(data)).toEqual([clip.cellPixels * 2, clip.cellPixels * 2])
      const sha = createHash('sha256').update(data).digest('hex')
      expect(sha).toBe(expected.webpSHA256)
      expect(hashes.has(sha)).toBe(false)
      hashes.add(sha)
      expect('QA' in expected ? expected.QA : expected.status).toBe('QA_PENDING')
      expect(expected.native3x).toBe('unverified')
      expect(expected.runtimeApplied).toBe(false)
      for (let i = 0; i < 4; i++) {
        const rect = heroCandidateRect(i, clip.cellPixels)
        expect(rect?.x).toBeGreaterThanOrEqual(0)
        expect(rect?.y).toBeGreaterThanOrEqual(0)
        expect((rect?.x ?? 9999) + clip.cellPixels).toBeLessThanOrEqual(clip.cellPixels * 2)
        expect((rect?.y ?? 9999) + clip.cellPixels).toBeLessThanOrEqual(clip.cellPixels * 2)
      }
    }
    expect(hashes.size).toBe(12)
  })

  it('rejects invalid playback clocks before sampling source rectangles', () => {
    expect(productionHeroSouthRunRect(anim({ frame: Number.NaN }))).toBeNull()
    expect(productionHeroSouthRunRect(anim({ frame: Infinity }))).toBeNull()
    expect(productionHeroQAEastRect(anim({ direction: 0, frame: Number.NaN }))).toBeNull()
    expect(productionHeroQAEastRect(anim({ direction: 0, count: Number.NaN }))).toBeNull()
    expect(productionHeroQAEastRect(anim({ direction: 0, pose: 'attack', phase: Number.NaN }))).toBeNull()
  })
})
