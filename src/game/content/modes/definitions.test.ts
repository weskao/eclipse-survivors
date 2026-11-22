import { describe, expect, it } from 'vitest'
import { getObjectiveMode, objectiveModeIds, OBJECTIVE_MODES } from './definitions'

describe('independent replayable mode definitions', () => {
  it('declares exactly five additional modes without replacing legacy modes', () => {
    expect(objectiveModeIds).toEqual([
      'boss-rush', 'endless-eclipse', 'relic-hunt', 'cursed-expedition', 'chaos-arena',
    ])
    expect(new Set(objectiveModeIds).size).toBe(5)
    expect(Object.keys(OBJECTIVE_MODES)).toHaveLength(5)
  })

  it.each(objectiveModeIds)('%s provides visible objectives, failure rules, modifiers, and rewards', id => {
    const mode = getObjectiveMode(id)
    expect(mode.id).toBe(id)
    expect(mode.title.length).toBeGreaterThan(0)
    expect(mode.description.length).toBeGreaterThan(20)
    expect(mode.victoryDescription.length).toBeGreaterThan(10)
    expect(mode.defeatDescription.length).toBeGreaterThan(10)
    expect(mode.preRunModifiers.length).toBeGreaterThan(0)
    expect(mode.rewardEmbers).toBeGreaterThan(0)
    expect(mode.achievementId).toMatch(/^objectives:/)
    expect(mode.enemyHp).toBeGreaterThan(0)
    expect(mode.enemyDamage).toBeGreaterThan(0)
    expect(mode.spawnFrequency).toBeGreaterThan(0)
  })

  it('makes the endless no-win rule and finite-mode deadlines explicit', () => {
    expect(getObjectiveMode('endless-eclipse').timeLimitSeconds).toBeNull()
    expect(getObjectiveMode('endless-eclipse').victoryDescription).toContain('不會')
    for (const id of objectiveModeIds.filter(id => id !== 'endless-eclipse')) {
      expect(getObjectiveMode(id).timeLimitSeconds).toBeGreaterThan(0)
    }
    expect(getObjectiveMode('boss-rush').bossReadySeconds).toHaveLength(5)
    expect(getObjectiveMode('relic-hunt').relicReadySeconds).toHaveLength(4)
    expect(getObjectiveMode('chaos-arena').waveReadySeconds).toHaveLength(8)
  })
})
