import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BOSS_MAX_DRAW_PX } from '../../../../game/render/es2/boss-phase-layout'

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
      existingAtlasPreviewReview: string
      originalContactSheetReview: string
      realGameplayReview: string
      issues: string[]
    }
  }>
}
const bossIds = ['abyss-monarch', 'frost-sovereign', 'infernal-titan', 'eclipse-seraph']

describe('ES2 boss production art: honest native-3x QA contract', () => {
  it('tracks all four approved canonical three-phase atlases', () => {
    expect(manifest.assets.map(asset => asset.id).sort()).toEqual([...bossIds].sort())
    expect(manifest.status).toBe('approved')
    for (const asset of manifest.assets) {
      expect(asset.frames).toBe(3)
      expect(asset.columns).toBe(3)
      expect(asset.width).toBe(asset.frameWidth * asset.columns)
      expect(asset.height).toBe(asset.frameWidth)
      expect(asset.status).toBe('approved')
    }
  })

  it('uses the conservative maximum normalized body draw budget, not the uncorrected phase-one size', () => {
    for (const asset of manifest.assets) {
      expect(asset.qa?.maxCanvasDrawPx, asset.id).toBeCloseTo(BOSS_MAX_DRAW_PX)
      expect(asset.qa?.requiredNativeFramePx, asset.id).toBe(Math.ceil(BOSS_MAX_DRAW_PX * 3))
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
      expect(qa.existingAtlasPreviewReview, asset.id).toBe('inspected')
      expect(['pending', 'inspected'].includes(qa.originalContactSheetReview), asset.id).toBe(true)
      expect(['pending', 'passed'].includes(qa.realGameplayReview), asset.id).toBe(true)
      expect(qa.issues.length, asset.id).toBeGreaterThan(0)
    }
  })
})
