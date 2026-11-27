import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'
import manifest from './manifest.json'

const folder = dirname(fileURLToPath(import.meta.url))
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')
const expectedSource = '2d1ab770662996ad7bba0595842dc47d1fa6fbb74a92c8259c5d61969da86baf'

describe('ES2 faction telegraph source and runtime mappings', () => {
  it('uses one genuine 3x transparent cue per faction with a recorded 4x3 source master cell', () => {
    const kinds = Object.keys(ENEMY_DEFINITIONS)
    expect(kinds).toHaveLength(10)
    for (const [index, kind] of kinds.entries()) {
      const entry = manifest.assets.find(asset => asset.id === kind + ':telegraph')
      expect(entry, kind + ' warning missing').toBeDefined()
      expect(entry).toMatchObject({
        path: kind + '-telegraph@3x.webp',
        width: 150, height: 150, frameWidth: 150, frameHeight: 150,
        frames: 1, columns: 1, rows: 1,
        native3x: true, alpha: true, status: 'approved',
        sourceMaster: 'masters/telegraphs-10-4x3-master-1448x1086.png',
        sourceMasterWidth: 1448, sourceMasterHeight: 1086,
        sourceMasterFrameWidth: 362, sourceMasterFrameHeight: 362,
        sourceMasterIndex: index, sourceMasterSha256: expectedSource,
      })
      const webp = readFileSync(join(folder, kind + '-telegraph@3x.webp'))
      expect(webp.toString('ascii', 0, 4)).toBe('RIFF')
      expect(webp.toString('ascii', 8, 12)).toBe('WEBP')
      expect(webp.readUInt32LE(4) + 8).toBe(webp.length)
      expect(hash(webp)).toBe(entry!.sha256)
    }
  })

  it('retains full-resolution authored source with complete 10-cell proof', () => {
    const master = readFileSync(join(folder, 'masters/telegraphs-10-4x3-master-1448x1086.png'))
    expect(master.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(master.readUInt32BE(16)).toBe(1448)
    expect(master.readUInt32BE(20)).toBe(1086)
    expect(hash(master)).toBe(expectedSource)
  })
})
