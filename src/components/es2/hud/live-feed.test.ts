import { describe, expect, it } from 'vitest'
import { createState } from '../../../game/state'
import type { GameState } from '../../../game/types'
import { emptyHud } from '../../../game/store'
import { buildLiveCombatHudFeed } from './live-feed'
import { projectCombatHud, type CombatHudFeed } from './model'

describe('authoritative combat HUD feed', () => {
  it('projects ONLY installed runtime evidence and keeps the origin snapshot', () => {
    const state = createState()
    state.mode = 'play'
    state.mobs.push({ type: 'boss', hp: 40, max: 100, bossPhase: 2 } as GameState['mobs'][number])
    const feed = buildLiveCombatHudFeed({
      state, snapshot: { runId: 'run-1', sequence: 3 },
      bossName: '月蝕之王', totalBossPhases: 3,
      wave: { cycle: 4, events: [{ id: 'stage-5', title: '第五波來襲' }] },
      objective: { status: 'active', progress: { label: '清除波次', current: 4, required: 8 } },
      comboCount: 12,
      relicInventory: { items: [{ id: 'relics:vampire-fang', stacks: 2 }] },
      statuses: [{ id: 'frozen', title: '冰封', kind: 'debuff', remainingSeconds: 1.2 }],
      notices: [{ id: 'hit:3', kind: 'critical', text: '暴擊 120' }],
    })
    expect(feed.snapshot).toEqual({ runId: 'run-1', sequence: 3 })
    expect(feed.boss).toEqual({ name: '月蝕之王', phase: 2, totalPhases: 3 })
    expect(feed.wave).toEqual({ number: 5, announcement: '第五波來襲' })
    expect(feed.combo).toEqual({ count: 12 })
    expect(feed.objectives).toEqual([{ id: 'mode-objective', title: '清除波次', progress: 4, target: 8, complete: false }])
    expect(feed.relics?.[0]).toMatchObject({ id: 'relics:vampire-fang', stacks: 2 })
    expect(feed.statuses?.[0]?.id).toBe('frozen')
    expect(feed.notices?.[0]?.id).toBe('hit:3')
  })

  it('omits unsupported optional data and removes a defeated boss', () => {
    const state = createState()
    expect(buildLiveCombatHudFeed({ state, snapshot: { runId: 'run-2', sequence: 1 } })).toEqual({
      snapshot: { runId: 'run-2', sequence: 1 },
    })
    state.mobs.push({ type: 'boss', hp: 0, max: 100, bossPhase: 3 } as GameState['mobs'][number])
    expect(buildLiveCombatHudFeed({ state, snapshot: { runId: 'run-2', sequence: 2 } }).boss).toBeUndefined()
  })

  it('rejects a feed from another run or older HUD revision without retaining old notices', () => {
    const hud = { ...emptyHud(), quest: '現行目標', bossPct: 70 }
    const feed: CombatHudFeed = {
      snapshot: { runId: 'old', sequence: 4 }, wave: { number: 7 },
      boss: { name: '過期首領', phase: 2 }, notices: [{ id: 'stale', kind: 'message', text: '過期通知' }],
    }
    const view = projectCombatHud(hud, 'knight', feed, { runId: 'new', sequence: 4 })
    expect(view.boss?.name).not.toBe('過期首領')
    expect(view.wave).toBeUndefined()
    expect(view.notices).toEqual([])
    expect(projectCombatHud(hud, 'knight', feed, { runId: 'old', sequence: 5 }).notices).toEqual([])
    expect(projectCombatHud(hud, 'knight', feed, { runId: 'old', sequence: 4 }).notices).toHaveLength(1)
  })

  it('clamps invalid counters, omits expired effects and bounds deduplicated notifications', () => {
    const hud = emptyHud()
    const notices = Array.from({ length: 24 }, (_, i) => ({ id: 'evt-' + i, kind: 'message' as const, text: '消息 ' + i }))
    notices.push({ id: 'evt-23', kind: 'message', text: '最新消息' })
    const view = projectCombatHud(hud, 'knight', {
      wave: { number: 0 }, combo: { count: -5 },
      statuses: [
        { id: 'expired', title: '已過期', kind: 'buff', remainingSeconds: 0 },
        { id: 'invalid', title: '無效', kind: 'buff', remainingSeconds: NaN },
        { id: 'live', title: '有效', kind: 'buff', remainingSeconds: 1.25 },
      ],
      notices,
    })
    expect(view.wave).toBeUndefined()
    expect(view.combo).toBeUndefined()
    expect(view.statuses.map(s => s.id)).toEqual(['live'])
    expect(view.notices.map(n => n.id)).toEqual(['evt-20', 'evt-21', 'evt-22', 'evt-23'])
    expect(view.notices.at(-1)?.text).toBe('最新消息')
  })
})
