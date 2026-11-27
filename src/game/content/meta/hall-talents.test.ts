import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { HALL_TALENTS, HALL_GROUPS, validateHallTalents, hallTalentCost, hallTalentEligible, hallTalentGroup } from './hall-talents'
import { BALANCE } from '../../config'
import { hallRankValues } from './hall-rank-values'
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

it('keeps all functional SVG icons and unique future raster briefs available', () => {
  const manifest = readFileSync('docs/es4/hall-art-manifest.md', 'utf8')
  const descriptions = new Set<string>()
  const svgPaths = new Set<string>()
  const rasterPaths = new Set<string>()
  for (const node of HALL_TALENTS) {
    const { temporarySvg, futureWebp, description } = node.art
    const svg = readFileSync(temporarySvg, 'utf8')
    expect(svg, node.id).toContain('<svg')
    expect(svg, node.id).toContain('viewBox="0 0 64 64"')
    expect(svg, node.id).toContain('<path')
    expect(manifest, node.id).toContain(futureWebp)
    expect(manifest, node.id).toContain(description)
    descriptions.add(description)
    svgPaths.add(temporarySvg)
    rasterPaths.add(futureWebp)
  }
  expect(descriptions.size).toBe(HALL_TALENTS.length)
  expect(svgPaths.size).toBe(HALL_TALENTS.length)
  expect(rasterPaths.size).toBe(HALL_TALENTS.length)
})

it('provides actual per-rank contribution and no next rank beyond the cap for every ranked node', () => {
  const ranked = HALL_TALENTS.filter(node => node.maxRank > 1)
  expect(ranked).toHaveLength(48)
  for (const node of ranked) {
    const zero=hallRankValues(node.id,0)!
    const first=hallRankValues(node.id,1)!
    const max=hallRankValues(node.id,node.maxRank)!
    expect(zero.current.every(v=>v.value===0),node.id).toBe(true)
    expect(zero.next,node.id).toEqual(first.current)
    expect(first.current.every(v=>v.value!==0),node.id).toBe(true)
    expect(max.next,node.id).toBeNull()
  }
  expect(hallRankValues('offense-edge',2)?.current[0]?.value).toBeCloseTo(BALANCE.hall.edge*200)
  expect(hallRankValues('defense-constitution',3)?.next?.[0]?.value).toBe(BALANCE.hall.constitution*4)
  expect(hallRankValues('summons-command',5)?.current.map(v=>v.value)).toEqual([-3,2])
  expect(hallRankValues('hunt-salvage',5)?.current[0]?.value).toBe(5)
  expect(hallRankValues('offense-edge',6)).toBeNull()
  expect(hallRankValues('offense-war-master',1)).toBeNull()
})
