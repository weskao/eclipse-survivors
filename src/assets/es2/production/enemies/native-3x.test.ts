import { describe, expect, it } from 'vitest'
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'
import manifest from './manifest.json'

type Candidate = (typeof manifest.assets)[number] & { native3x?: boolean }
const candidates = new Map((manifest.assets as Candidate[]).map(asset => [asset.id, asset]))

describe('production faction art must not claim unsupported native 3x detail', () => {
  it('flags under-resolution enemy sprites and windup cues as non-native candidates', () => {
    for (const [kind, definition] of Object.entries(ENEMY_DEFINITIONS)) {
      const body = candidates.get(kind)
      const telegraph = candidates.get(`${kind}:telegraph`)
      expect(body, `Missing ${kind} body`).toBeDefined()
      expect(telegraph, `Missing ${kind} telegraph`).toBeDefined()

      // Must match the real 1x world Canvas sizes in production-factions.ts.
      const bodyDisplay = Math.max(70, definition.radius * 4)
      const cueDisplay = 40
      if (body!.frameWidth < bodyDisplay * 3 || body!.frameHeight < bodyDisplay * 3) {
        expect(body!.native3x, `${kind} is below ${bodyDisplay * 3}px per authored frame`).toBe(false)
      }
      if (telegraph!.frameWidth < cueDisplay * 3 || telegraph!.frameHeight < cueDisplay * 3) {
        expect(telegraph!.native3x, `${kind} cue is below 120px per authored frame`).toBe(false)
      }
    }
  })

  it('keeps all 20 candidates in human-review state until genuine 3x source proof exists', () => {
    expect(candidates.size).toBe(20)
    for (const asset of candidates.values()) {
      if (!asset.native3x) expect(asset.status).toBe('needs-human-approval')
    }
  })
})
