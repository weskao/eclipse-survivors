import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const manifest = JSON.parse(readFileSync(new URL('./concept-manifest.json', import.meta.url), 'utf8'))
describe('ES2 concept-art manifest', () => {
  it('does not confuse unreviewed concepts with canonical content artwork', () => {
    expect(manifest.status).toBe('concept-only')
    expect(new Set(manifest.assets.map((a: {id:string}) => a.id)).size).toBe(manifest.assets.length)
    const canonical = Object.values(manifest.canonicalContentIds).flat()
    expect(canonical).toHaveLength(24)
    expect(new Set(canonical).size).toBe(24)
  })
  it('references actual transparent WebP files with correct dimensions, checksums and bounds', () => {
    for (const art of manifest.assets as {path:string;width:number;height:number;sha256:string}[]) {
      expect(art.path).toMatch(/^concept-icons\/concept-\d{2}@3x\.webp$/)
      const uri = new URL(art.path, new URL('.', import.meta.url))
      expect(statSync(uri).size).toBeLessThan(96_000)
      const b = readFileSync(uri)
      expect(b.toString('ascii',0,4)).toBe('RIFF')
      expect(b.toString('ascii',8,12)).toBe('WEBP')
      expect(b.readUInt32LE(4) + 8).toBe(b.length)
      expect(b.toString('ascii',12,16)).toBe('VP8X')
      expect(b[20]! & 0x10).toBeTruthy()
      expect([b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1]).toEqual([art.width,art.height])
      expect(createHash('sha256').update(b).digest('hex')).toBe(art.sha256)
    }
  })
})
