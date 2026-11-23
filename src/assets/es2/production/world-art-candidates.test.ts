import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ArtEntry {
  id: string; path: string; width: number; height: number; frames: number
  columns: number; rows: number; frameWidth: number; frameHeight: number
  alpha: boolean; sha256: string; maxBytes: number; status: string
  humanApproval?: { status: string; confirmedBy: string; confirmedOn: string; scope: string; evidence: string }
}
interface ArtManifest { status: string; category: string; assets: ArtEntry[] }
const root = dirname(fileURLToPath(import.meta.url))
const expected = { enemies: 20, bosses: 4, biomes: 8, ui: 17 } as const

function readDimensions(data: Buffer): [number, number] {
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP')
    throw new Error('Not a WebP RIFF container')
  if (data.readUInt32LE(4) + 8 !== data.length) throw new Error('RIFF byte count mismatch')
  const type = data.toString('ascii', 12, 16)
  if (type === 'VP8X') {
    return [1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3)]
  }
  if (type === 'VP8 ') {
    if (data.toString('hex', 23, 26) !== '9d012a') throw new Error('Invalid VP8 start code')
    return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff]
  }
  throw new Error('Unsupported WebP chunk: ' + type)
}

describe('ES2 world art - blocking candidate asset integrity', () => {
  it('contains all 49 unique authored world-art WebPs with exact dimensions and hashes', () => {
    const seen = new Set<string>()
    let total = 0
    for (const [category, count] of Object.entries(expected)) {
      const manifestPath = join(root, category, 'manifest.json')
      expect(existsSync(manifestPath), `Missing manifest ${category}`).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ArtManifest
      expect(manifest.category).toBe(category)
      // Explicit project-owner approvals exist only for UI 17 and Biomes 8; enemies/bosses retain their blocking gate.
      expect(manifest.status).toBe(category === 'ui' || category === 'biomes' ? 'approved' : 'visual-review-required')
      expect(manifest.assets).toHaveLength(count)
      for (const asset of manifest.assets) {
        expect(asset.status).toBe(category === 'ui' || category === 'biomes' ? 'approved' : 'needs-human-approval')
        if (category === 'ui' || category === 'biomes') {
          expect(asset.humanApproval, asset.id).toEqual({
            status: 'approved', confirmedBy: 'project-owner',
            confirmedOn: '2026-11-24', scope: 'visual-art', evidence: 'explicit-user-confirmation',
          })
        }
        expect(seen.has(`${category}:${asset.id}`)).toBe(false)
        seen.add(`${category}:${asset.id}`)
        expect(asset.path).toMatch(/^[a-z0-9-]+(?:-(?:body|telegraph|phases|ground|decor))?@3x\.webp$/)
        const path = resolve(root, category, asset.path)
        expect(path.startsWith(resolve(root, category) + '/')).toBe(true)
        expect(existsSync(path), `Missing candidate WebP ${path}`).toBe(true)
        const bytes = readFileSync(path)
        expect(bytes.length).toBeLessThanOrEqual(asset.maxBytes)
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
        expect(readDimensions(bytes)).toEqual([asset.width, asset.height])
        expect(asset.width).toBe(asset.columns * asset.frameWidth)
        expect(asset.height).toBe(asset.rows * asset.frameHeight)
        expect(asset.frames).toBe(asset.columns * asset.rows)
        total++
      }
    }
    expect(total).toBe(49)
  })
})
