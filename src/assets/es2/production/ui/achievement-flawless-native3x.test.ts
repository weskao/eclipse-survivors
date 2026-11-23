import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
  assets: Array<{ id: string; path: string; width: number; height: number
    frameWidth: number; frameHeight: number; alpha: boolean; status: string
    sha256: string; qa?: { nativeSourcePixels: number; generatedMasterSha256: string
    generatedMasterCommitted: boolean; approval: string } }>
}

describe('ES2 flawless achievement icon: genuine source-detail evidence', () => {
  it('keeps the full visible artwork at >= 3x its 72px in-game badge size', () => {
    const icon = manifest.assets.find(asset => asset.id === 'achievement-flawless')
    expect(icon).toBeDefined()
    expect(icon!.width).toBeGreaterThanOrEqual(216)
    expect(icon!.height).toBeGreaterThanOrEqual(216)
    expect(icon!.frameWidth).toBe(icon!.width)
    expect(icon!.frameHeight).toBe(icon!.height)
    expect(icon!.alpha).toBe(true)
    expect(icon!.status).toBe('needs-human-approval')
  })

  it('records authentic generated source dimensions and never invents approval', () => {
    const icon = manifest.assets.find(asset => asset.id === 'achievement-flawless')!
    expect(icon.qa?.nativeSourcePixels).toBeGreaterThanOrEqual(216)
    expect(icon.qa?.generatedMasterSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(icon.qa?.generatedMasterCommitted).toBe(false)
    expect(icon.qa?.approval).toBe('pending')
    const bytes = readFileSync(join(dir, icon.path))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(icon.sha256)
  })
})
