import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const base = resolve(process.cwd(), 'src/assets/es2')
const manifest = JSON.parse(readFileSync(join(base, 'concept-manifest.json'), 'utf8')) as {
  status: string
  scale: number
  designUnit: number
  atlas: { path: string; width: number; height: number; cellWidth: number; cellHeight: number; columns: number; rows: number }
  assets: { id: string; role: string; path: string; width: number; height: number; sha256: string }[]
  canonicalContentIds: Record<string, string[]>
}

function inspectWebp(path: string, maxBytes: number) {
  const file = join(base, path)
  const bytes = readFileSync(file)
  expect(statSync(file).size).toBeLessThanOrEqual(maxBytes)
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
  expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
  expect(bytes[20]! & 0x10).toBeTruthy() // declared alpha feature
  return {
    width: bytes.readUIntLE(24, 3) + 1,
    height: bytes.readUIntLE(27, 3) + 1,
    hash: createHash('sha256').update(bytes).digest('hex'),
  }
}

describe('ES2 original concept-art inventory', () => {
  it('keeps concept assets explicitly separate from approved canonical-content artwork', () => {
    expect(manifest.status).toBe('concept-only')
    const canonical = Object.values(manifest.canonicalContentIds).flat()
    expect(canonical).toHaveLength(24)
    expect(new Set(canonical).size).toBe(24)
    expect(manifest.assets).toHaveLength(24)
    expect(new Set(manifest.assets.map(a => a.id)).size).toBe(24)
    for (const asset of manifest.assets) {
      expect(asset.role).toBe('concept-only')
      expect(asset.id).toMatch(/^es2-art:concept-\d{2}$/)
    }
  })

  it('references only existing, bounded, correctly sized transparent WebP images', () => {
    for (const asset of manifest.assets) {
      expect(asset.path).toMatch(/^concept-icons\/concept-\d{2}@3x\.webp$/)
      const actual = inspectWebp(asset.path, 96_000)
      expect(actual.width).toBe(asset.width)
      expect(actual.height).toBe(asset.height)
      expect(actual.hash).toBe(asset.sha256)
    }
  })

  it('uses a geometrically valid 3x atlas', () => {
    const a = manifest.atlas
    expect(manifest.scale).toBe(3)
    expect(a.width).toBe(a.columns * a.cellWidth)
    expect(a.height).toBe(a.rows * a.cellHeight)
    expect(a.cellWidth).toBe(manifest.designUnit * manifest.scale)
    expect(a.cellHeight).toBe(manifest.designUnit * manifest.scale)
    expect(a.columns * a.rows).toBe(manifest.assets.length)
    const actual = inspectWebp(a.path, 256_000)
    expect([actual.width, actual.height]).toEqual([a.width, a.height])
  })
})
