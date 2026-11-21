import { describe, expect, it } from 'vitest'
import { getMode, hasWonRun, modeIds } from './modes'

describe('explicit game modes', () => {
  it('provides four configurable run modes', () => {
    expect(modeIds).toEqual(['quick', 'standard', 'endless', 'challenge'])
    expect(getMode('quick').duration).toBe(150)
    expect(getMode('standard').duration).toBe(480)
    expect(getMode('endless').duration).toBeNull()
    expect(getMode('challenge').modifiers.enemyDamage).toBeGreaterThan(1)
  })
  it('never wins while the required boss is alive', () => {
    expect(hasWonRun('quick', { seconds: 151, bossSpawned: true, bossDefeated: false })).toBe(false)
    expect(hasWonRun('quick', { seconds: 151, bossSpawned: true, bossDefeated: true })).toBe(true)
    expect(hasWonRun('quick', { seconds: 151, bossSpawned: false, bossDefeated: false })).toBe(false)
    expect(hasWonRun('standard', { seconds: 151, bossSpawned: true, bossDefeated: true })).toBe(false)
    expect(hasWonRun('standard', { seconds: 481, bossSpawned: true, bossDefeated: true })).toBe(true)
  })
  it('endless never ends from time, challenge requires a boss defeat', () => {
    expect(hasWonRun('endless', { seconds: 9999, bossSpawned: true, bossDefeated: true })).toBe(false)
    expect(hasWonRun('challenge', { seconds: 300, bossSpawned: true, bossDefeated: false })).toBe(false)
    expect(hasWonRun('challenge', { seconds: 300, bossSpawned: true, bossDefeated: true })).toBe(true)
  })
})
