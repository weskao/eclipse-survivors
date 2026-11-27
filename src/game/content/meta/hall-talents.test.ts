import { describe, expect, it } from 'vitest'
import { HALL_TALENTS, HALL_GROUPS, validateHallTalents, hallTalentCost, hallTalentEligible, hallTalentGroup } from './hall-talents'
import { createMetaState } from './state'

describe('ES4 talent catalog', () => {
  it('defines exactly 72 new nodes and 13 groups with bilingual and art contracts', () => {
    expect(HALL_TALENTS).toHaveLength(72)
    expect(new Set(HALL_TALENTS.map(node => node.id)).size).toBe(72)
    expect(HALL_GROUPS).toHaveLength(13)
    expect(HALL_TALENTS.reduce((total, node) => total + node.maxRank, 25)).toBe(289)
    expect(validateHallTalents(HALL_TALENTS)).toEqual([])
    for (const node of HALL_TALENTS) {
      expect(node.nameEn.length).toBeGreaterThan(3)
      expect(node.effectEn.length).toBeGreaterThan(10)
      expect(node.art.description.length).toBeGreaterThan(20)
      expect(node.art.futureWebp).toBe('src/assets/es4/hall/' + node.id + '@3x.webp')
      expect(node.art.temporarySvg).toBe('src/assets/es4/hall/' + node.id + '.svg')
      expect(node.art.status).toBe('SVG_TEMPORARY')
    }
  })
  it('uses the documented rank curve and rejects invalid ranks', () => {
    expect([0,1,2,3,4,5].map(rank => hallTalentCost('offense-edge', rank))).toEqual([40,60,80,120,200,null])
    expect(hallTalentCost('offense-edge', -1)).toBeNull()
    expect(hallTalentCost('offense-edge', .5)).toBeNull()
    expect(hallTalentCost('unknown', 0)).toBeNull()
    expect(hallTalentCost('knight-bulwark', 0)).toBe(380)
  })
  it('requires every prerequisite, including legacy ranks and matching hero mastery', () => {
    const state = createMetaState()
    expect(hallTalentEligible('offense-edge', state, {}, 'knight')).toBe(false)
    state.research.power = 1
    expect(hallTalentEligible('offense-edge', state, {}, 'knight')).toBe(true)
    expect(hallTalentEligible('offense-war-master', state, { 'offense-execution': 3 }, 'knight')).toBe(false)
    expect(hallTalentEligible('offense-war-master', state, { 'offense-execution': 3, 'offense-fervor': 3 }, 'knight')).toBe(true)
    expect(hallTalentEligible('knight-guard', state, {'knight-discipline': 2}, 'knight')).toBe(false)
    state.mastery.knight = { level: 3, xp: 900 }
    expect(hallTalentEligible('knight-guard', state, {'knight-discipline': 2}, 'knight')).toBe(true)
    expect(hallTalentEligible('knight-guard', state, {'knight-discipline': 2}, 'ranger')).toBe(false)
    expect(hallTalentEligible('synergy-spellwind', state, {'arcana-echo': 1, 'mobility-windstep': 1}, 'knight')).toBe(true)
  })
  it('rejects duplicate, missing, cyclic and impossible prerequisite nodes', () => {
    const first = HALL_TALENTS[0]!
    expect(validateHallTalents([...HALL_TALENTS, first]).length).toBeGreaterThan(0)
    for (const requires of [[{id:'not-real',rank:1}], [{id:first.id,rank:1}], [{id:'power',rank:6}]]) {
      expect(validateHallTalents([{...first,requires}, ...HALL_TALENTS.slice(1)]).length).toBeGreaterThan(0)
    }
    expect(hallTalentGroup('offense')).toHaveLength(6)
    expect(hallTalentGroup('shadowblade')).toHaveLength(5)
  })
})
