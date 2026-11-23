import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { WORLD_ART } from '../../../../game/render/es2/production-world'

const root = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
  assets: Array<{
    id: string; path: string; width: number; height: number
    frameWidth: number; frameHeight: number; sha256: string
    maxBytes: number; status: string
    qa?: {
      masterPath: string; masterSha256: string; originalSheetPixels: number
      nativeMasterPixels: number; displayMaximumPx: number
      provenance: string; visualReview: string; browserReview: string
    }
  }>
}
const ids = ['treasure-common', 'treasure-rare', 'treasure-legendary', 'treasure-cursed'] as const

function verifyWebP(path: string, width: number, height: number, hash: string): number {
  const bytes = readFileSync(join(root, path))
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
  expect(bytes[20]! & 0x10).toBe(0x10) // Alpha is present.
  expect([bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]).toEqual([width, height])
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
  return bytes.length
}

describe('four distinct treasure icons — native 3x source and active UI mapping', () => {
  it.each(ids)('%s uses genuine transparent 3x art with owner-approved visual review', id => {
    const entry = manifest.assets.find(asset => asset.id === id)
    expect(entry).toBeDefined()
    expect(entry!.status).toBe('approved')
    expect(entry!.width).toBe(240)
    expect(entry!.height).toBe(240)
    expect(entry!.frameWidth).toBe(entry!.width)
    expect(entry!.frameHeight).toBe(entry!.height)
    expect(entry!.qa?.displayMaximumPx).toBe(72)
    expect(entry!.width).toBeGreaterThanOrEqual(entry!.qa!.displayMaximumPx * 3)
    expect(entry!.qa?.nativeMasterPixels).toBe(627)
    expect(entry!.qa?.originalSheetPixels).toBe(1254)
    expect(entry!.qa?.masterPath).toBe(`sources/${id}-master@source.webp`)
    expect(entry!.qa?.provenance).toContain('newly generated')
    expect(entry!.qa?.visualReview).toBe('approved')
    expect(entry!.qa?.browserReview).toBe('pending')
    expect(verifyWebP(entry!.path, 240, 240, entry!.sha256)).toBeLessThanOrEqual(entry!.maxBytes)
    verifyWebP(entry!.qa!.masterPath, 627, 627, entry!.qa!.masterSha256)
    expect(WORLD_ART.ui[id]).toContain(id + '@3x.webp')
  })
})
