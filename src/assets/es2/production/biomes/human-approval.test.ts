import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(readFileSync(
  resolve(process.cwd(), 'src/assets/es2/production/biomes/manifest.json'), 'utf8',
)) as {
  category: string
  status: string
  assets: Array<{
    id: string
    status: string
    native3x: boolean
    humanApproval?: {
      status: string
      confirmedBy: string
      confirmedOn: string
      scope: string
      evidence: string
    }
  }>
}

const expected = [
  'blood-moon-cathedral:ground', 'blood-moon-cathedral:decor',
  'cursed-forest:ground', 'cursed-forest:decor',
  'abyssal-necropolis:ground', 'abyssal-necropolis:decor',
  'celestial-rift:ground', 'celestial-rift:decor',
]

describe('ES2 Biomes 8 — explicit project-owner visual-art approval', () => {
  it('records approval of exactly four floors and four decor sheets', () => {
    expect(manifest.category).toBe('biomes')
    expect(manifest.assets.map(asset => asset.id).sort()).toEqual([...expected].sort())
    expect(manifest.status).toBe('approved')
    for (const asset of manifest.assets) {
      expect(asset.native3x, asset.id).toBe(true)
      expect(asset.status, asset.id).toBe('approved')
      expect(asset.humanApproval, asset.id).toEqual({
        status: 'approved',
        confirmedBy: 'project-owner',
        confirmedOn: '2026-11-24',
        scope: 'visual-art',
        evidence: 'explicit-user-confirmation',
      })
    }
  })
})
