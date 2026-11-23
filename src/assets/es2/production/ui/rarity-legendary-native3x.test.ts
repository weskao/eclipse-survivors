import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { WORLD_ART } from '../../../../game/render/es2/production-world'

const root = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))
const asset = manifest.assets.find((a: { id: string }) => a.id === 'rarity-legendary')

function webpDimensions(bytes: Buffer): number[] {
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
  return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]
}

describe('legendary rarity crystal native 3x replacement', () => {
  it('has a real transparent 3x WebP mapped to visible rarity UI', () => {
    expect(asset).toBeDefined()
    expect(asset.status).toBe('approved')
    expect(asset.width).toBeGreaterThanOrEqual(216)
    expect(asset.height).toBeGreaterThanOrEqual(216)
    expect(asset.width).toBe(asset.frameWidth)
    expect(asset.height).toBe(asset.frameHeight)
    const bytes = readFileSync(join(root, asset.path))
    expect(bytes.length).toBeLessThanOrEqual(asset.maxBytes)
    expect(webpDimensions(bytes)).toEqual([asset.width, asset.height])
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
    expect(WORLD_ART.ui['rarity-legendary']).toMatch(/rarity-legendary@3x\.webp/)
  })

  it('preserves a committed genuinely authored master and approved visual review', () => {
    const qa = asset.qa
    expect(qa.sourcePixels).toBeGreaterThanOrEqual(216)
    expect(qa.masterPath).toBe('sources/rarity-legendary-master@source.webp')
    const master = readFileSync(join(root, qa.masterPath))
    expect(webpDimensions(master)).toEqual([512, 512])
    expect(createHash('sha256').update(master).digest('hex')).toBe(qa.masterSha256)
    expect(qa.provenance).toContain('newly generated')
    expect(qa.displayMaximumPx).toBe(72)
    expect(qa.visualReview).toBe('approved')
  })
})
