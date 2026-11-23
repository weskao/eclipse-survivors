import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
  assets: Array<{ id: string; path: string; width: number; height: number
    frameWidth: number; frameHeight: number; status: string
    qa?: { nativeSourcePixels: number; generatedMasterSha256: string
      generatedMasterCommitted: boolean; approval: string } }>
}

describe('ES2 flawless achievement icon — honest 3x pending gate', () => {
  it('must not approve a source smaller than 3x its 72px actual display size', () => {
    const icon = manifest.assets.find(asset => asset.id === 'achievement-flawless')
    expect(icon).toBeDefined()
    expect(icon!.frameWidth).toBe(icon!.width)
    expect(icon!.frameHeight).toBe(icon!.height)
    // The signed-off product still requires authentic master files: dimensions alone are insufficient.
    if (icon!.qa?.generatedMasterCommitted) {
      const qa = icon!.qa as { generatedMasterPath: string; generatedMasterSha256: string }
      const master = readFileSync(join(dir, qa.generatedMasterPath))
      expect(createHash('sha256').update(master).digest('hex')).toBe(qa.generatedMasterSha256)
    }
    const sourceIs3x = icon!.width >= 216 && icon!.height >= 216
    if (!sourceIs3x) {
      // Existing 192px candidate is only 2.67x at the 72px real game badge.
      expect(icon!.status).toBe('needs-human-approval')
    } else {
      // Dimension alone is not enough: preserve an authentic authored source trail.
      expect(icon!.qa?.nativeSourcePixels).toBeGreaterThanOrEqual(216)
      expect(icon!.qa?.generatedMasterSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(icon!.qa?.generatedMasterCommitted).toBe(true)
      expect(icon!.qa?.approval).toBe('pending')
    }
  })
})
