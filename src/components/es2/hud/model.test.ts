import { describe, expect, it } from 'vitest'
import { emptyHud, type HudView } from '../../../game/store'
import { projectCombatHud } from './model'

const current: HudView = {
  ...emptyHud(),
  who: '騎士 · LV.8',
  hpPct: 62.5,
  hpLabel: '生命 125 / 200',
  xpPct: 45,
  kill: 118,
  timer: '04:30',
  bossPct: 33.5,
  quest: '擊敗首領',
  skills: [{
    id: 'bolt', icon: '⚡', title: '雷擊', rarity: 'rare',
    level: 3, maxLevel: 5, cooldown: 1.2, cooldownPct: 60, evolved: false,
  }],
}

describe('combat HUD projection', () => {
  it('projects live foundation HudView values rather than demo placeholders', () => {
    const result = projectCombatHud(current, 'knight')
    expect(result.identity).toBe('騎士 · LV.8')
    expect(result.health).toEqual({ percent: 62.5, label: '生命 125 / 200' })
    expect(result.experience).toBe(45)
    expect(result.kills).toBe(118)
    expect(result.timer).toBe('04:30')
    expect(result.objective).toBe('擊敗首領')
    expect(result.boss).toEqual({ percent: 33.5, name: '首領', phase: undefined, totalPhases: undefined })
    expect(result.skills[0]).toMatchObject({ id: 'bolt', cooldown: 1.2, cooldownPct: 60, level: 3 })
    expect(result.wave).toBeUndefined()
    expect(result.combo).toBeUndefined()
    expect(result.relics).toEqual([])
    expect(result.statuses).toEqual([])
    expect(result.notices).toEqual([])
    expect(result.objectives).toEqual([])
  })

  it('shows optional fields only when the integration adapter supplies them', () => {
    const result = projectCombatHud(current, 'knight', {
      boss: { name: '深淵君主', phase: 2, totalPhases: 3 },
      wave: { number: 4, announcement: '精英群襲來' },
      combo: { count: 12 },
      relics: [{ id: 'r1', title: '破曉徽印', icon: '✦', rarity: 'legendary' }],
      statuses: [{ id: 'buff1', title: '神聖祝福', kind: 'buff', remainingSeconds: 4.6 }],
      objectives: [{ id: 'obj1', title: '守護聖壇', progress: 2, target: 3 }],
      notices: [{ id: 'hit1', kind: 'critical', text: '暴擊 280' }, { id: 'chest1', kind: 'treasure', text: '獲得寶箱' }],
    })
    expect(result.boss).toEqual({ percent: 33.5, name: '深淵君主', phase: 2, totalPhases: 3 })
    expect(result.wave?.number).toBe(4)
    expect(result.combo?.count).toBe(12)
    expect(result.relics).toHaveLength(1)
    expect(result.statuses).toHaveLength(1)
    expect(result.notices).toHaveLength(2)
    expect(result.objectives).toHaveLength(1)
  })

  it('does not advertise a dead boss or manufactured cooldowns, and bounds unsafe percentages', () => {
    const result = projectCombatHud({
      ...current,
      hpPct: Infinity,
      xpPct: -20,
      bossPct: null,
      skills: [{ ...current.skills[0]!, cooldown: -3, cooldownPct: 180 }],
    }, 'knight', { boss: { name: '不應出現' } })
    expect(result.health.percent).toBe(0)
    expect(result.experience).toBe(0)
    expect(result.boss).toBeNull()
    expect(result.skills[0]?.cooldown).toBe(0)
    expect(result.skills[0]?.cooldownPct).toBe(100)
    expect(current.skills[0]?.cooldown).toBe(1.2)
  })
})
