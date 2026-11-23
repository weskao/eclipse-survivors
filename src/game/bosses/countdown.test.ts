import { describe, expect, it } from 'vitest'
import { createObjectiveState } from '../content/objectives/evaluator'
import { createHero, createState } from '../state'
import { spawnMob } from '../spawn'
import { getBossArrivalWarning } from './countdown'

describe('boss arrival warning uses gameplay clocks and actual spawn rules', () => {
  it('appears only in the final 15 seconds of a timed boss encounter', () => {
    const state = createState()
    state.mode = 'play'
    state.runMode = 'quick'
    state.time = 76
    expect(getBossArrivalWarning(state, null)).toBeNull()
    state.time = 77
    expect(getBossArrivalWarning(state, null)).toMatchObject({ seconds: 15, bossId: 'abyss-monarch' })
    state.time = 88.3
    expect(getBossArrivalWarning(state, null)).toMatchObject({ seconds: 4, urgent: true })
    state.mode = 'paused'
    expect(getBossArrivalWarning(state, null)).toBeNull()
  })

  it('hides for already-spawned/alive encounters and unsupported endless modes', () => {
    const state = createState()
    state.mode = 'play'
    state.runMode = 'quick'
    state.time = 89
    state.bossSpawned = true
    expect(getBossArrivalWarning(state, null)).toBeNull()
    state.bossSpawned = false
    state.hero = createHero('knight')
    spawnMob(state, 'boss')
    expect(getBossArrivalWarning(state, null)).toBeNull()
    state.mobs = []
    state.runMode = 'endless-eclipse'
    expect(getBossArrivalWarning(state, createObjectiveState('endless-eclipse'))).toBeNull()
  })

  it('respects the staged objective schedule and does not promise unmet prerequisites', () => {
    const state = createState()
    state.mode = 'play'
    state.runMode = 'boss-rush'
    state.time = 10
    expect(getBossArrivalWarning(state, createObjectiveState('boss-rush'))).toMatchObject({
      seconds: 15, bossId: 'abyss-monarch',
    })
    state.runMode = 'relic-hunt'
    state.time = 210
    expect(getBossArrivalWarning(state, createObjectiveState('relic-hunt'))).toBeNull()
    state.runMode = 'chaos-arena'
    state.time = 165
    expect(getBossArrivalWarning(state, createObjectiveState('chaos-arena'))).toBeNull()
  })
})
