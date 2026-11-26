import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ES3_EPIC_TREASURE_URL, ES3_DEATH_URLS, WORLD_ART } from '../../../game/render/es2/production-world'
import type { MobType } from '../../../game/types'

const root = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
  status: string
  assets: Array<{ id: string; path: string; width: number; height: number; rows: number; columns: number; frames: number; frameWidth: number; frameHeight: number; gutter: number; contentCellPixels: number; nativeSourceCellPixels: number; displayMaximumPx: number; sha256: string; bytes: number; maxBytes: number; status: string }>
}

describe('ES3 imported runtime art', () => {
  it('contains exactly the six supplied assets with independent epic art and a live enemy mapping', () => {
    expect(manifest.assets.map(a => a.id).sort()).toEqual(['bat', 'goblin', 'golem', 'slime', 'treasure-epic', 'warlock'])
    expect(ES3_EPIC_TREASURE_URL).toContain('treasure-epic@3x.webp')
    expect(ES3_EPIC_TREASURE_URL).not.toBe(WORLD_ART.ui['treasure-rare'])
    expect(Object.keys(ES3_DEATH_URLS).sort()).toEqual(['bat', 'goblin', 'golem', 'slime', 'warlock'])
    for (const a of manifest.assets) {
      if (a.id !== 'treasure-epic') expect(ES3_DEATH_URLS[a.id as MobType]).toContain(a.path.split('/').at(-1))
    }
  })
  it.each(manifest.assets)('$id has genuine source resolution, fixed geometry, bounded bytes and alpha', a => {
    const bytes = readFileSync(join(root, a.path))
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
    expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
    expect(bytes.toString('ascii', 8, 16)).toBe('WEBPVP8X')
    expect(bytes[20]! & 0x10).toBe(0x10)
    expect([bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]).toEqual([a.width, a.height])
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256)
    expect(bytes.length).toBe(a.bytes)
    expect(bytes.length).toBeLessThanOrEqual(a.maxBytes)
    expect(a.nativeSourceCellPixels).toBeGreaterThanOrEqual(a.displayMaximumPx * 3)
    expect(a.contentCellPixels).toBeGreaterThanOrEqual(a.displayMaximumPx * 3)
    expect([a.columns * a.frameWidth, a.rows * a.frameHeight, a.columns * a.rows]).toEqual([a.width, a.height, a.frames])
    expect(a.frameWidth - 2 * a.gutter).toBe(a.contentCellPixels)
    expect(a.frameHeight - 2 * a.gutter).toBe(a.contentCellPixels)
  })
})


describe('ES3 uploaded native contact textures', () => {
  const dir = join(root, 'combat')
  const combat = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
    assets: Array<{ id: string; path: string; width: number; height: number; alpha: boolean; scale: number; displayMaximumPx: number[]; source: string; sourceSha256: string; sha256: string; bytes: number }>
  }
  it('contains one independent texture for each of the six routed contact variants', () => {
    expect(combat.assets.map(a => a.id).sort()).toEqual(['critical', 'elemental', 'evolved', 'heavy', 'hero', 'normal'])
    expect(new Set(combat.assets.map(a => a.sha256)).size).toBe(6)
  })
  it.each(combat.assets)('$id has matching vector provenance, native dimensions and WebP alpha', a => {
    expect(a.path).toBe('hit-' + a.id + '@3x.webp')
    const bytes = readFileSync(join(dir, a.path))
    const source = readFileSync(join(root, '../../../..', a.source))
    expect(createHash('sha256').update(source).digest('hex')).toBe(a.sourceSha256)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256)
    expect(bytes.length).toBe(a.bytes)
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
    expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
    expect(bytes.toString('ascii', 8, 16)).toBe('WEBPVP8X')
    expect(bytes[20]! & 0x10).toBe(0x10)
    expect([bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]).toEqual([480, 360])
    expect([a.width, a.height, a.scale, a.alpha]).toEqual([480, 360, 3, true])
    expect(a.displayMaximumPx).toEqual([160, 120])
  })
})
