import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCTION_HERO_MOTION_SOURCES, PRODUCTION_HERO_SOURCES } from '../../../game/render/es2/production-heroes'

interface MotionManifest {
  frameSize: number
  cols: number
  rows: number
  dimensions: [number, number]
  nativeSourceFramePixels: [number, number]
  native3x: boolean
  review: { status: string }
  characters: Record<string, { bytes: number; native3x: boolean; status: string }>
}

const manifest = JSON.parse(readFileSync(join(process.cwd(),
  'src/assets/es2/production/heroes/8dir-motion-manifest.json'), 'utf8')) as MotionManifest

describe('ES2 3x character source quality gate', () => {
  it('makes interpolation visible instead of mislabeling older nominal-size frames as native 3x', () => {
    expect(manifest.nativeSourceFramePixels).toEqual([198, 198])
    expect(manifest.native3x).toBe(false)
    expect(manifest.review.status).not.toBe('APPROVED')
    expect(manifest.frameSize).toBe(384)
    expect(manifest.dimensions).toEqual([manifest.cols * 384, manifest.rows * 384])
    for (const id of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
      expect(manifest.characters[id]?.native3x, id).toBe(false)
      expect(manifest.characters[id]?.status, id).toBe('QA_PENDING')
      expect(PRODUCTION_HERO_SOURCES[id as keyof typeof PRODUCTION_HERO_SOURCES]).toContain(id + '-portrait@3x.webp')
      expect(PRODUCTION_HERO_MOTION_SOURCES[id as keyof typeof PRODUCTION_HERO_MOTION_SOURCES]).toContain(id + '-8dir-motion@3x.webp')
    }
  })
})
