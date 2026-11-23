import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const directory = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as {
  status: string
  assets: Array<{
    id: string
    width: number
    height: number
    columns: number
    frames: number
    frameWidth: number
    status: string
    qa?: {
      maxCanvasDrawPx: number
      requiredNativeFramePx: number
      verifiedOriginalMasterFramePx: number | null
      native3x: boolean
      contactSheetReview: string
      realGameplayReview: string
      issues: string[]
    }
  }>
}
const bossIds = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph']

describe('ES2 boss production art: honest native-3x QA contract', () => {
  it('tracks all four three-phase atlases without unreviewed approval', () => {
    expect(manifest.assets.map(asset => asset.id).sort()).toEqual([...bossIds].sort())
    expect(manifest.status).toBe('visual-review-required')
    for (const asset of manifest.assets) {
      expect(asset.frames).toBe(3)
      expect(asset.columns).toBe(3)
      expect(asset.width).toBe(asset.frameWidth * asset.columns)
      expect(asset.height).toBe(asset.frameWidth)
      expect(asset.status).toBe('needs-human-approval')
    }
  })

  it('never claims native 3x on an atlas smaller than the real Canvas requirement', () => {
    for (const asset of manifest.assets) {
      expect(asset.qa, asset.id + ' must record production review evidence').toBeDefined()
      const qa = asset.qa!
      expect(qa.maxCanvasDrawPx, asset.id).toBeGreaterThan(0)
      expect(qa.requiredNativeFramePx, asset.id).toBe(Math.ceil(qa.maxCanvasDrawPx * 3))
      expect(qa.native3x, asset.id).toBe(
        asset.frameWidth >= qa.requiredNativeFramePx &&
        qa.verifiedOriginalMasterFramePx !== null &&
        qa.verifiedOriginalMasterFramePx >= qa.requiredNativeFramePx,
      )
      expect(qa.contactSheetReview, asset.id).toBe('inspected')
      expect(['pending', 'passed'].includes(qa.realGameplayReview), asset.id).toBe(true)
      expect(qa.issues.length, asset.id).toBeGreaterThan(0)
    }
  })
})
