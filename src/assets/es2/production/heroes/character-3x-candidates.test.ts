import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

type Atlas = {
  path: string; atlasPixels: [number, number]; sourceCellPixels: [number, number]
  outputCellPixels: [number, number]; frames: number; sha256: string
  bytes: number; native3x: boolean; qa: string
}
type Manifest = { status: string; heroes: Record<string, Record<string, Atlas>> }
const root = resolve(process.cwd(), 'src/assets/es2/production/heroes')
const manifest = JSON.parse(readFileSync(resolve(root, 'character-3x-candidates.json'), 'utf8')) as Manifest

function webpSize(data: Buffer): [number, number] {
  expect(data.toString('ascii', 0, 4)).toBe('RIFF')
  expect(data.toString('ascii', 8, 12)).toBe('WEBP')
  expect(data.readUInt32LE(4) + 8).toBe(data.length)
  const chunk = data.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1]
  if (chunk === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff]
  if (chunk === 'VP8L') return [
    1 + data[21]! + ((data[22]! & 0x3f) << 8),
    1 + (data[22]! >> 6) + (data[23]! << 2) + ((data[24]! & 0x0f) << 10),
  ]
  throw new Error('Unrecognized WebP chunk: ' + chunk)
}

describe('all nine imported real hero-animation WebPs', () => {
  it('commits exactly three independent sheets per hero with real 448px source rectangles', () => {
    expect(Object.keys(manifest.heroes).sort()).toEqual(
      ['crimson-paladin', 'shadowblade', 'spirit-summoner'])
    expect(manifest.status).toBe('QA_PENDING')
    const shaSet = new Set<string>()
    for (const [id, poses] of Object.entries(manifest.heroes)) {
      expect(Object.keys(poses).sort()).toEqual(['idle-ready', 'run-attack', 'special'])
      for (const [kind, asset] of Object.entries(poses)) {
        expect(asset.path).toBe(id + '/' + kind + '@3x.webp')
        expect(asset.outputCellPixels).toEqual([448, 448])
        expect(asset.frames).toBe(kind === 'special' ? 8 : 16)
        expect(asset.qa).toBe('QA_PENDING')
        // 3x source-quality is NOT established by resampling 313px cells.
        expect(asset.native3x).toBe(asset.sourceCellPixels.every(p => p >= 441))
        const path = resolve(root, asset.path)
        expect(path.startsWith(root + sep)).toBe(true)
        const data = readFileSync(path)
        expect(data.length).toBe(asset.bytes)
        expect(webpSize(data)).toEqual(asset.atlasPixels)
        expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256)
        expect(shaSet.has(asset.sha256), 'duplicate artwork for ' + asset.path).toBe(false)
        shaSet.add(asset.sha256)
      }
    }
    expect(shaSet.size).toBe(9)
  })
})
