import { describe, expect, it } from 'vitest'
import { advanceObjective, createObjectiveState, evaluateObjective, getObjectiveDifficulty } from './evaluator'
import type { ObjectiveEvent, ObjectiveState } from './evaluator'
import type { ObjectiveModeId } from '../modes/definitions'

const apply = (mode: ObjectiveModeId, events: ObjectiveEvent[]): ObjectiveState =>
  events.reduce(advanceObjective, createObjectiveState(mode))
const tick = (seconds: number): ObjectiveEvent => ({ type: 'tick', seconds })
const boss = (stage: number): ObjectiveEvent => ({ type: 'boss-defeated', stage })
const relic = (index: number): ObjectiveEvent => ({ type: 'relic-collected', index })
const wave = (index: number): ObjectiveEvent => ({ type: 'wave-cleared', index })

describe('objective state safety and deterministic reset', () => {
  it('starts every mode active with zero progress and separate state', () => {
    for (const mode of ['boss-rush','endless-eclipse','relic-hunt','cursed-expedition','chaos-arena'] as const) {
      const s = createObjectiveState(mode)
      expect(s).toMatchObject({ mode, status: 'active', seconds: 0, bosses: 0, relics: 0, waves: 0, majorEvents: 0, relicIntegrity: 100 })
      expect(evaluateObjective(s).rewards.embers).toBe(0)
      expect(evaluateObjective(s).rewards.achievements).toEqual([])
    }
    const progressed = advanceObjective(createObjectiveState('boss-rush'), tick(30))
    expect(createObjectiveState('boss-rush').seconds).toBe(0)
    expect(progressed.seconds).toBe(30)
  })

  it('rejects invalid time, event ordering and duplicate encounter completion', () => {
    const initial = createObjectiveState('boss-rush')
    expect(advanceObjective(initial, tick(-1))).toBe(initial)
    expect(advanceObjective(initial, tick(Number.POSITIVE_INFINITY))).toBe(initial)
    expect(advanceObjective(initial, boss(1))).toBe(initial)
    expect(advanceObjective(initial, boss(2))).toBe(initial)
    const one = apply('boss-rush', [tick(30), boss(1)])
    expect(advanceObjective(one, boss(1))).toBe(one)
    expect(advanceObjective(one, boss(3))).toBe(one)
    expect(one.bosses).toBe(1)
  })

  it('is referentially pure, replay-deterministic and ignores all events after terminal state', () => {
    const events = [tick(30), boss(1), tick(55), boss(2), tick(420)] as ObjectiveEvent[]
    expect(apply('boss-rush', events)).toEqual(apply('boss-rush', events))
    const first = createObjectiveState('boss-rush')
    const next = advanceObjective(first, tick(30))
    expect(first.seconds).toBe(0)
    expect(next.seconds).toBe(30)
    const lost = advanceObjective(next, { type: 'player-defeated' })
    expect(evaluateObjective(lost).defeatReason).toBe('fallen')
    expect(advanceObjective(lost, boss(1))).toBe(lost)
    expect(advanceObjective(lost, tick(200))).toBe(lost)
  })
})

