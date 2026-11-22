import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../state'
import type { GameState, JobId } from '../types'
import { sampleHeroAnimation } from './animation'
import { createFakeCtx, fakeCanvasFactory, fakeImage } from './fakes'
import { createHeroSheets } from './hero-sheets'

function setup(job: JobId): GameState {
  const state = createState()
  state.choice = job
  state.hero = createHero(job)
  state.mode = 'play'
  state.worldClock = 1
  return state
}

describe('directional hero animations', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s chooses all eight attack directions from aim', (job) => {
    const state = setup(job)
    state.hero!.strike = 0.2
    for (let direction = 0; direction < 8; direction++) {
      state.hero!.aimAngle = direction * Math.PI / 4
      expect(sampleHeroAnimation(state, state.hero!).direction).toBe(direction)
    }
  })

  it('uses travel direction for walking and attack direction for strikes', () => {
    const state = setup('knight')
    const hero = state.hero!
    hero.moveAmount = 1
    hero.vx = -100
    hero.vy = -100
    expect(sampleHeroAnimation(state, hero)).toMatchObject({ pose: 'run', direction: 5 })
    hero.aimAngle = Math.PI / 4
    hero.strike = 0.25
    expect(sampleHeroAnimation(state, hero)).toMatchObject({ pose: 'attack', direction: 1 })
    hero.strike = 0
    hero.vx = 0
    hero.vy = 0
    hero.moveAmount = 0
    expect(sampleHeroAnimation(state, hero)).toMatchObject({ pose: 'idle', direction: 1 })
  })

  it('keeps attack frame indices in range across the complete strike', () => {
    const state = setup('ranger')
    for (const strike of [0.29, 0.27, 0.20, 0.14, 0.07, 0.001]) {
      state.hero!.strike = strike
      const anim = sampleHeroAnimation(state, state.hero!)
      expect(anim.frame).toBeGreaterThanOrEqual(0)
      expect(anim.frame).toBeLessThan(anim.count)
    }
  })
})

describe('cached directional sprite sheets', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s bakes attack frames once and draws one frame per tick', (job) => {
    const state = setup(job)
    const hero = state.hero!
    hero.strike = 0.28
    hero.aimAngle = -Math.PI / 4
    const image = fakeImage(true)
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const draw = createFakeCtx()
    const spy = vi.spyOn(draw.ctx, 'drawImage')
    const anim = sampleHeroAnimation(state, hero)
    expect(sheets.draw(draw.ctx, image, job, hero, anim, 108, 144)).toBe(true)
    expect(factory.made).toHaveLength(1)
    expect(factory.made[0]!.canvas.width).toBe((108 + 64) * anim.count)
    expect(factory.made[0]!.canvas.height).toBe(144 + 64)
    const bakedDraws = factory.made[0]!.fake.calls.length
    hero.strike = 0.08
    sheets.draw(draw.ctx, image, job, hero, sampleHeroAnimation(state, hero), 108, 144)
    expect(factory.made).toHaveLength(1)
    expect(factory.made[0]!.fake.calls.length).toBe(bakedDraws)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls.every(args => args.length === 9 && args[0] === factory.made[0]!.canvas)).toBe(true)
  })

  it('provides a different sheet for every direction and uses 8 locomotion frames', () => {
    const state = setup('knight')
    const hero = state.hero!
    hero.moveAmount = 1
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const image = fakeImage(true)
    const { ctx } = createFakeCtx()
    for (let direction = 0; direction < 8; direction++) {
      hero.vx = Math.cos(direction * Math.PI / 4) * 100
      hero.vy = Math.sin(direction * Math.PI / 4) * 100
      const anim = sampleHeroAnimation(state, hero)
      expect(anim.direction).toBe(direction)
      expect(anim.count).toBe(8)
      expect(sheets.draw(ctx, image, 'knight', hero, anim, 108, 134)).toBe(true)
    }
    expect(factory.made).toHaveLength(8)
    expect(sheets.size).toBe(8)
  })

  it('preserves the original reduced-motion fallback and bounds cache memory', () => {
    const state = setup('wizard')
    const hero = state.hero!
    hero.strike = 0.20
    const factory = fakeCanvasFactory()
    const sheets = createHeroSheets(factory.make)
    const image = fakeImage(true)
    const { ctx } = createFakeCtx()
    expect(sheets.draw(ctx, image, 'wizard', hero, sampleHeroAnimation(state, hero, true), 117, 147)).toBe(false)
    expect(factory.made).toHaveLength(0)
    for (let i = 0; i < 8; i++) {
      hero.aimAngle = i * Math.PI / 4
      sheets.draw(ctx, image, 'wizard', hero, sampleHeroAnimation(state, hero), 117, 147)
      hero.strike = 0
      hero.moveAmount = 1
      hero.vx = Math.cos(i * Math.PI / 4) * 100
      hero.vy = Math.sin(i * Math.PI / 4) * 100
      sheets.draw(ctx, image, 'wizard', hero, sampleHeroAnimation(state, hero), 117, 147)
      hero.strike = 0.20
    }
    expect(sheets.size).toBeLessThanOrEqual(16)
  })
})
