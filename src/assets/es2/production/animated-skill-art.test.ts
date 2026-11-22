import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd(), 'src/assets/es2/production')
const batches = [
  [
    ['weapons', 'shadow-daggers'], ['weapons', 'holy-lance'],
    ['weapons', 'blood-scythe'], ['weapons', 'arcane-mines'],
    ['weapons', 'poison-cloud'],
    ['evolutions', 'nightfall-torrent'], ['evolutions', 'dawn-judgment'],
    ['evolutions', 'crimson-reaper'], ['evolutions', 'singularity-minefield'],
    ['evolutions', 'toxic-permafrost'],
  ],
  [
    ['weapons', 'bone-spears'], ['weapons', 'ricochet-blades'],
    ['weapons', 'spirit-wolves'], ['weapons', 'solar-beam'], ['weapons', 'gravity-orbs'],
    ['evolutions', 'bonefire-barrage'], ['evolutions', 'infinite-rebound'],
    ['evolutions', 'wild-hunt'], ['evolutions', 'solar-tempest'],
    ['evolutions', 'celestial-collapse'],
  ],
  [
    ['weapons', 'spectral-bow'], ['weapons', 'thorn-chain'],
    ['evolutions', 'spectral-volley'], ['evolutions', 'verdant-snare'],
  ],
] as const

describe('ES2 animated 3x production art (not whole-image zoom)', () => {
  batches.forEach((entries, i) => {
    it('batch ' + (i + 1) + ' delivers unique 384px transparent animated WebP for every canonical ID', () => {
      const seen = new Set<string>()
      for (const [folder, slug] of entries) {
        const file = resolve(root, folder, slug + '@3x-animated.webp')
        expect(existsSync(file), file).toBe(true)
        const bytes = readFileSync(file)
        expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
        expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
        expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
        expect(bytes.toString('ascii', 12, 16)).toBe('VP8X')
        expect(bytes[20]! & 0x02, file + ': animated flag').toBeTruthy()
        expect(bytes[20]! & 0x10, file + ': alpha flag').toBeTruthy()
        expect(bytes.readUIntLE(24, 3) + 1).toBe(384)
        expect(bytes.readUIntLE(27, 3) + 1).toBe(384)
        expect(bytes.includes(Buffer.from('ANIM'))).toBe(true)
        expect(bytes.length).toBeLessThan(1_200_000)
        const sha = createHash('sha256').update(bytes).digest('hex')
        expect(seen.has(sha)).toBe(false)
        seen.add(sha)
      }
    })
  })
  it('the manifest accounts for all 24 uniquely mapped animations', () => {
    const file = resolve(root, 'animated-skill-manifest.json')
    expect(existsSync(file)).toBe(true)
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as {
      scale: number
      assets: { id: string; file: string; frames: number; source: string; sha256: string; bytes: number }[]
    }
    const expected = batches.flat().map(([folder, slug]) =>
      (folder === 'weapons' ? 'weapons:' : 'evolution2:') + slug)
    expect(manifest.scale).toBe(3)
    expect(manifest.assets.map(a => a.id).sort()).toEqual(expected.sort())
    for (const asset of manifest.assets) {
      const file = resolve(root, asset.file)
      const bytes = readFileSync(file)
      expect(asset.frames).toBe(12)
      expect(asset.bytes).toBe(bytes.length)
      expect(asset.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
      expect(asset.source.endsWith('@3x.webp')).toBe(true)
    }
  })
})
