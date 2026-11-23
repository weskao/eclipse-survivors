import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { WORLD_ART } from '../../../../game/render/es2/production-world'

const directory = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'))
const entry = manifest.assets.find((asset: { id: string }) => asset.id === 'rarity-common')

function verifyHash(file: string, expected: string): Buffer {
  const bytes = readFileSync(join(directory, file))
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
  expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected)
  return bytes
}

describe('ES2 common rarity icon: authored native 3x', () => {
  it('renders a transparent 240px local source at no more than 72 game pixels', () => {
    expect(entry).toBeDefined()
    expect(entry.path).toBe('rarity-common@3x.webp')
    expect(entry.width).toBe(240)
    expect(entry.height).toBe(240)
    expect(entry.frameWidth).toBe(240)
    expect(entry.frameHeight).toBe(240)
    expect(entry.status).toBe('needs-human-approval')
    const image = verifyHash(entry.path, entry.sha256)
    expect(image.length).toBeLessThanOrEqual(entry.maxBytes)
    expect(image.toString('ascii', 12, 16)).toBe('VP8X')
    expect(image[20]! & 0x10).toBe(0x10)
    expect([image.readUIntLE(24, 3) + 1, image.readUIntLE(27, 3) + 1]).toEqual([240, 240])
    expect(WORLD_ART.ui['rarity-common']).toMatch(/rarity-common@3x\.webp/)
  })

  it('retains independently generated 1254px master art rather than scaling a 192px icon', () => {
    expect(entry.qa?.masterPath).toBe('sources/rarity-common-master@source.webp')
    expect(entry.qa?.sourceWidth).toBe(1254)
    expect(entry.qa?.sourceHeight).toBe(1254)
    expect(entry.qa?.displayMaximumPx).toBe(72)
    expect(entry.qa?.provenance).toContain('newly generated')
    expect(entry.qa?.visualReview).toBe('pending')
    expect(entry.qa?.browserReview).toBe('pending')
    const source = verifyHash(entry.qa.masterPath, entry.qa.masterSha256)
    expect(source.toString('ascii', 12, 16)).toBe('VP8L')
    expect(source[20]).toBe(0x2f)
    const sourceWidth = 1 + source[21]! + ((source[22]! & 0x3f) << 8)
    const sourceHeight = 1 + (source[22]! >> 6) + (source[23]! << 2) + ((source[24]! & 0x0f) << 10)
    expect([sourceWidth, sourceHeight]).toEqual([1254, 1254])
    expect(entry.width).toBeGreaterThanOrEqual(entry.qa.displayMaximumPx * 3)
  })
})
