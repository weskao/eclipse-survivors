import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../state'
import type { GameState, JobId } from '../types'
import { createFakeCtx, fakeImage } from './fakes'
import { sampleHeroAnimation } from './animation'
import { drawRigSprite } from './characters'

function setup(job: JobId = 'knight'): GameState {
  const s = createState()
  s.choice = job
  s.hero = createHero(job)
  s.mode = 'play'
  s.worldClock = 1.5
  return s
}

describe('hero render animation sampling', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s has idle, run, dash, damage, death and victory states', (job) => {
    const s = setup(job)
    const hero = s.hero!
    expect(sampleHeroAnimation(s, hero).pose).toBe('idle')
    hero.moveAmount = 0.8
    expect(sampleHeroAnimation(s, hero).pose).toBe('run')
    hero.dash = 0.2
    expect(sampleHeroAnimation(s, hero).pose).toBe('dash')
    hero.dash = 0
    hero.inv = 0.7
    expect(sampleHeroAnimation(s, hero).pose).toBe('hurt')
    hero.hp = 0
    expect(sampleHeroAnimation(s, hero).pose).toBe('death')
    hero.hp = 1
    s.mode = 'result'
    expect(sampleHeroAnimation(s, hero).pose).toBe('victory')
  })

  it('uses casting for wizard and weapon attacks for knight and ranger', () => {
    for (const job of ['knight', 'ranger', 'wizard'] as const) {
      const s = setup(job)
      s.hero!.strike = 0.2
      expect(sampleHeroAnimation(s, s.hero!).pose).toBe(job === 'wizard' ? 'cast' : 'attack')
    }
  })

  it('gives damage and dash higher priority than a simultaneous attack', () => {
    const s = setup()
    s.hero!.strike = 0.22
    s.hero!.inv = 0.79
    expect(sampleHeroAnimation(s, s.hero!).pose).toBe('hurt')
    s.hero!.dash = 0.15
    expect(sampleHeroAnimation(s, s.hero!).pose).toBe('dash')
  })

  it('advances run frames with foot distance and resets to attack phase on transition', () => {
    const s = setup()
    const hero = s.hero!
    hero.moveAmount = 0.9
    hero.step = 0
    const first = sampleHeroAnimation(s, hero)
    hero.step = Math.PI / 2
    const second = sampleHeroAnimation(s, hero)
    expect(second.pose).toBe('run')
    expect(second.frame).not.toBe(first.frame)
    hero.strike = 0.29
    expect(sampleHeroAnimation(s, hero).frame).toBe(0)
    hero.strike = 0.12
    expect(sampleHeroAnimation(s, hero).frame).toBeGreaterThan(0)
    hero.strike = 0
    hero.step = 0
    expect(sampleHeroAnimation(s, hero).frame).toBe(first.frame)
  })

  it('freezes at a stable representative frame in reduced-motion and paused modes', () => {
    const s = setup('wizard')
    s.hero!.strike = 0.14
    expect(sampleHeroAnimation(s, s.hero!, true)).toMatchObject({ pose: 'cast', frame: 0, reducedMotion: true })
    s.hero!.strike = 0
    s.hero!.moveAmount = 1
    s.hero!.step = 4
    s.mode = 'paused'
    expect(sampleHeroAnimation(s, s.hero!).frame).toBe(0)
  })
})

describe('render contract', () => {
  it('uses multiple coherent source strips while running rather than scaling a whole-body image', () => {
    const s = setup('ranger')
    s.hero!.moveAmount = 1
    s.hero!.step = 2
    const { ctx } = createFakeCtx()
    const spy = vi.spyOn(ctx, 'drawImage')
    drawRigSprite(ctx, fakeImage(true), 111, 144, s.hero!, sampleHeroAnimation(s, s.hero!))
    expect(spy.mock.calls.length).toBeGreaterThan(8)
    expect(spy.mock.calls.every((args) => args.length === 9)).toBe(true)
  })

  it('draws one intact original sprite when reduced motion is enabled', () => {
    const s = setup()
    s.hero!.moveAmount = 1
    const { ctx } = createFakeCtx()
    const spy = vi.spyOn(ctx, 'drawImage')
    drawRigSprite(ctx, fakeImage(true), 108, 134, s.hero!, sampleHeroAnimation(s, s.hero!, true))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]).toHaveLength(5)
  })
})
