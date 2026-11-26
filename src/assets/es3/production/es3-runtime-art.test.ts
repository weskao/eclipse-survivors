import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ES3_EPIC_TREASURE_URL, ES3_DEATH_URLS, WORLD_ART } from '../../../game/render/es2/production-world'
import type { MobType } from '../../../game/types'

const root = dirname(fileURLToPath(import.meta.url))

/** Both extended and simple lossless WebP containers may carry alpha. */
function alphaWebpDimensions(bytes: Buffer): [number, number] {
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
  const kind = bytes.toString('ascii', 8, 16)
  if (kind === 'WEBPVP8L') {
    expect(bytes[20]).toBe(0x2f)
    const bits = bytes.readUInt32LE(21)
    expect((bits >>> 28) & 1).toBe(1)
    expect(bits >>> 29).toBe(0)
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]
  }
  expect(kind).toBe('WEBPVP8X')
  expect(bytes[20]! & 0x10).toBe(0x10)
  return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]
}
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
    expect(alphaWebpDimensions(bytes)).toEqual([a.width, a.height])
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
    expect(alphaWebpDimensions(bytes)).toEqual([480, 360])
    expect([a.width, a.height, a.scale, a.alpha]).toEqual([480, 360, 3, true])
    expect(a.displayMaximumPx).toEqual([160, 120])
  })
})


describe('ES3 identity-safe native enemy candidates', () => {
  const dir = join(root, 'enemies', 'candidates')
  const candidates = readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  it('keeps the owner-uploaded slime candidate in an isolated directory', () => {
    expect(candidates).toContain('slime-death-native3x-2026-11-26')
  })
  it.each(candidates)('%s retains native source, isolated candidate status and canonical provenance', folder => {
    const base = join(dir, folder)
    const m = JSON.parse(readFileSync(join(base, 'manifest.json'), 'utf8')) as {
      id: string; path: string; sourcePath: string; sourceSize: number[]; nativeSourceCellPixels: number;
      sourceSha256: string; sha256: string; bytes: number; width: number; height: number;
      rows: number; columns: number; frames: number; frameWidth: number; frameHeight: number;
      gutter: number; contentCellPixels: number; displayMaximumPx: number; alpha: boolean;
      native3x: boolean; upscaled: boolean; status: string; visualReview: string;
      canonicalReference: { path: string; gitBlobSha: string }; frameOrder: string[]
    }
    expect(folder.startsWith(m.id + '-death-native3x-')).toBe(true)
    expect([m.status, m.visualReview]).toEqual(['QA_PENDING', 'pending'])
    expect([m.alpha, m.native3x, m.upscaled]).toEqual([true, true, false])
    const source = readFileSync(join(base, m.sourcePath))
    const bitmap = readFileSync(join(base, m.path))
    const original = readFileSync(join(root, '../../../..', m.canonicalReference.path))
    expect(createHash('sha1').update('blob ' + original.length + '\0').update(original).digest('hex')).toBe(m.canonicalReference.gitBlobSha)
    expect(createHash('sha256').update(source).digest('hex')).toBe(m.sourceSha256)
    expect(createHash('sha256').update(bitmap).digest('hex')).toBe(m.sha256)
    expect(source.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual(m.sourceSize)
    expect(m.sourceSize).toEqual([m.nativeSourceCellPixels * 2, m.nativeSourceCellPixels * 2])
    expect(m.nativeSourceCellPixels).toBeGreaterThanOrEqual(m.displayMaximumPx * 3)
    expect(m.contentCellPixels).toBeGreaterThanOrEqual(m.displayMaximumPx * 3)
    expect([m.rows, m.columns, m.frames, m.frameWidth, m.frameHeight, m.gutter, m.contentCellPixels]).toEqual([2, 2, 4, 436, 436, 8, 420])
    expect([m.width, m.height]).toEqual([872, 872])
    expect(alphaWebpDimensions(bitmap)).toEqual([m.width, m.height])
    expect(bitmap.length).toBe(m.bytes)
    expect(m.frameOrder).toHaveLength(4)
  })
})
