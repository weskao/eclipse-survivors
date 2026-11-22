import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createContentRegistry } from './registry'
import type { ContentPack } from './contracts'
import { UP } from '../constants'
import { hit, damageHero } from '../combat'
import { createEngine } from '../engine'
import { seeded, setRandom } from '../math'
import { applyUpgrade, pickUpgrades } from '../progression'
import { createHero, createState } from '../state'
import { step } from '../step'
import { equippedSkillHud } from '../store'
import type { AudioSystem } from '../audio/types'
import type { GameHooks, Mob } from '../types'
import { createProfileStore } from '../../meta/profile'

const hooks: GameHooks = { sfx() {}, message() {}, offerUpgrades() {}, end() {} }
const packs: ContentPack[] = [{
  id: 'arcane',
  abilities: [{ id: 'arcane:blast', kind: 'weapon', icon: '✦', title: 'Arcane Blast', desc: 'Attack',
    maxLevel: 2, rarity: 'rare', cooldownSeconds: 2, requires: [{ id: 'frost', level: 2 }] }],
  effects: [{ id: 'arcane:glow', title: 'Glow', draw(ctx, _, fx) { ctx.fillRect(fx.x, fx.y, 8, 8) } }],
}]
const enemy = (): Mob => ({ x: 30, y: 0, type: 'slime', hp: 10, max: 10, r: 20,
  speed: 0, dmg: 4, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 })

beforeEach(() => setRandom(seeded(29)))

describe('registered upgrades and the legacy pool', () => {
  it('preserves original upgrades and evolves alongside an eligible new weapon', () => {
    const s = createState()
    s.hero = createHero('knight')
    const registry = createContentRegistry(packs)
    expect(UP).toHaveLength(15)
    expect(registry.eligible(s)).toEqual([])
    s.hero.skills.frost = 2
    for (const up of UP) s.hero.skills[up.id] = up.maxLevel
    const pool = pickUpgrades(s.hero, seeded(7), registry, s)
    expect(pool.map(item => item.id)).toContain('arcane:blast')
    expect(pool.find(item => item.id === 'arcane:blast')?.rarity).toBe('rare')
    s.levelQueue = 1
    expect(applyUpgrade(s, 'arcane:blast', hooks, registry)).toBe(true)
    expect(s.content.levels['arcane:blast']).toBe(1)
    expect(equippedSkillHud(s.hero, registry, s).find(item => item.id === 'arcane:blast')).toMatchObject({
      rarity: 'rare', level: 1, maxLevel: 2,
    })
    expect(s.levelQueue).toBe(0)
    expect(applyUpgrade(s, 'arcane:missing', hooks, registry)).toBe(false)
  })
})

describe('combat and lifecycle event bridge', () => {
  it('emits hit and kill once on a lethal strike and never double awards', () => {
    const events: string[] = []
    const registry = createContentRegistry([{ id: 'observer', onEvent(_ctx, event) { events.push(event.type) } }])
    const s = createState()
    s.mode = 'play'
    s.hero = createHero('knight')
    const observed: GameHooks = { ...hooks, content: (state, event) => registry.emit(state, event, hooks) }
    const target = enemy()
    s.mobs.push(target)
    hit(s, target, 25, observed)
    hit(s, target, 25, observed)
    expect(events).toEqual(['hit', 'kill'])
    expect(s.kill).toBe(1)
  })

  it('dispatches kill after boss flags and reward state are finalized', () => {
    const s = createState()
    s.mode = 'play'
    s.hero = createHero('knight')
    const observed: Array<{ bossDefeated: boolean; stars: number; kills: number }> = []
    const registry = createContentRegistry([{ id: 'observer', onEvent(ctx, event) {
      if (event.type === 'kill') observed.push({
        bossDefeated: ctx.state.bossDefeated, stars: ctx.state.stars.length, kills: ctx.state.kill,
      })
    } }])
    const hooksWithEvents: GameHooks = { ...hooks, content: (state, event) => registry.emit(state, event, hooks) }
    const boss = { ...enemy(), type: 'boss' as const }
    s.mobs.push(boss)
    hit(s, boss, 20, hooksWithEvents)
    expect(observed).toEqual([{ bossDefeated: true, stars: 1, kills: 1 }])
  })

  it('bridges actual damage, xp pickup and scene transition without changing combat rules', () => {
    const events: string[] = []
    const registry = createContentRegistry([{ id: 'observer', onEvent(_ctx, event) { events.push(event.type) } }])
    const s = createState()
    s.mode = 'play'; s.W = 800; s.H = 600; s.spawnT = 999
    s.hero = createHero('knight')
    s.hero.attack = 999
    const observed: GameHooks = { ...hooks, content: (state, event) => registry.emit(state, event, hooks) }
    damageHero(s, 10, observed)
    expect(s.hero.hp).toBe(165)
    s.stars.push({ x: 0, y: 0, value: 2, t: 0 })
    step(s, 0.016, { x: 0, y: 0 }, observed, registry)
    expect(s.hero.xp).toBe(2)
    expect(events).toContain('damage')
    expect(events).toContain('pickup')
  })

  it('runs reset, start, scene change and run completion callbacks from a real engine', () => {
    const events: string[] = []
    const pack: ContentPack = { id: 'observer', onEvent(_ctx, event) { events.push(event.type) } }
    const audio: AudioSystem = {
      unlocked: true, musicOn: true, sfxOn: true, musicVolume: 100, sfxVolume: 100,
      wake() {}, interrupt() {}, setCombatIntensity() {}, playSfx() {}, tick() {},
      onScreen() {}, resetBattleClock() {}, toggleMusic() { return true },
      toggleSfx() { return true }, setMusicVolume() {}, setSfxVolume() {}, dispose() {},
    }
    const engine = createEngine({ audio, contentPacks: [pack] })
    engine.state.W = 1280; engine.state.H = 720
    engine.start()
    expect(events.slice(0, 3)).toEqual(['reset', 'start', 'scene-change'])
    engine.state.time = 149.99
    engine.state.mobs = []
    engine.state.bossSpawned = true
    engine.state.bossDefeated = true
    engine.advance(0.033)
    expect(events).toContain('run-complete')
    expect(engine.ui.mode).toBe('result')
    engine.start()
    expect(events.filter(x => x === 'reset')).toHaveLength(2)
  })
})

it('draws registered effects in insertion order with bounded live state', () => {
  const order: number[] = []
  const registry = createContentRegistry([{ id: 'a', effects: [{
    id: 'a:shine', title: 'Shine', draw(_ctx, _state, effect) { order.push(effect.x) },
  }] }])
  const state = createState()
  registry.addEffect(state, { id: 'a:shine', x: 2, y: 0, life: 1, max: 1 })
  registry.addEffect(state, { id: 'a:shine', x: 1, y: 0, life: 1, max: 1 })
  const ctx = { save: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D
  registry.render(ctx, state, 0, 0)
  expect(order).toEqual([2, 1])
  expect(ctx.save).toHaveBeenCalledTimes(2)
  expect(ctx.restore).toHaveBeenCalledTimes(2)
})

it('persists namespaced content ability discoveries without requiring installed packs', () => {
  localStorage.clear()
  const store = createProfileStore(localStorage)
  store.recordRun({
    id: 'expanded', mode: 'quick', hero: 'knight', victory: false, seconds: 10,
    kills: 2, level: 1, damageDealt: 20, damageTaken: 0, remainingHp: 30,
    bossDefeated: false, enemies: {}, abilities: ['arcane:blast'],
  })
  expect(createProfileStore(localStorage).get().discoveredAbilities).toContain('arcane:blast')
})
