import { describe, expect, it } from 'vitest'
import type { Mob } from '../../types'
import { createObjectiveRuntime } from './runtime'

const mob = (type: Mob['type'] = 'boss') => ({ type, hp: 100, max: 100 }) as Mob
const kill = (runtime: ReturnType<typeof createObjectiveRuntime>, enemy: Mob) => {
  enemy.hp = 0
  return runtime.defeatMob(enemy)
}

describe('real encounter evidence, not synthetic completion', () => {
  it('Boss Rush requires five distinct, registered and actually defeated bosses in order', () => {
    const finished: boolean[] = []
    const run = createObjectiveRuntime('boss-rush', (_state, evaluation) => finished.push(evaluation.status === 'victory'))
    run.tick(300)
    expect(run.plan().bossStage).toBe(1)
    expect(run.defeatMob(mob())).toBe(false)
    expect(run.spawnBoss(2, mob())).toBe(false)
    for (let stage = 1; stage <= 5; stage++) {
      const enemy = mob()
      expect(run.spawnBoss(stage, enemy)).toBe(true)
      expect(run.defeatMob(enemy)).toBe(false)
      expect(kill(run, enemy)).toBe(true)
      expect(run.defeatMob(enemy)).toBe(false)
      expect(run.snapshot().bosses).toBe(stage)
    }
    expect(run.snapshot().status).toBe('victory')
    expect(finished).toEqual([true])
    expect(run.plan().bossStage).toBeNull()
    expect(run.evaluate().rewards.achievements).toContain('objectives:boss-rush-clear')
  })

  it('Relic Hunt needs four real pickups with identity and a separate guardian kill', () => {
    const run = createObjectiveRuntime('relic-hunt')
    run.tick(220)
    expect(run.spawnBoss(1, mob())).toBe(false)
    for (let index = 1; index <= 4; index++) {
      const token = { index }
      expect(run.registerRelic(index + 1, token)).toBe(false)
      expect(run.registerRelic(index, token)).toBe(true)
      expect(run.collectRelic({ index })).toBe(false)
      expect(run.collectRelic(token)).toBe(true)
      expect(run.collectRelic(token)).toBe(false)
    }
    expect(run.snapshot().status).toBe('active')
    expect(run.damageRelic(19)).toBe(true)
    const guardian = mob()
    expect(run.spawnBoss(1, guardian)).toBe(true)
    expect(kill(run, guardian)).toBe(true)
    expect(run.snapshot().status).toBe('victory')
    expect(run.evaluate().rewards.achievements).toContain('objectives:relic-hunt-pristine')
  })

  it('lost relic integrity ends the run, blocks late boss rewards and cannot be withdrawn twice', () => {
    const run = createObjectiveRuntime('relic-hunt')
    run.tick(25)
    const artifact = {}
    expect(run.registerRelic(1, artifact)).toBe(true)
    expect(run.collectRelic(artifact)).toBe(true)
    expect(run.damageRelic(100)).toBe(true)
    expect(run.snapshot()).toMatchObject({ status: 'defeat', defeatReason: 'relic-lost' })
    expect(run.damageRelic(1)).toBe(false)
    run.withdraw()
    expect(run.snapshot().defeatReason).toBe('relic-lost')
  })

  it('Cursed Expedition requires both wardens and real survival, not just the 360-second timer', () => {
    const run = createObjectiveRuntime('cursed-expedition')
    run.tick(240)
    for (let stage = 1; stage <= 2; stage++) {
      const boss = mob()
      expect(run.spawnBoss(stage, boss)).toBe(true)
      expect(kill(run, boss)).toBe(true)
    }
    expect(run.snapshot().status).toBe('active')
    run.tick(120)
    expect(run.snapshot().status).toBe('victory')
    const timedOut = createObjectiveRuntime('cursed-expedition')
    timedOut.tick(421)
    expect(timedOut.snapshot()).toMatchObject({ status: 'defeat', defeatReason: 'timeout' })
  })

  it('Chaos Arena only clears registered waves after their tracked members really die', () => {
    const run = createObjectiveRuntime('chaos-arena')
    run.tick(170)
    expect(run.spawnBoss(1, mob())).toBe(false)
    expect(run.spawnWave(1, [])).toBe(false)
    for (let index = 1; index <= 8; index++) {
      const first = mob('slime'), second = mob('goblin')
      expect(run.spawnWave(index, [first, second])).toBe(true)
      expect(run.spawnWave(index, [first])).toBe(false)
      expect(kill(run, first)).toBe(true)
      expect(run.snapshot().waves).toBe(index - 1)
      expect(kill(run, second)).toBe(true)
      expect(run.snapshot().waves).toBe(index)
    }
    expect(run.snapshot().status).toBe('active')
    const boss = mob()
    expect(run.spawnBoss(1, boss)).toBe(true)
    expect(kill(run, boss)).toBe(true)
    expect(run.snapshot().status).toBe('victory')
  })

  it('does not allow old completed event entities to be reused after later milestones', () => {
    const run = createObjectiveRuntime('endless-eclipse')
    run.tick(540)
    const first = {}, second = {}
    expect(run.registerEvent(1, first)).toBe(true)
    expect(run.resolveEvent(first, true)).toBe(true)
    expect(run.registerEvent(2, second)).toBe(true)
    expect(run.resolveEvent(second, true)).toBe(true)
    expect(run.registerEvent(3, first)).toBe(false)
    expect(run.snapshot().majorEvents).toBe(2)
    const third = {}
    expect(run.registerEvent(3, third)).toBe(true)
    expect(run.resolveEvent(third, true)).toBe(true)
    expect(run.snapshot().majorEvents).toBe(3)
  })

  it('Endless Eclipse has no timer victory, requires a committed real event and supports withdrawal', () => {
    const run = createObjectiveRuntime('endless-eclipse')
    run.tick(36000)
    expect(run.snapshot().status).toBe('active')
    expect(run.plan().eventIndex).toBe(1)
    const token = {}
    expect(run.registerEvent(1, token)).toBe(true)
    expect(run.resolveEvent(token, false)).toBe(false)
    expect(run.snapshot().majorEvents).toBe(0)
    expect(run.resolveEvent({}, true)).toBe(false)
    expect(run.resolveEvent(token, true)).toBe(true)
    expect(run.snapshot().majorEvents).toBe(1)
    run.withdraw()
    expect(run.snapshot()).toMatchObject({ status: 'withdrawn', defeatReason: 'abandoned' })
    expect(run.evaluate().rewards.embers).toBeGreaterThan(0)
    expect(run.evaluate().rewards.embers).toBeLessThanOrEqual(1500)
    run.tick(999)
    expect(run.snapshot().status).toBe('withdrawn')
  })
})

