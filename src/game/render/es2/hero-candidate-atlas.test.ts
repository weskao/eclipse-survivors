import { describe, expect, it } from 'vitest'
import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'

describe('ES2 staged hero candidate atlas contract (QA only)', () => {
  it('has one committed local source for every new hero and East-facing action, not runtime art', () => {
    const ids = new Set(HERO_CANDIDATE_ATLASES.map(x => `${x.hero}:${x.pose}`))
    expect(ids.size).toBe(9)
    expect([...ids].sort()).toEqual([
      'shadowblade:run', 'shadowblade:attack', 'shadowblade:special',
      'spirit-summoner:run', 'spirit-summoner:attack', 'spirit-summoner:special',
      'crimson-paladin:run', 'crimson-paladin:attack', 'crimson-paladin:special',
    ].sort())
    for (const { url } of HERO_CANDIDATE_ATLASES) expect(url).toContain('east-4frames')
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
})
