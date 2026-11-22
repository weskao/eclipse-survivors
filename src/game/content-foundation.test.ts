import { describe, expect, it } from 'vitest'
import { createState, resetRun } from './state'
import { createHero } from './state'
import { UP } from './constants'
import { EVOLUTIONS } from './evolutions'
import { victoryConditionMet } from './combat'

describe('content foundation backward-compatibility', () => {
  it('keeps new content runtime state separate for each run', () => {
    const first = createState()
    const second = createState()
    expect(first.content).toEqual({ levels: {}, cooldowns: {}, effects: [] })
    first.content.levels['arcane:bolt'] = 2
    expect(second.content.levels['arcane:bolt']).toBeUndefined()
    first.choice = 'knight'
    resetRun(first)
    expect(first.content.levels).toEqual({})
    expect(first.content.cooldowns).toEqual({})
    expect(first.content.effects).toEqual([])
  })

  it('preserves fifteen old upgrades, five evolutions and boss-gated victories', () => {
    expect(UP).toHaveLength(15)
    expect(EVOLUTIONS).toHaveLength(5)
    const state = createState()
    state.hero = createHero('knight')
    state.time = 200
    state.bossSpawned = true
    state.mobs = [{ x: 0, y: 0, type: 'boss', hp: 1, max: 1, r: 40, speed: 0, dmg: 1, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }]
    expect(victoryConditionMet(state)).toBe(false)
  })
})
