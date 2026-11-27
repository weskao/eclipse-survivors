import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { treasureArtUrl, WORLD_ART, ES3_EPIC_TREASURE_URL } from '../../../../game/render/es2/production-world'

const archive = readFileSync(resolve('src/components/es2/menu/Es2Archive.vue'), 'utf8')
const gallery = readFileSync(resolve('src/components/es2/menu/Es2DevArtGallery.vue'), 'utf8')
const chest = readFileSync(resolve('src/components/es2/relic-rewards/RelicRewardOverlay.vue'), 'utf8')

describe('ES2 UI 192px source / maximum 64px display', () => {
  it('keeps archive, achievements and actual treasure rewards within a nominal 3x art budget', () => {
    for (const [source, selector] of [
      [archive, /\.es2-achievement-icon\s*\{([^}]*)\}/],
      [gallery, /\.es2-world-art-icon\s*\{([^}]*)\}/],
      [chest, /\.relic-rewards__icon img\s*\{([^}]*)\}/],
    ] as const) {
      const style = source.match(selector)?.[1] ?? ''
      for (const dimension of ['width', 'height']) {
        const pixels = Number(style.match(new RegExp('(?:^|;)\\s*' + dimension + '\\s*:\\s*(\\d+)px'))?.[1])
        expect(pixels).toBeGreaterThan(0)
        expect(pixels).toBeLessThanOrEqual(192 / 3)
      }
    }
  })

  it('connects all four local treasure images to the live loot-choice dialog', () => {
    expect(chest).toContain('treasureArtUrl(relic.rarity, relic.cursed)')
    for (const tier of ['common', 'rare', 'legendary', 'cursed'] as const) {
      expect(treasureArtUrl(tier)).toBe(WORLD_ART.ui[`treasure-${tier}`])
    }
    expect(treasureArtUrl('epic')).toBe(ES3_EPIC_TREASURE_URL)
    expect(treasureArtUrl('epic', true)).toBe(WORLD_ART.ui['treasure-cursed'])
  })
})
