import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'
import manifest from './manifest.json'

const root = dirname(fileURLToPath(import.meta.url))
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe('Frost Wraith authored native 3x world art', () => {
  it('uses six separate 228px frames at the actual 76px game draw size', () => {
    const entry = manifest.assets.find(a => a.id === 'frost-wraith')
    expect(entry).toMatchObject({
      path: 'frost-wraith-body@3x.webp',
      width: 1368, height: 228, frameWidth: 228, frameHeight: 228,
      frames: 6, columns: 6, rows: 1,
      native3x: true, alpha: true, status: 'approved',
      sourceMaster: 'masters/frost-wraith-6poses-3x2-master-1536x1024.png',
      sourceMasterWidth: 1536, sourceMasterHeight: 1024,
      sourceMasterFrameWidth: 512, sourceMasterFrameHeight: 512,
      sourceMasterSha256: '74892271c0edb463e33300e4b589048386ee278ad96b92ef3242c7d1e79dc67c',
    })
    expect(entry!.frameWidth).toBeGreaterThanOrEqual(
      Math.max(70, ENEMY_DEFINITIONS['frost-wraith'].radius * 4) * 3
    )
    const body = readFileSync(join(root, entry!.path))
    expect(body.length).toBeLessThanOrEqual(entry!.maxBytes)
    expect(body.toString('ascii', 0, 4)).toBe('RIFF')
    expect(body.toString('ascii', 8, 12)).toBe('WEBP')
    expect(body.readUInt32LE(4) + 8).toBe(body.length)
    expect(hash(body)).toBe(entry!.sha256)
  })

  it('retains independently authored 1536x1024 source and SHA-256 proof', () => {
    const source = readFileSync(join(root, 'masters/frost-wraith-6poses-3x2-master-1536x1024.png'))
    expect(source.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(source.readUInt32BE(16)).toBe(1536)
    expect(source.readUInt32BE(20)).toBe(1024)
    expect(hash(source)).toBe('74892271c0edb463e33300e4b589048386ee278ad96b92ef3242c7d1e79dc67c')
  })
})
