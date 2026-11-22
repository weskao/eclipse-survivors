import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../state'
import { sampleHeroAnimation } from './animation'
import { createFakeCtx, fakeCanvasFactory } from './fakes'
import { createRigidWeaponLayers, drawRigidWeapon } from './rigid-weapons'
import { drawRigSprite } from './characters'

const jobs = ['knight', 'ranger', 'wizard'] as const

describe('rigid non-deforming equipment layers', () => {
  it.each(jobs)('%s isolates weapon pixels from the deformable body exactly once', job => {
    const factory = fakeCanvasFactory()
    const source = document.createElement('canvas')
    source.width = 340
    source.height = 390
    const layers = createRigidWeaponLayers(source, job, factory.make)
    expect(layers).not.toBeNull()
    expect(factory.made).toHaveLength(job === 'knight' ? 2 : 3)
    expect(layers!.body).toBe(factory.made[0]!.canvas)
    expect(layers!.weapon).toBe(factory.made[1]!.canvas)
    expect(factory.made[0]!.fake.drawn).toContain(source)
    expect(factory.made[1]!.fake.drawn).toContain(source)
    expect(layers!.weapon).not.toBe(source)
  })

  it.each(jobs)('%s preserves exact weapon dimensions while running and attacking in all eight directions', job => {
    const factory = fakeCanvasFactory()
    const source = document.createElement('canvas')
    source.width = 340
    source.height = 390
    const layers = createRigidWeaponLayers(source, job, factory.make)!
    const state = createState()
    state.choice = job
    state.mode = 'play'
    state.hero = createHero(job)
    const hero = state.hero!
    const { ctx } = createFakeCtx()
    const draw = vi.spyOn(ctx, 'drawImage')
    const scale = vi.spyOn(ctx, 'scale')

    for (const pose of ['run', job === 'wizard' ? 'cast' : 'attack'] as const) {
      for (let direction = 0; direction < 8; direction++) {
        hero.aimAngle = direction * Math.PI / 4
        hero.vx = Math.cos(hero.aimAngle) * 70
        hero.vy = Math.sin(hero.aimAngle) * 70
        hero.moveAmount = 1
        hero.strike = pose === 'run' ? 0 : 0.16
        const anim = sampleHeroAnimation(state, hero)
        drawRigidWeapon(ctx, layers, job, hero, anim, 110, 150)
      }
    }
    expect(draw).toHaveBeenCalledTimes(16)
    // Only rigid translation + rotation: never squash, stretch, or separately warp bow, sword or staff.
    expect(scale).not.toHaveBeenCalled()
    for (const args of draw.mock.calls) {
      expect(args[0]).toBe(layers.weapon)
      expect(args[3] / args[4]).toBeCloseTo(source.width / source.height, 5)
      expect(args[4]).toBe(150)
    }
  })
})

describe('articulated-body and equipment integration', () => {
  it.each(jobs)('%s never submits source weapon pixels to the deformable grid', job => {
    const source = document.createElement('canvas')
    source.width = 340
    source.height = 390
    const layers = createRigidWeaponLayers(source, job, fakeCanvasFactory().make)!
    const state = createState()
    state.choice = job
    state.mode = 'play'
    state.hero = createHero(job)
    state.hero.strike = .14
    const { ctx } = createFakeCtx()
    const draw = vi.spyOn(ctx, 'drawImage')
    drawRigSprite(ctx, source, 108, 144, state.hero, sampleHeroAnimation(state, state.hero), job, layers)
    // The deformable grid receives ONLY weapon-erased body art.
    expect(draw.mock.calls.filter(args => args[0] === layers.body && (args as unknown[]).length === 9)).toHaveLength(96)
    // Every original weapon pixel moves as one rigid image; the uniform scale preserves the source ratio.
    expect(draw.mock.calls.filter(args => args[0] === layers.weapon && (args as unknown[]).length === 5)).toHaveLength(1)
    expect(draw.mock.calls.some(args => args[0] === source)).toBe(false)
  })
})
