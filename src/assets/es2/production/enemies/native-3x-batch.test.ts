import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import manifest from './manifest.json'
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'

const folder = dirname(fileURLToPath(import.meta.url))
const batch = ['necromancer', 'dark-archer', 'plague-carrier', 'shield-guardian', 'phantom', 'fire-imp'] as const
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe('six authored ES2 enemy bodies at runtime native three-times detail', () => {
  it.each(batch)('%s has a real authored source master, 6-frame 3x runtime art, and truthful QA status', kind => {
    const asset = manifest.assets.find(a => a.id === kind)
    const display = Math.max(70, ENEMY_DEFINITIONS[kind].radius * 4)
    expect(asset, kind + ' body absent').toBeDefined()
    expect(asset).toMatchObject({
      native3x: true, alpha: true,
      frames: 6, columns: 6, rows: 1,
      status: 'approved',
      sourceMasterWidth: 2172, sourceMasterHeight: 724,
      sourceMasterFrameWidth: 362, sourceMasterFrameHeight: 724,
    })
    expect(asset!.frameWidth).toBeGreaterThanOrEqual(display * 3)
    expect(asset!.frameHeight).toBeGreaterThanOrEqual(display * 3)
    expect(asset!.width).toBe(asset!.frameWidth * 6)
    expect(asset!.height).toBe(asset!.frameHeight)
    const body = readFileSync(join(folder, asset!.path))
    expect(body.length).toBeLessThanOrEqual(asset!.maxBytes)
    expect(body.toString('ascii', 0, 4)).toBe('RIFF')
    expect(body.toString('ascii', 8, 12)).toBe('WEBP')
    expect(body.readUInt32LE(4) + 8).toBe(body.length)
    expect(sha(body)).toBe(asset!.sha256)
    const masterName = (asset as typeof asset & { sourceMaster: string }).sourceMaster
    expect(masterName).toBe('masters/' + kind + '-6poses-6x1-source-2172x724.png')
    const master = readFileSync(join(folder, masterName))
    expect(master.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(master.readUInt32BE(16)).toBe(2172)
    expect(master.readUInt32BE(20)).toBe(724)
    expect(sha(master)).toBe((asset as typeof asset & { sourceMasterSha256: string }).sourceMasterSha256)
  })
})
