import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
  assets: { id: string; path: string; alpha: boolean; nativeSourceSide?: number }[]
}

describe('ES2 production UI WebP alpha-bit preflight', () => {
  it('advertises a real alpha-capable WebP extended header for every one of the 17 assets', () => {
    expect(manifest.assets).toHaveLength(17)
    expect(new Set(manifest.assets.map(asset => asset.id)).size).toBe(17)
    for (const asset of manifest.assets) {
      if (['rarity-rare', 'rarity-legendary', 'hud-xp'].includes(asset.id)) {
        expect(asset.nativeSourceSide, asset.id).toBeGreaterThanOrEqual(192)
      }
      expect(asset.alpha, asset.id).toBe(true)
      const bytes = readFileSync(join(root, asset.path))
      expect(bytes.toString('ascii', 0, 4), asset.id).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12), asset.id).toBe('WEBP')
      expect(bytes.toString('ascii', 12, 16), asset.id).toBe('VP8X')
      // VP8X feature byte alpha flag. Pixel-alpha bounds require separate visual/decode QA.
      expect((bytes[20] & 0x10) !== 0, asset.id).toBe(true)
    }
  })
})
