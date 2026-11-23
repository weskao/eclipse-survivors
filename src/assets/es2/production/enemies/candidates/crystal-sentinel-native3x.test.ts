import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENEMY_DEFINITIONS } from '../../../../../game/content/enemies/definitions'
import manifest from '../manifest.json'

const here = dirname(fileURLToPath(import.meta.url))
const parent = join(here, '..')
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

function verifyWebp(path: string, width: number, height: number, digest: string): number {
  const bytes = readFileSync(join(here, path))
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(bytes.readUInt32LE(4) + 8).toBe(bytes.byteLength)
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
  expect(bytes[20]! & 0x10).toBe(0x10)
  expect([bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1])
    .toEqual([width, height])
  expect(sha(bytes)).toBe(digest)
  return bytes.byteLength
}

describe('Crystal Sentinel six-pose 3x QA candidate (not production release)', () => {
  it('includes 6 unique high-resolution source poses and a budget-safe transparent runtime atlas', () => {
    const qa = JSON.parse(readFileSync(join(here, 'crystal-sentinel-native3x-QA.json'), 'utf8'))
    const drawPx = Math.max(70, ENEMY_DEFINITIONS['crystal-sentinel'].radius * 4)
    expect(qa).toMatchObject({
      id: 'crystal-sentinel',
      status: 'QA_PENDING',
      productionActive: false,
      source: { file: 'crystal-sentinel-6poses-master@source.webp', frameWidth: 512, frameHeight: 512, frames: 6 },
      runtime: { file: 'crystal-sentinel-6poses-QA-PENDING.webp', frameWidth: 324, frameHeight: 324, frames: 6 },
    })
    expect(qa.runtime.frameWidth).toBeGreaterThanOrEqual(drawPx * 3)
    expect(qa.runtime.width).toBe(6 * qa.runtime.frameWidth)
    expect(qa.source.width).toBe(6 * qa.source.frameWidth)
    expect(verifyWebp(qa.source.file, 3072, 512, qa.source.sha256)).toBeGreaterThan(0)
    expect(verifyWebp(qa.runtime.file, 1944, 324, qa.runtime.sha256)).toBeLessThanOrEqual(110000)
    expect(new Set(qa.poseNames).size).toBe(6)
    expect(qa.humanApproval).toBe('pending')
  })

  it('exposes a side-by-side candidate in the isolated browser QA page, leaving the default gameplay art untouched', () => {
    const source = readFileSync(join(parent, 'qa-preview.ts'), 'utf8')
    expect(source).toContain('crystalSentinelCandidate')
    expect(source).toContain('crystal-sentinel-6poses-QA-PENDING.webp')
    const canonical = manifest.assets.find(a => a.id === 'crystal-sentinel')
    expect(canonical).toBeDefined()
    expect(canonical?.path).toBe('crystal-sentinel-body@3x.webp')
    expect(canonical?.status).toBe('needs-human-approval')
    expect(canonical?.native3x).toBe(false)
  })
})
