import { describe, expect, it } from 'vitest'
import { BOSS_ATTACKS, BOSS_DEFINITIONS, type BossId } from './definitions'
import { createBossEncounterController, type BossSnapshot, type BossTelegraph, MAX_BOSS_IMPACTS } from './controller'
import { drawBossImpacts, drawBossTelegraphs } from './render'
import { createFakeCtx } from '../../render/fakes'
import { createHero, createState } from '../../state'
import type { GameHooks } from '../../types'

const hooks: GameHooks = { end() {}, message() {}, offerUpgrades() {}, sfx() {} }

describe('boss attack presentation contract', () => {
  it.each(Object.keys(BOSS_DEFINITIONS) as BossId[])('%s: animates warning, release and bounded aftermath without altering damage geometry', id => {
    const state = createState()
    state.mode = 'play'
    state.hero = createHero('knight')
    const controller = createBossEncounterController()
    controller.spawn(state, id, { x: 180, y: 0 }, hooks)
    controller.tick(state, 0.01, hooks)
    const initial = controller.snapshot(state)
    expect(initial.telegraphs.length).toBeGreaterThan(0)
    expect(initial.telegraphs.every(t => t.stage === 'warning' && t.progress! >= 0 && t.progress! <= 1)).toBe(true)
    const first = initial.telegraphs[0]!
    const windup = BOSS_ATTACKS[first.attackId as keyof typeof BOSS_ATTACKS].windup
    controller.tick(state, windup / 2, hooks)
    const next = controller.snapshot(state).telegraphs[0]!
    expect(next.progress).toBeGreaterThan(first.progress!)
    expect({ x: next.x, y: next.y, angle: next.angle, radius: next.radius }).toEqual({
      x: first.x, y: first.y, angle: first.angle, radius: first.radius,
    })
    controller.tick(state, windup, hooks)
    const released = controller.snapshot(state)
    expect(released.impacts?.length).toBeGreaterThan(0)
    expect(released.impacts!.length).toBeLessThanOrEqual(MAX_BOSS_IMPACTS)
    expect(released.impacts![0]).toMatchObject({ attackId: first.attackId, max: 0.56 })
    controller.tick(state, 0.7, hooks)
    expect(controller.snapshot(state).impacts).toHaveLength(0)
    controller.onContentEvent(state, { type: 'reset' }, hooks)
    expect(controller.snapshot(state).impacts).toEqual([])
  })

  it('renders all 25 distinct attack geometries with warnings, active hazards and non-flashing release art', () => {
    const attacks = Object.entries(BOSS_ATTACKS)
    expect(attacks).toHaveLength(25)
    for (const [attackId, attack] of attacks) {
      const telegraph: BossTelegraph = {
        attackId, shape: attack.shape, x: 400, y: 300,
        radius: attack.radius, innerRadius: attack.innerRadius ?? 0, width: attack.width ?? 0,
        length: attack.length ?? 0, angle: Math.PI / 6, safeAngle: Math.PI / 2,
        damage: attack.damage, color: '#a58aff', harmless: attack.kind === 'summon',
        stage: 'warning', progress: 0.65,
      }
      const snapshot: BossSnapshot = {
        id: 'abyss-monarch', phase: 2, telegraphs: [telegraph], projectiles: [],
        impacts: [{ ...telegraph, life: 0.3, max: 0.56 }],
      }
      const full = createFakeCtx()
      expect(() => {
        drawBossTelegraphs(full.ctx, snapshot, 0, 0, false)
        drawBossImpacts(full.ctx, snapshot, 0, 0, false)
      }, attackId).not.toThrow()
      expect(full.calls.some(call => call === 'stroke' || call === 'fill'), attackId).toBe(true)
      const reduced = createFakeCtx()
      expect(() => {
        drawBossTelegraphs(reduced.ctx, snapshot, 0, 0, true)
        drawBossImpacts(reduced.ctx, snapshot, 0, 0, true)
      }, attackId).not.toThrow()
      expect(reduced.calls.filter(call => call === 'stroke' || call === 'fill').length, attackId)
        .toBeLessThanOrEqual(full.calls.filter(call => call === 'stroke' || call === 'fill').length)
    }
  })

  it('culls distant geometry without painting and draws an explicit safe sector for arena attacks', () => {
    const telegraph: BossTelegraph = {
      attackId: 'rotating-shelter', shape: 'arena', x: 100, y: 100, radius: 220,
      innerRadius: 0, width: 0, length: 0, angle: 0, safeAngle: 0,
      damage: 12, color: '#9cddff', harmless: false, stage: 'warning', progress: 0.5,
    }
    const off = createFakeCtx()
    drawBossTelegraphs(off.ctx, { id: 'frost-sovereign', phase: 2,
      telegraphs: [{ ...telegraph, x: -6000, y: -6000 }], projectiles: [], impacts: [],
    }, 0, 0, false, 800, 600)
    expect(off.calls).not.toContain('fill')
    expect(off.calls).not.toContain('stroke')
    const live = createFakeCtx()
    drawBossTelegraphs(live.ctx, { id: 'frost-sovereign', phase: 2,
      telegraphs: [telegraph], projectiles: [], impacts: [],
    }, 0, 0, false)
    expect(live.calls).toContain('arc')
    expect(live.calls).toContain('stroke')
  })
})
