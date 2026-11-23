import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface BiomeCandidate {
  id: string
  frameWidth: number
  frameHeight: number
  native3x: boolean
}

const { assets } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/assets/es2/production/biomes/manifest.json'), 'utf8'),
) as { assets: BiomeCandidate[] }

// Reviewed against paintEnvironment() in src/game/render/environment.ts.
// These are conservative maximum draw sizes *before* any larger viewport scale.
// A dimensional pass alone cannot establish genuine, non-interpolated source detail.
const DISPLAY_GROUND = 384
const DISPLAY_DECOR = 110

describe('ES2 biome production art: native-3x source admission', () => {
  it.each(assets)('$id must contain at least three original pixels per runtime pixel', asset => {
    const display = asset.id.endsWith(':ground') ? DISPLAY_GROUND : DISPLAY_DECOR
    expect(asset.native3x, `${asset.id} explicit authored source flag`).toBe(true)
    expect(asset.frameWidth, `${asset.id} source frame width`).toBeGreaterThanOrEqual(display * 3)
    expect(asset.frameHeight, `${asset.id} source frame height`).toBeGreaterThanOrEqual(display * 3)
  })
})
