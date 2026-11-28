import { describe, expect, it } from 'vitest'
import { createMetaState } from '../content/meta/state'
import { buyResearch } from '../content/meta/progression'
import { researchCelebrationVariant } from './hall-research-cue'
import { hallRankVariant } from './hall-upgrade-sample'

describe('Hall research celebration routing', () => {
  it('celebrates only a fully satisfied downstream prerequisite, not half of a joined path', () => {
    const before = createMetaState()
    before.embers = 10000
    before.research.power = 1
    before.research.vitality = 1
    const first = buyResearch(before, 'insight')
    expect(first.ok).toBe(true)
    expect(researchCelebrationVariant('insight', before, first.state)).toBe(hallRankVariant(1, 5, false))
    const second = buyResearch(first.state, 'scavenging')
    expect(second.ok).toBe(true)
    expect(researchCelebrationVariant('scavenging', first.state, second.state)).toBe(hallRankVariant(1, 5, true))
    const rank2 = buyResearch(second.state, 'scavenging')
    expect(researchCelebrationVariant('scavenging', second.state, rank2.state)).toBe(hallRankVariant(2, 5, false))
  })
})
