import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'
import manifest from './manifest.json'

const root = dirname(fileURLToPath(import.meta.url))
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe('Crystal Sentinel native 3x enemy atlas and source provenance', () => {
  it('requires a six-pose 324px sprite strip at the actual 108px Canvas display size', () => {
    const entry = manifest.assets.find(asset => asset.id === 'crystal-sentinel')
    expect(entry).toMatchObject({
      path: 'crystal-sentinel-body@3x.webp',
      width: 1944, height: 324, frameWidth: 324, frameHeight: 324,
      frames: 6, columns: 6, rows: 1,
      native3x: true, alpha: true, status: 'needs-human-approval',
      sourceMaster: 'masters/crystal-sentinel-6poses-3x2-master-1536x1024.png',
      sourceMasterWidth: 1536, sourceMasterHeight: 1024,
      sourceMasterFrameWidth: 512, sourceMasterFrameHeight: 512,
      sourceMasterSha256: 'bc93866daa95ab1e5e63db904b2b87ab587c12c52f9a9bda9d5fcf815cfb5556',
    })
    const drawSize = Math.max(70, ENEMY_DEFINITIONS['crystal-sentinel'].radius * 4)
    expect(entry!.frameWidth).toBeGreaterThanOrEqual(drawSize * 3)
    const webp = readFileSync(join(root, entry!.path))
    expect(webp.length).toBeLessThanOrEqual(entry!.maxBytes)
    expect(webp.toString('ascii', 0, 4)).toBe('RIFF')
    expect(webp.toString('ascii', 8, 12)).toBe('WEBP')
    expect(webp.readUInt32LE(4) + 8).toBe(webp.length)
    expect(sha256(webp)).toBe('209753a63bc993ed19678ee3b760188b69225f93ccd456cebaa9530d71b2dc82')
    expect(sha256(webp)).toBe(entry!.sha256)
  })

  it('keeps the original 1536x1024 independently generated source with exact hash', () => {
    const master = readFileSync(join(root, 'masters/crystal-sentinel-6poses-3x2-master-1536x1024.png'))
    expect(master.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(master.readUInt32BE(16)).toBe(1536)
    expect(master.readUInt32BE(20)).toBe(1024)
    expect(sha256(master)).toBe('bc93866daa95ab1e5e63db904b2b87ab587c12c52f9a9bda9d5fcf815cfb5556')
  })
})
