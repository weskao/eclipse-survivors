import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORLD_UI_IDS } from '../../../../game/render/es2/production-world'

interface Approval {
  status: string
  confirmedBy: string
  confirmedOn: string
  scope: string
  evidence: string
}
interface UiAsset {
  id: string
  status: string
  humanApproval?: Approval
  qa?: { visualReview?: string; approval?: string; browserReview?: string }
}
const manifest = JSON.parse(readFileSync(resolve('src/assets/es2/production/ui/manifest.json'), 'utf8')) as {
  category: string
  status: string
  assets: UiAsset[]
}

describe('owner-confirmed UI artwork approval', () => {
  it('records owner visual approval for exactly the existing 17 UI assets, without changing stable IDs', () => {
    expect(manifest.category).toBe('ui')
    expect(manifest.status).toBe('approved')
    expect(manifest.assets.map(asset => asset.id)).toEqual([...WORLD_UI_IDS])
    for (const asset of manifest.assets) {
      expect(asset.status, asset.id).toBe('approved')
      expect(asset.humanApproval, asset.id).toEqual({
        status: 'approved',
        confirmedBy: 'project-owner',
        confirmedOn: '2026-11-24',
        scope: 'visual-art',
        evidence: 'explicit-user-confirmation',
      })
      if (asset.qa) expect(asset.qa.visualReview, asset.id).toBe('approved')
    }
  })
})
