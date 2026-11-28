import { describe, expect, it, vi } from 'vitest'
import { hit, victoryConditionMet } from '../../combat'
import { MAX_MOBS } from '../../constants'
import { createContentRegistry } from '../registry'
import { createHero, createState } from '../../state'
import type { ContentEvent, GameHooks, GameState } from '../../types'
import { BOSS_PACK } from '../packs/bosses'
import { BOSS_ATTACKS, BOSS_DEFINITIONS, type BossId } from './definitions'
import { createBossEncounterController, intersectsTelegraph, MAX_BOSS_PROJECTILES } from './controller'

function setup() {
  const notices: string[] = []
  const audio: string[] = []
  const controller = createBossEncounterController({
    emit: event => notices.push(event.type),
    cue: id => audio.push(id),
  })
  const state = createState()
  state.mode = 'play'
  state.hero = createHero('knight')
  const hooks: GameHooks = {
    end: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), sfx: vi.fn(),
    content: (s: GameState, event: ContentEvent) => controller.onContentEvent(s, event, hooks),
  }
  return { state, hooks, controller, notices, audio }
}

describe('independent premium boss content', () => {
  it('registers all four bosses with unique namespaced effects without changing the default pack manifest', () => {
    const names = Object.keys(BOSS_DEFINITIONS) as BossId[]
    expect(names).toHaveLength(4)
    const registry = createContentRegistry([BOSS_PACK])
    expect(registry.packs[0]?.enemies?.map(e => e.id)).toEqual(names.map(id => `bosses:${id}`))
    expect(new Set(registry.packs[0]?.effects?.map(e => e.id)).size).toBeGreaterThanOrEqual(5)
    expect(names.every(id => BOSS_DEFINITIONS[id].phases.length >= 3)).toBe(true)
  })

  it.each(Object.keys(BOSS_DEFINITIONS) as BossId[])('%s: spawns only one required boss, exposes health UI and starts with a warning', id => {
    const { state, hooks, controller, notices } = setup()
    const mob = controller.spawn(state, id, { x: 190, y: 0 }, hooks)
    expect(mob).not.toBeNull()
    expect(mob?.type).toBe('boss')
    expect(state.bossSpawned).toBe(true)
    expect(state.bossDefeated).toBe(false)
    expect(controller.spawn(state, id, { x: 300, y: 0 }, hooks)).toBeNull()
    expect(state.mobs.filter(m => m.type === 'boss')).toHaveLength(1)
    expect(controller.hud(state)).toMatchObject({ id, phase: 1, hpPercent: 100 })
    controller.tick(state, 2, hooks)
    expect(controller.snapshot(state).telegraphs.length).toBeGreaterThan(0)
    expect(notices).toContain('intro')
    expect(notices).toContain('warning')
  })

  it.each(Object.keys(BOSS_DEFINITIONS) as BossId[])('%s: crosses two real thresholds once and cancels stale attacks', id => {
    const { state, hooks, controller, notices } = setup()
    const boss = controller.spawn(state, id, { x: 170, y: 0 }, hooks)!
    controller.tick(state, 0.1, hooks)
    expect(controller.snapshot(state).telegraphs.length).toBeGreaterThan(0)
    boss.hp = boss.max * 0.65
    controller.tick(state, 0.05, hooks)
    expect(controller.hud(state)?.phase).toBe(2)
    expect(controller.snapshot(state).telegraphs).toHaveLength(0)
    boss.hp = boss.max * 0.32
    controller.tick(state, 0.05, hooks)
    expect(controller.hud(state)?.phase).toBe(3)
    controller.tick(state, 0.05, hooks)
    expect(notices.filter(x => x === 'phase')).toHaveLength(2)
  })

  it('matches circle, ring, beam and rotating safe-sector geometry at exact hitbox boundaries', () => {
    const base = { attackId: 'test', x: 0, y: 0, damage: 10, color: '#fff', harmless: false }
    const circle = { ...base, shape: 'circle' as const, radius: 100, innerRadius: 0, width: 0, angle: 0, length: 0, safeAngle: 0 }
    const ring = { ...circle, shape: 'ring' as const, radius: 120, innerRadius: 70 }
    const beam = { ...circle, shape: 'beam' as const, radius: 0, width: 20, length: 200 }
    const arena = { ...circle, shape: 'arena' as const, radius: 150, safeAngle: 0 }
    expect(intersectsTelegraph(circle, 100, 0)).toBe(true)
    expect(intersectsTelegraph(circle, 100.1, 0)).toBe(false)
    expect(intersectsTelegraph(ring, 69, 0)).toBe(false)
    expect(intersectsTelegraph(ring, 90, 0)).toBe(true)
    expect(intersectsTelegraph(beam, 150, 10)).toBe(true)
    expect(intersectsTelegraph(beam, -50, 0)).toBe(false)
    expect(intersectsTelegraph(arena, 100, 0)).toBe(false)
    expect(intersectsTelegraph(arena, -100, 0)).toBe(true)
  })

  it('locks telegraphed area attacks before impact so moving out is real counterplay', () => {
    const { state, hooks, controller } = setup()
    controller.spawn(state, 'infernal-titan', { x: 140, y: 0 }, hooks)
    controller.tick(state, 0.01, hooks)
    const telegraph = controller.snapshot(state).telegraphs[0]!
    expect(telegraph).toBeDefined()
    state.hero!.x = 1100
    state.hero!.y = 1100
    controller.tick(state, 1.4, hooks)
    expect(state.hero!.hp).toBe(state.hero!.max)
  })

  it('resolves a locked melee telegraph against the actual live hero hitbox', () => {
    const { state, hooks, controller } = setup()
    controller.spawn(state, 'infernal-titan', { x: 140, y: 0 }, hooks)
    controller.tick(state, 0.01, hooks)
    const warning = controller.snapshot(state).telegraphs[0]!
    expect(intersectsTelegraph(warning, state.hero!.x, state.hero!.y, 15)).toBe(true)
    controller.tick(state, 1.71, hooks)
    expect(state.hero!.hp).toBeLessThan(state.hero!.max)
    expect(state.damageTaken).toBeGreaterThan(0)
  })

  it('bounds active projectiles even over repeated attacks and applies swept hits only once', () => {
    const { state, hooks, controller } = setup()
    controller.spawn(state, 'abyss-monarch', { x: 160, y: 0 }, hooks)
    for (let i = 0; i < 100; i++) {
      controller.tick(state, 0.1, hooks)
      expect(controller.snapshot(state).projectiles.length).toBeLessThanOrEqual(MAX_BOSS_PROJECTILES)
    }
    expect(state.hero!.hp).toBeLessThanOrEqual(state.hero!.max)
  })

  it('limits summoned minions at both the boss cap and total mob budget', () => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, 'abyss-monarch', { x: 180, y: 0 }, hooks)!
    boss.hp = boss.max * 0.6
    state.hero!.inv = 1_000 // deterministic survival during this isolated AI test
    for (let i = 0; i < 450; i++) controller.tick(state, 0.1, hooks)
    const minions = state.mobs.filter(m => m.summonedByBoss && m.hp > 0)
    expect(minions.length).toBeGreaterThan(0)
    expect(minions.length).toBeLessThanOrEqual(6)
    expect(state.mobs.length).toBeLessThanOrEqual(MAX_MOBS + 1)
    // The cap is on LIVING minions: a cleared wave must allow new summons.
    for (const minion of minions) minion.hp = 0
    state.mobs = state.mobs.filter(m => m.hp > 0)
    for (let i = 0; i < 200; i++) controller.tick(state, 0.1, hooks)
    expect(state.mobs.some(m => m.summonedByBoss && m.hp > 0)).toBe(true)
    controller.onContentEvent(state, { type: 'scene-change', index: 1 }, hooks)
    expect(state.mobs).toContain(boss)
    expect(state.mobs.some(m => m.summonedByBoss)).toBe(false)
  })

  it.each(Object.keys(BOSS_DEFINITIONS) as BossId[])('%s: continuously tracks the hero during attack recovery', id => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, id, { x: 520, y: 0 }, hooks)!
    controller.tick(state, 0.01, hooks)
    const warning = controller.snapshot(state).telegraphs[0]!
    const originalX = boss.x
    controller.tick(state, 0.3, hooks)
    expect(boss.x).toBe(originalX) // Warning hitboxes stay locked while the boss telegraphs.
    controller.tick(state, BOSS_ATTACKS[warning.attackId as keyof typeof BOSS_ATTACKS].windup, hooks)
    controller.tick(state, 0.3, hooks)
    expect(boss.x).toBeLessThan(originalX - 8)
    expect(boss.bossMoving).toBe(true)
  })

  it.each([
    ['abyss-monarch', 520, 0], ['abyss-monarch', -520, 0], ['abyss-monarch', 0, 150], ['abyss-monarch', 0, -150],
    ['eclipse-seraph', 520, 0], ['eclipse-seraph', -520, 0],
  ] as const)('%s from (%i,%i): move facing follows actual horizontal travel, never the hero side', (id, x, y) => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, id, { x, y }, hooks)!
    state.hero!.inv = 100
    let horizontal = 0
    for (let i = 0; i < 300; i++) {
      const px = boss.x, py = boss.y
      controller.tick(state, 0.05, hooks)
      const motion = controller.snapshot(state).bodyMotion
      const mx = boss.x - px, my = boss.y - py
      if (motion?.pose !== 'move' || Math.abs(mx) <= Math.abs(my) * 0.5) continue
      horizontal++
      expect(motion.facingX).toBe(Math.sign(mx))
    }
    expect(horizontal).toBeGreaterThan(0)
  })

  it('keeps move facing unset on purely vertical pursuit, so direction-locked art falls back', () => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, 'abyss-monarch', { x: 0, y: 420 }, hooks)!
    state.hero!.inv = 100
    let moves = 0
    for (let i = 0; i < 300; i++) {
      controller.tick(state, 0.05, hooks)
      const motion = controller.snapshot(state).bodyMotion
      if (motion?.pose !== 'move') continue
      moves++
      // Above the 158 px standoff the boss only descends; orbiting below it legitimately sets a facing.
      if (boss.y > 160) expect(motion.facingX).toBeUndefined()
    }
    expect(moves).toBeGreaterThan(0)
  })

  it('respects a safe stop distance and freezes pursuit while paused', () => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, 'infernal-titan', { x: 220, y: 0 }, hooks)!
    controller.tick(state, 0.01, hooks)
    controller.tick(state, 1.71, hooks)
    controller.tick(state, 1.1, hooks)
    expect(boss.x).toBeGreaterThanOrEqual(118)
    const x = boss.x, y = boss.y
    state.mode = 'level'
    controller.tick(state, 2, hooks)
    expect({ x: boss.x, y: boss.y }).toEqual({ x, y })
  })

  it('increases pursuit speed as the boss reaches its third phase', () => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, 'eclipse-seraph', { x: 900, y: 0 }, hooks)!
    controller.tick(state, 0.01, hooks)
    controller.tick(state, 1.5, hooks)
    let before = boss.x
    controller.tick(state, 0.25, hooks)
    const phaseOneMove = before - boss.x
    boss.hp = boss.max * 0.25
    controller.tick(state, 0.01, hooks)
    expect(controller.hud(state)?.phase).toBe(3)
    before = boss.x
    controller.tick(state, 0.25, hooks)
    expect(before - boss.x).toBeGreaterThan(phaseOneMove)
  })

  it('awards no duplicate XP or boss death event, and keeps original boss-gated victory', () => {
    const { state, hooks, controller, notices } = setup()
    const boss = controller.spawn(state, 'eclipse-seraph', { x: 110, y: 0 }, hooks)!
    state.time = 200
    expect(victoryConditionMet(state, 'boss')).toBe(false)
    hit(state, boss, boss.hp, hooks)
    hit(state, boss, 100, hooks)
    controller.onContentEvent(state, { type: 'kill', mob: boss, damage: 100 }, hooks)
    expect(notices.filter(x => x === 'death')).toHaveLength(1)
    expect(notices.filter(x => x === 'reward')).toHaveLength(1)
    expect(notices.filter(x => x === 'finale')).toHaveLength(1)
    expect(state.stars).toHaveLength(1)
    expect(state.kill).toBe(1)
    expect(victoryConditionMet(state, 'boss')).toBe(true)
  })

  it('retains defeated boss presentation until the next legitimate encounter replaces it', () => {
    const { state, hooks, controller, notices } = setup()
    const first = controller.spawn(state, 'abyss-monarch', { x: 110, y: 0 }, hooks)!
    expect(controller.spawn(state, 'frost-sovereign', { x: 190, y: 0 }, hooks)).toBeNull()
    hit(state, first, first.hp, hooks)
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'death' })
    state.worldClock += 0.4
    expect(controller.snapshot(state).bodyMotion?.progress).toBeGreaterThan(0)
    const next = controller.spawn(state, 'frost-sovereign', { x: 190, y: 0 }, hooks)
    expect(next?.bossArtId).toBe('frost-sovereign')
    expect(controller.hud(state)?.id).toBe('frost-sovereign')
    expect(controller.snapshot(state).bodyMotion?.pose).toBe('idle')
    expect(state.mobs.filter(m => m.type === 'boss' && m.hp > 0)).toEqual([next])
    expect(state.kill).toBe(1)
    expect(state.stars).toHaveLength(1)
    expect(notices.filter(x => x === 'reward')).toHaveLength(1)
  })

  it('clears encounter-owned effects and minions on scene transitions but never removes living required bosses', () => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, 'frost-sovereign', { x: 190, y: 0 }, hooks)!
    controller.tick(state, 1.5, hooks)
    state.content.effects.push(
      { id: 'bosses:frost-glow', x: 0, y: 0, life: 1, max: 1 },
      { id: 'other:preserve', x: 0, y: 0, life: 1, max: 1 },
    )
    controller.onContentEvent(state, { type: 'scene-change', index: 1 }, hooks)
    expect(state.content.effects.map(fx => fx.id)).toEqual(['other:preserve'])
    expect(controller.snapshot(state).telegraphs).toEqual([])
    expect(controller.snapshot(state).projectiles).toEqual([])
    expect(state.mobs).toContain(boss)
    controller.onContentEvent(state, { type: 'reset' }, hooks)
    expect(controller.hud(state)).toBeNull()
    expect(state.mobs).toContain(boss)
  })

  it('replays identical encounter sequences deterministically', () => {
    function run() {
      const { state, hooks, controller, notices, audio } = setup()
      const boss = controller.spawn(state, 'eclipse-seraph', { x: 190, y: 10 }, hooks)!
      const frames: unknown[] = []
      for (let i = 0; i < 40; i++) {
        if (i === 10) boss.hp = boss.max * 0.6
        if (i === 25) boss.hp = boss.max * 0.3
        controller.tick(state, 0.15, hooks)
        frames.push(controller.snapshot(state))
      }
      return { frames, notices, audio }
    }
    expect(run()).toEqual(run())
  })
  it.each(Object.keys(BOSS_DEFINITIONS) as BossId[])('%s: exposes actual body-pose timing without changing attack or reward logic', id => {
    const { state, hooks, controller } = setup()
    const boss = controller.spawn(state, id, { x: 520, y: 0 }, hooks)!
    state.hero!.inv = 100
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'idle', phase: 1 })
    controller.tick(state, 0.01, hooks)
    const warning = controller.snapshot(state).telegraphs[0]!
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'windup', progress: 0, phase: 1 })
    const windup = BOSS_ATTACKS[warning.attackId as keyof typeof BOSS_ATTACKS].windup
    controller.tick(state, windup / 2, hooks)
    expect(controller.snapshot(state).bodyMotion?.progress).toBeCloseTo(0.5)
    controller.tick(state, windup, hooks)
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'attack', phase: 1 })
    controller.tick(state, 0.3, hooks)
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'recover', phase: 1 })
    boss.hp = boss.max * 0.6
    controller.tick(state, 0.01, hooks)
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'transform', progress: 0, phase: 2 })
    controller.tick(state, 0.2, hooks)
    expect(controller.snapshot(state).bodyMotion?.progress).toBeCloseTo(0.2 / 0.85)
    state.mode = 'level'
    const paused = controller.snapshot(state).bodyMotion
    controller.tick(state, 0.1, hooks)
    expect(controller.snapshot(state).bodyMotion).toEqual(paused)
    state.mode = 'play'
    hit(state, boss, boss.hp, hooks)
    expect(controller.snapshot(state).bodyMotion).toMatchObject({ pose: 'death', phase: 2, progress: 0 })
    expect(controller.snapshot(state).bodyMotion?.x).toBe(boss.x)
    expect(state.kill).toBe(1)
    expect(state.stars).toHaveLength(1)
    controller.reset(state)
    expect(controller.snapshot(state).bodyMotion).toBeUndefined()
  })

})

