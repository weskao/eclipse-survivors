import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'

describe('ES2 staged hero candidate atlas contract (QA only)', () => {
  it('has one committed local source for every new hero and East-facing action, not runtime art', () => {
    const ids = new Set(HERO_CANDIDATE_ATLASES.map(x => `${x.hero}:${x.pose}:${x.direction}`))
    expect(ids.size).toBe(18)
    expect([...ids].sort()).toEqual([
      'shadowblade:run:E', 'shadowblade:attack:E', 'shadowblade:special:E',
      'spirit-summoner:run:E', 'spirit-summoner:attack:E', 'spirit-summoner:special:E',
      'crimson-paladin:run:E', 'crimson-paladin:attack:E', 'crimson-paladin:special:E',
      'shadowblade:run:S', 'spirit-summoner:run:S', 'crimson-paladin:run:S',
      'shadowblade:run:SE', 'shadowblade:run:SW', 'spirit-summoner:run:SE', 'spirit-summoner:run:SW', 'crimson-paladin:run:SE', 'crimson-paladin:run:SW',
    ].sort())
    for (const { url, direction, cellPixels } of HERO_CANDIDATE_ATLASES) {
      expect(url).toContain(`${direction === 'E' ? 'east' : direction === 'S' ? 'south' : direction.toLowerCase()}-4frames`)
      expect(cellPixels).toBe(direction === 'E' ? 704 : 768)
    }
  })

  it('never samples into neighboring 704px cells or invents a fifth frame', () => {
    expect(Array.from({ length: 4 }, (_, i) => heroCandidateRect(i))).toEqual([
      { x: 0, y: 0, size: 704 }, { x: 704, y: 0, size: 704 },
      { x: 0, y: 704, size: 704 }, { x: 704, y: 704, size: 704 },
    ])
    for (const invalid of [-1, 4, 4.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(heroCandidateRect(invalid)).toBeNull()
    }
  })
  it('keeps every South-facing 768px candidate frame inside its own cell', () => {
    expect(Array.from({ length: 4 }, (_, index) => heroCandidateRect(index, 768))).toEqual([
      { x: 0, y: 0, size: 768 }, { x: 768, y: 0, size: 768 },
      { x: 0, y: 768, size: 768 }, { x: 768, y: 768, size: 768 },
    ])
    const south = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'S')
    expect(south.length).toBeGreaterThan(0)
    for (const candidate of south) {
      expect(candidate.cellPixels).toBe(768)
      for (let index = 0; index < 4; index++) {
        const rect = heroCandidateRect(index, candidate.cellPixels)!
        expect(rect.x + rect.size).toBeLessThanOrEqual(1536)
        expect(rect.y + rect.size).toBeLessThanOrEqual(1536)
      }
    }
    expect(heroCandidateRect(4, 768)).toBeNull()
  })

})
