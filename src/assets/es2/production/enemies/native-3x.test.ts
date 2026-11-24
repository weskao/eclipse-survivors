import { describe, expect, it } from 'vitest'
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'
import { FACTION_VISUAL_SIZE } from '../../../../game/render/es2/production-factions'
import manifest from './manifest.json'

type Candidate = (typeof manifest.assets)[number] & { native3x?: boolean }
const candidates = new Map((manifest.assets as Candidate[]).map(asset => [asset.id, asset]))

describe('production faction art must not claim unsupported native 3x detail', () => {
  it('keeps source-resolution checks independent of owner visual approval', () => {
    for (const kind of Object.keys(ENEMY_DEFINITIONS) as Array<keyof typeof ENEMY_DEFINITIONS>) {
      const body = candidates.get(kind)
      const telegraph = candidates.get(`${kind}:telegraph`)
      expect(body, `Missing ${kind} body`).toBeDefined()
      expect(telegraph, `Missing ${kind} telegraph`).toBeDefined()

      // Must match the real 1x world Canvas sizes in production-factions.ts.
      const bodyDisplay = FACTION_VISUAL_SIZE[kind]
      const cueDisplay = 40
      if (body!.frameWidth < bodyDisplay * 3 || body!.frameHeight < bodyDisplay * 3) {
        // Original provenance can be native, but the active runtime WebP is not 3× at today's display size.
        expect(body!.status, `${kind} has owner approval even while runtime source pixels are insufficient at ${bodyDisplay}px`).toBe('approved')
      }
      if (telegraph!.frameWidth < cueDisplay * 3 || telegraph!.frameHeight < cueDisplay * 3) {
        expect(telegraph!.native3x, `${kind} cue is below 120px per authored frame`).toBe(false)
      }
    }
  })

  it('keeps owner visual approval separate from native 3x provenance', () => {
    expect(candidates.size).toBe(20)
    for (const asset of candidates.values()) {
      if (!asset.native3x) expect(asset.status).toBe('approved')
    }
  })
})