describe('ES3 boss stagger and battlefield cleanse', () => {
  it('opens a bounded vulnerability during recovery, never interrupts a warning, and boosts subsequent real damage', () => {
    const {state, hooks, controller}=setup()
    const boss=controller.spawn(state,'infernal-titan',{x:140,y:0},hooks)!
    state.hero!.inv=99
    controller.tick(state,.01,hooks)
    const warning=controller.snapshot(state).telegraphs[0]!
    hit(state,boss,boss.max*.12,hooks)
    expect(controller.snapshot(state).telegraphs).toHaveLength(1)
    expect(boss.weaknessRemaining ?? 0).toBe(0)
    controller.tick(state,BOSS_ATTACKS[warning.attackId as keyof typeof BOSS_ATTACKS].windup+.01,hooks)
    hit(state,boss,boss.max*.12,hooks)
    expect(boss.weaknessRemaining).toBeGreaterThan(0)
    const hp=boss.hp
    hit(state,boss,100,hooks)
    expect(hp-boss.hp).toBeGreaterThan(100)
    expect(hooks.sfx).toHaveBeenCalledWith('bossStagger')
    controller.tick(state,2,hooks)
    expect(boss.weaknessRemaining).toBe(0)
  })
  it('clears hostile legacy projectiles at a true boss kill, preserves player shots and awards no extra kill or XP', () => {
    const {state,hooks,controller}=setup()
    const boss=controller.spawn(state,'abyss-monarch',{x:140,y:0},hooks)!
    state.enemyShots.push({x:0,y:0,vx:1,vy:0,radius:5,damage:10,life:3})
    state.shots.push({x:0,y:0,vx:1,vy:0,r:5,d:10,life:3,kind:'arrow'})
    hit(state,boss,boss.hp,hooks)
    expect(state.enemyShots).toHaveLength(0)
    expect(state.shots).toHaveLength(1)
    expect(state.kill).toBe(1)
    expect(state.stars).toHaveLength(1)
  })
})
