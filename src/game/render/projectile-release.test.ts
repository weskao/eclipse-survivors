import { describe, expect, it, vi } from 'vitest'
import { attack } from '../combat'
import { createHero, createState } from '../state'
import type { GameState, JobId, Mob } from '../types'
import { sampleHeroAnimation } from './animation'
import { drawRigSprite } from './characters'
import { createFakeCtx, fakeCanvasFactory } from './fakes'
import { createHeroSheets } from './hero-sheets'
import { createRigidWeaponLayers, drawLoadedProjectile, loadedProjectileVisible } from './rigid-weapons'

function fixture(job: JobId): GameState {
  const s = createState()
  s.choice = job
  s.mode = 'play'
  s.hero = createHero(job)
  s.worldClock = 3
  return s
}

const target: Mob = {
  x: 80, y: 20, type: 'slime', hp: 100, max: 100, r: 18, speed: 0, dmg: 1,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
}
const hooks = { sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }

describe('loaded arrows and spell energy are not baked into post-release hero frames', () => {
  it.each(['ranger', 'wizard'] as const)('%s hides the loaded projectile as soon as the world projectile spawns', job => {
    const s = fixture(job)
    const hero = s.hero!
    expect(loadedProjectileVisible(job, hero, sampleHeroAnimation(s, hero))).toBe(true)
    s.mobs.push({ ...target })
    attack(s, hooks)
    expect(s.shots).toHaveLength(1)
    expect(s.shots[0]!.kind).toBe(job === 'ranger' ? 'arrow' : 'magic')
    hero.attack = hero.delay
    expect(loadedProjectileVisible(job, hero, sampleHeroAnimation(s, hero))).toBe(false)
    hero.strike = .03
    expect(loadedProjectileVisible(job, hero, sampleHeroAnimation(s, hero))).toBe(false)
    hero.strike = 0
    hero.attack = hero.delay * .1
    expect(loadedProjectileVisible(job, hero, sampleHeroAnimation(s, hero))).toBe(true)
  })

  it('does not add a loaded projectile for the knight', () => {
    const s = fixture('knight')
    expect(loadedProjectileVisible('knight', s.hero!, sampleHeroAnimation(s, s.hero!))).toBe(false)
  })

  it.each(['ranger', 'wizard'] as const)('%s preserves the body and rigid weapon, but paints load art only before release', job => {
    const s = fixture(job)
    const hero = s.hero!
    const factory = fakeCanvasFactory()
    const source = document.createElement('canvas')
    source.width = 340
    source.height = 390
    const layers = createRigidWeaponLayers(source, job, factory.make)!
    expect(layers.projectile).toBeDefined()
    const { ctx } = createFakeCtx()
    const spy = vi.spyOn(ctx, 'drawImage')
    drawLoadedProjectile(ctx, layers, job, hero, sampleHeroAnimation(s, hero), 110, 145)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![0]).toBe(layers.projectile)
    hero.strike = .15
    drawLoadedProjectile(ctx, layers, job, hero, sampleHeroAnimation(s, hero), 110, 145)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('never reintroduce source arrow, bow, or wand while skinning', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s rotates only weapon-erased body tiles; one rigid weapon stays intact', job => {
    const s = fixture(job)
    s.hero!.strike = .15
    s.hero!.aimAngle = .9
    const source = document.createElement('canvas')
    source.width = 340
    source.height = 390
    const layers = createRigidWeaponLayers(source, job, fakeCanvasFactory().make)!
    const { ctx } = createFakeCtx()
    const spy = vi.spyOn(ctx, 'drawImage')
    drawRigSprite(ctx, source, 110, 145, s.hero!, sampleHeroAnimation(s, s.hero!), job, layers)
    expect(spy.mock.calls.filter(args => args[0] === layers.body)).toHaveLength(96)
    expect(spy.mock.calls.filter(args => args[0] === layers.weapon)).toHaveLength(1)
    expect(spy.mock.calls.some(args => args[0] === source)).toBe(false)
    expect(spy.mock.calls.some(args => args[0] === layers.projectile)).toBe(false)
  })
})

describe('expanded hero animation frame budgets', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s supplies at least ten run and twelve action frames', job => {
    const s = fixture(job)
    s.hero!.moveAmount = 1
    expect(sampleHeroAnimation(s, s.hero!).count).toBeGreaterThanOrEqual(10)
    s.hero!.strike = .23
    expect(sampleHeroAnimation(s, s.hero!).count).toBeGreaterThanOrEqual(12)
  })

  it.each(['ranger', 'wizard'] as const)('%s transitions from release to recovery without reloading a fired projectile', job => {
    const s = fixture(job)
    const hero = s.hero!
    hero.strike = .28
    const release = sampleHeroAnimation(s, hero)
    hero.strike = .08
    const recover = sampleHeroAnimation(s, hero)
    expect(release.actionStage).toBe('release')
    expect(recover.actionStage).toBe('recover')
    expect(recover.frame).toBeGreaterThan(release.frame)
    expect(loadedProjectileVisible(job, hero, recover)).toBe(false)
  })
})

describe('cached frame isolation', () => {
  it.each(['ranger', 'wizard'] as const)('%s bakes clean body-only frames and clears each cell', job => {
    const s = fixture(job)
    s.hero!.strike = 0.18
    const anim = sampleHeroAnimation(s, s.hero!)
    const image = document.createElement('canvas')
    image.width = 340
    image.height = 390
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const { ctx } = createFakeCtx()
    expect(sheets.draw(ctx, image, job, s.hero!, anim, 110, 145)).toBe(true)
    const baked = factory.made[0]!.fake
    const body = factory.made[1]!.canvas
    const weapon = factory.made[2]!.canvas
    const held = factory.made[3]!.canvas
    expect(baked.calls.filter(name => name === 'clearRect')).toHaveLength(anim.count)
    expect(baked.drawn).toContain(body)
    expect(baked.drawn).not.toContain(image)
    expect(baked.drawn).not.toContain(weapon)
    expect(baked.drawn).not.toContain(held)
  })
})

describe('fallback artwork safety', () => {
  it('never applies WebP-specific weapon cutouts to a temporary Canvas placeholder', () => {
    const s = fixture('ranger')
    const fallback = document.createElement('canvas')
    fallback.width = 120
    fallback.height = 144
    const { ctx } = createFakeCtx()
    const draws = vi.spyOn(ctx, 'drawImage')
    drawRigSprite(ctx, fallback, 111, 144, s.hero!, sampleHeroAnimation(s, s.hero!), 'ranger')
    expect(draws).toHaveBeenCalledTimes(1)
    expect(draws.mock.calls[0]![0]).toBe(fallback)
  })
})
