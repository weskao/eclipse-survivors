import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import manifest from './manifest.json'

const dir = dirname(fileURLToPath(import.meta.url))
const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex')

describe('Shadow Assassin actual native 3x six-pose source contract', () => {
  it('uses six safe 216px authored source cells without claiming human approval', () => {
    const asset = manifest.assets.find(entry => entry.id === 'shadow-assassin')
    expect(asset).toMatchObject({
      path: 'shadow-assassin-body@3x.webp',
      width: 1296, height: 216, frameWidth: 216, frameHeight: 216,
      columns: 6, rows: 1, frames: 6, native3x: true,
      status: 'approved',
      sourceMaster: 'masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp',
      sourceMasterWidth: 1536, sourceMasterHeight: 1024,
      sourceMasterFrameWidth: 512, sourceMasterFrameHeight: 512,
      sourceMasterSha256: '54c639a9b101ee14563f41fb4e23e36713b9466ff95666482944d553165fa5bc',
    })
    const data = readFileSync(join(dir, 'shadow-assassin-body@3x.webp'))
    expect(data.length).toBeLessThanOrEqual(110000)
    expect(sha(data)).toBe('dda7977af81276b5352f1d89b016f7111093c2851f53ecbc52efbd10e4734b3a')
    expect(data.toString('ascii', 0, 4)).toBe('RIFF')
    expect(data.toString('ascii', 8, 12)).toBe('WEBP')
  })

  it('preserves the distinct full-resolution authoring sheet', () => {
    const master = readFileSync(join(dir, 'masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp'))
    expect(master.toString('ascii', 0, 4)).toBe('RIFF')
    expect(master.toString('ascii', 8, 12)).toBe('WEBP')
    expect(sha(master)).toBe('54c639a9b101ee14563f41fb4e23e36713b9466ff95666482944d553165fa5bc')
  })
})
