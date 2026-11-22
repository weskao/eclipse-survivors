import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const canonical = {
  weapons: [
    'shadow-daggers', 'holy-lance', 'blood-scythe', 'arcane-mines',
    'bone-spears', 'poison-cloud', 'ricochet-blades', 'spirit-wolves',
    'solar-beam', 'gravity-orbs', 'spectral-bow', 'thorn-chain',
  ],
  evolution2: [
    'nightfall-torrent', 'dawn-judgment', 'crimson-reaper',
    'singularity-minefield', 'toxic-permafrost', 'infinite-rebound',
    'wild-hunt', 'solar-tempest', 'celestial-collapse',
    'spectral-volley', 'bonefire-barrage', 'verdant-snare',
  ],
} as const

const allHashes = new Set<string>()

describe('ES2 production weapon and evolution artwork', () => {
  for (const [namespace, slugs] of Object.entries(canonical)) {
    const folder = namespace === 'weapons' ? 'weapons' : 'evolutions'
    it(`validates all 12 canonical ${folder} with real transparent 3x WebP`, () => {
      const dir = join(root, folder)
      const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
        status: string
        scale: number
        designUnit: number
        assets: {
          id: string
          path: string
          width: number
          height: number
          bytes: number
          sha256: string
          status: string
        }[]
      }
      expect(manifest.status).toBe('production')
      expect(manifest.scale).toBe(3)
      expect(manifest.designUnit).toBe(128)
      expect(manifest.assets.map(a => a.id)).toEqual(slugs.map(s => `${namespace}:${s}`))
      for (const asset of manifest.assets) {
        const slug = asset.id.split(':')[1]
        expect(asset.path).toBe(`${slug}@3x.webp`)
        expect(asset.status).toBe('approved')
        expect([asset.width, asset.height]).toEqual([384, 384])
        const file = join(dir, asset.path)
        const bytes = readFileSync(file)
        expect(bytes.length).toBe(asset.bytes)
        expect(statSync(file).size).toBeLessThanOrEqual(160_000)
        expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
        expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
        expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
        expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
        expect(bytes[20]! & 0x10).toBeTruthy()
        expect(bytes.readUIntLE(24, 3) + 1).toBe(384)
        expect(bytes.readUIntLE(27, 3) + 1).toBe(384)
        const hash = createHash('sha256').update(bytes).digest('hex')
        expect(hash).toBe(asset.sha256)
        expect(allHashes.has(hash)).toBe(false)
        allHashes.add(hash)
      }
    })
  }
})
