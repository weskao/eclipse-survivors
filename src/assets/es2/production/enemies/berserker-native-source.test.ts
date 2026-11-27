import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import manifest from './manifest.json'

const directory = dirname(fileURLToPath(import.meta.url))
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe('Berserker native three-times source contract', () => {
  it('uses the reviewed, separately authored 512px source cells, not enlarged 96px legacy art', () => {
    const asset = manifest.assets.find(entry => entry.id === 'berserker')
    expect(asset).toMatchObject({
      width: 1584, height: 264, frameWidth: 264, frameHeight: 264,
      frames: 6, columns: 6, rows: 1, native3x: true,
      sourceMaster: 'masters/berserker-6-poses-3x2-master-1536x1024.png',
      sourceMasterWidth: 1536, sourceMasterHeight: 1024,
      sourceMasterFrameWidth: 512, sourceMasterFrameHeight: 512,
      sourceMasterSha256: 'ab4057f9b82d4153d9d469c5e9d0b121781446321312eb45ec4baf0ebbad248b',
      status: 'approved',
    })
    const png = readFileSync(join(directory, 'masters/berserker-6-poses-3x2-master-1536x1024.png'))
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(png.readUInt32BE(16)).toBe(1536)
    expect(png.readUInt32BE(20)).toBe(1024)
    expect(hash(png)).toBe('ab4057f9b82d4153d9d469c5e9d0b121781446321312eb45ec4baf0ebbad248b')
    const webp = readFileSync(join(directory, 'berserker-body@3x.webp'))
    expect(hash(webp)).toBe('06962c0607e568529cc8cb6433446179669cbcb6ca6a0abc52eefd27f130b397')
    expect(webp.toString('ascii', 0, 4)).toBe('RIFF')
    expect(webp.toString('ascii', 8, 12)).toBe('WEBP')
  })

  it('covers the 88px live canvas drawing size with no source upscaling', () => {
    const asset = manifest.assets.find(entry => entry.id === 'berserker')
    expect(asset?.frameWidth).toBeGreaterThanOrEqual(3 * 88)
    expect(asset?.frameHeight).toBeGreaterThanOrEqual(3 * 88)
  })
})