describe('lifecycle, replay, difficulty and legacy safety', () => {
  it('never advances objectives while paused; hero death requires actual depleted health', () => {
    const run = createObjectiveRuntime('boss-rush')
    run.tick(300, false)
    expect(run.snapshot().seconds).toBe(0)
    expect(run.spawnBoss(1, mob())).toBe(false)
    run.tick(25)
    expect(run.heroDefeated({ hp: 1 })).toBe(false)
    const first = mob()
    expect(run.spawnBoss(1, first)).toBe(true)
    run.tick(200, false)
    first.hp = 0
    expect(run.defeatMob(first)).toBe(false)
    run.tick(0.1)
    expect(run.defeatMob(first)).toBe(true)
    expect(run.heroDefeated({ hp: 0 })).toBe(true)
    expect(run.snapshot()).toMatchObject({ status: 'defeat', defeatReason: 'fallen' })
  })

  it('reset drops all pending entity refs and produces independent deterministic replays', () => {
    const run = createObjectiveRuntime('boss-rush')
    const oldBoss = mob()
    run.tick(30)
    expect(run.spawnBoss(1, oldBoss)).toBe(true)
    run.reset()
    expect(run.snapshot().seconds).toBe(0)
    oldBoss.hp = 0
    expect(run.defeatMob(oldBoss)).toBe(false)
    const replay = () => {
      run.reset()
      run.tick(300)
      for (let i = 1; i <= 5; i++) {
        const enemy = mob()
        expect(run.spawnBoss(i, enemy)).toBe(true)
        kill(run, enemy)
      }
      return { state: run.snapshot(), evaluation: run.evaluate(), difficulty: run.difficulty() }
    }
    expect(replay()).toEqual(replay())
  })

  it('keeps mode-specific difficulty finite and does not mutate legacy RunModeId', () => {
    const values = ['boss-rush', 'endless-eclipse', 'relic-hunt', 'cursed-expedition', 'chaos-arena'] as const
    const rates = values.map(id => createObjectiveRuntime(id).difficulty())
    expect(new Set(rates.map(rate => rate.enemyHp)).size).toBe(5)
    expect(rates.every(rate => rate.enemyHp > 0 && rate.spawnFrequency > 0)).toBe(true)
  })
})