describe('mode-specific victory, defeat and progress', () => {
  it('Boss Rush requires five staged, time-gated boss kills; no boss-liveness shortcuts', () => {
    const one = apply('boss-rush', [tick(25), boss(1)])
    expect(evaluateObjective(one).status).toBe('active')
    const won = apply('boss-rush', [tick(25), boss(1), tick(45), boss(2), tick(55), boss(3), tick(60), boss(4), tick(65), boss(5)])
    expect(won.bosses).toBe(5)
    expect(evaluateObjective(won)).toMatchObject({ status: 'victory', progress: { current: 5, required: 5 } })
    expect(evaluateObjective(won).rewards.achievements).toContain('objectives:boss-rush-clear')
    const lost = apply('boss-rush', [tick(480)])
    expect(evaluateObjective(lost)).toMatchObject({ status: 'defeat', defeatReason: 'timeout' })
    expect(evaluateObjective(lost).rewards.embers).toBe(0)
  })

  it('Endless Eclipse never wins from elapsed time or completed major events', () => {
    const s = apply('endless-eclipse', [tick(3600), { type: 'major-event-cleared', index: 1 }, { type: 'major-event-cleared', index: 2 }])
    expect(s.majorEvents).toBe(2)
    expect(evaluateObjective(s).status).toBe('active')
    expect(evaluateObjective(s).progress.required).toBeNull()
    const lost = advanceObjective(s, { type: 'player-defeated' })
    expect(evaluateObjective(lost).status).toBe('defeat')
    expect(evaluateObjective(lost).rewards.embers).toBeGreaterThan(0)
    expect(evaluateObjective(lost).rewards.achievements).toEqual([])
    const veteran = apply('endless-eclipse', [tick(900), ...[1,2,3,4,5].map(index => ({ type: 'major-event-cleared' as const, index })), { type: 'abandon' }])
    expect(evaluateObjective(veteran).rewards.achievements).toContain('objectives:endless-eclipse-veteran')
  })

  it('Relic Hunt requires four protected artifacts and a separately completed final boss', () => {
    const withRelics = apply('relic-hunt', [tick(220), relic(1), relic(2), relic(3), relic(4)])
    expect(evaluateObjective(withRelics).status).toBe('active')
    expect(evaluateObjective(withRelics).progress).toMatchObject({ current: 4, required: 5 })
    const won = advanceObjective(withRelics, boss(1))
    expect(evaluateObjective(won).status).toBe('victory')
    const broken = advanceObjective(withRelics, { type: 'relic-damaged', amount: 100 })
    expect(evaluateObjective(broken)).toMatchObject({ status: 'defeat', defeatReason: 'relic-lost' })
    expect(advanceObjective(broken, boss(1))).toBe(broken)
    expect(advanceObjective(createObjectiveState('relic-hunt'), { type: 'relic-damaged', amount: 50 }).relicIntegrity).toBe(100)
    expect(evaluateObjective(apply('relic-hunt', [tick(480)])).defeatReason).toBe('timeout')
  })

  it('Cursed Expedition requires survival and both timed wardens', () => {
    expect(evaluateObjective(apply('cursed-expedition', [tick(360)])).status).toBe('active')
    const near = apply('cursed-expedition', [tick(100), boss(1), tick(140), boss(2)])
    expect(evaluateObjective(near).status).toBe('active')
    const won = advanceObjective(near, tick(120))
    expect(evaluateObjective(won).status).toBe('victory')
    expect(evaluateObjective(apply('cursed-expedition', [tick(420)])).defeatReason).toBe('timeout')
    expect(getObjectiveDifficulty(advanceObjective(createObjectiveState('cursed-expedition'), tick(60))).activeModifier).not.toBe(
      getObjectiveDifficulty(createObjectiveState('cursed-expedition')).activeModifier,
    )
  })

  it('Chaos Arena requires all eight ordered waves and its final boss, not a global timer', () => {
    const waves = [tick(170), ...Array.from({ length: 8 }, (_, i) => wave(i + 1))]
    const withWaves = apply('chaos-arena', waves)
    expect(evaluateObjective(withWaves)).toMatchObject({ status: 'active', progress: { current: 8, required: 9 } })
    expect(evaluateObjective(advanceObjective(withWaves, boss(1))).status).toBe('victory')
    expect(advanceObjective(createObjectiveState('chaos-arena'), boss(1)).bosses).toBe(0)
    expect(evaluateObjective(apply('chaos-arena', [tick(330)])).defeatReason).toBe('timeout')
  })

  it('publishes distinct, finite and capped difficulty and rewards for each mode', () => {
    const ids = ['boss-rush','endless-eclipse','relic-hunt','cursed-expedition','chaos-arena'] as const
    const baseline = ids.map(id => getObjectiveDifficulty(createObjectiveState(id)))
    expect(new Set(baseline.map(x => x.enemyHp))).toHaveLength(5)
    for (const id of ids) {
      const s = advanceObjective(createObjectiveState(id), tick(60_000))
      const d = getObjectiveDifficulty(s)
      expect(d.enemyHp).toBeGreaterThan(0)
      expect(d.enemyHp).toBeLessThanOrEqual(8)
      expect(d.enemyDamage).toBeLessThanOrEqual(8)
      expect(d.spawnFrequency).toBeLessThanOrEqual(8)
    }
    const huge = apply('endless-eclipse', [tick(100_000_000), { type: 'abandon' }])
    expect(evaluateObjective(huge).rewards.embers).toBeLessThanOrEqual(1500)
  })
})
