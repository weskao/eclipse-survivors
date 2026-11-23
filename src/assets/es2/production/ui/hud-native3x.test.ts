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
    frameWidth: number; frameHeight: number; maxBytes: number
    sha256: string; status: string
    qa?: { masterPath: string; masterSha256: string
      sourceWidth: number; sourceHeight: number; displayMaximumPx: number
      provenance: string; visualReview: string; browserReview: string }
  }>
}
const ids = ['hud-health', 'hud-xp', 'hud-cooldown', 'hud-quest'] as const

function assertWebP(path: string, expectedWidth: number, expectedHeight: number, hash: string): number {
  const image = readFileSync(join(root, path))
  expect(image.toString('ascii', 0, 4)).toBe('RIFF')
  expect(image.readUInt32LE(4) + 8).toBe(image.byteLength)
  expect(image.toString('ascii', 8, 12)).toBe('WEBP')
  expect(image.toString('ascii', 12, 16)).toBe('VP8X')
  expect(image[20]! & 0x10).toBe(0x10) // Has transparent alpha channel.
  expect([image.readUIntLE(24, 3) + 1, image.readUIntLE(27, 3) + 1])
    .toEqual([expectedWidth, expectedHeight])
  expect(createHash('sha256').update(image).digest('hex')).toBe(hash)
  return image.byteLength
}

describe('ES2 HUD image-first native-3x production assets', () => {
  it.each(ids)('%s has a unique authored source and visible canonical UI wiring', id => {
    const entry = manifest.assets.find(asset => asset.id === id)
    expect(entry).toBeDefined()
    expect(entry!.status).toBe('needs-human-approval')
    expect([entry!.width, entry!.height, entry!.frameWidth, entry!.frameHeight])
      .toEqual([240, 240, 240, 240])
    expect(entry!.width).toBeGreaterThanOrEqual(3 * entry!.qa!.displayMaximumPx)
    expect(entry!.qa!.displayMaximumPx).toBe(72)
    expect(entry!.qa!.sourceWidth).toBe(627)
    expect(entry!.qa!.sourceHeight).toBe(627)
    expect(entry!.qa!.masterPath).toBe(`sources/${id}-master@source.webp`)
    expect(entry!.qa!.provenance).toContain('newly generated')
    expect(entry!.qa!.visualReview).toBe('pending')
    expect(entry!.qa!.browserReview).toBe('pending')
    expect(assertWebP(entry!.path, 240, 240, entry!.sha256)).toBeLessThan(entry!.maxBytes)
    assertWebP(entry!.qa!.masterPath, 627, 627, entry!.qa!.masterSha256)
    expect(WORLD_ART.ui[id]).toContain(`${id}@3x.webp`)
  })
})
