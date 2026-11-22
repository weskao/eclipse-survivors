import { describe, expect, it, vi } from 'vitest'
import { ART_URLS } from '../art'
import { createHero, createState } from '../state'
import type { JobId } from '../types'
import { sampleHeroAnimation } from './animation'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './fakes'
import { createRenderAssets, drawFrame } from './index'

const jobs: readonly JobId[] = ['knight', 'ranger', 'wizard']

describe('preserve the original realistic hero identity', () => {
  it.each(jobs)('%s always sources its rendering from the original illustration', job => {
    const s = createState()
    s.choice = job
    s.hero = createHero(job)
    s.hero.strike = .14
    s.mode = 'play'
    s.W = 900
    s.H = 600
    const original = fakeArtwork(true)
    const factory = fakeCanvasFactory()
    const assets = createRenderAssets(original, factory.make)
    // Regression: a stale alternate-style atlas must never replace the hero.
    const wrongAtlas = new Image()
    Object.defineProperty(wrongAtlas, 'complete', { value: true })
    Object.defineProperty(wrongAtlas, 'naturalWidth', { value: 256 })
    Object.defineProperty(wrongAtlas, 'naturalHeight', { value: 720 })
    Object.assign(assets, { paintedFrames: wrongAtlas })

    const { ctx, drawn } = createFakeCtx()
    drawFrame(ctx, s, 1, assets)
    expect(drawn).not.toContain(wrongAtlas)
    expect(factory.made.some(item => item.fake.drawn.includes(original[job]))).toBe(true)
    expect(ART_URLS[job]).toMatch(new RegExp(job + '\\.webp'))
  })

  it.each(jobs)('%s uses the original art for all eight aiming directions', job => {
    const s = createState()
    s.choice = job
    s.hero = createHero(job)
    s.mode = 'play'
    s.W = 900
    s.H = 600
    const art = fakeArtwork(true)
    const factory = fakeCanvasFactory()
    const assets = createRenderAssets(art, factory.make)
    for (let direction = 0; direction < 8; direction++) {
      s.hero.aimAngle = direction * Math.PI / 4
      s.hero.face = direction > 2 && direction < 6 ? -1 : 1
      s.hero.strike = .16
      const anim = sampleHeroAnimation(s, s.hero)
      expect(anim.direction).toBe(direction)
      drawFrame(createFakeCtx().ctx, s, 1, assets)
    }
    expect(assets.heroSheets.size).toBe(8)
    expect(factory.made.some(item => item.fake.drawn.includes(art[job]))).toBe(true)
  })

  it.each(jobs)('%s freezes its original form on reduced motion rather than substituting a new character', job => {
    const s = createState()
    s.choice = job
    s.hero = createHero(job)
    s.mode = 'play'
    s.W = 900
    s.H = 600
    const original = fakeArtwork(true)
    const assets = createRenderAssets(original, fakeCanvasFactory().make)
    assets.prefersReducedMotion = () => true
    const { ctx, drawn } = createFakeCtx()
    drawFrame(ctx, s, 1, assets)
    expect(drawn).toContain(original[job])
  })

  it('uses the 12-frame attack/cast and 10-frame run contracts for every original hero', () => {
    for (const job of jobs) {
      const s = createState()
      s.choice = job
      s.hero = createHero(job)
      s.mode = 'play'
      s.hero.strike = .15
      expect(sampleHeroAnimation(s, s.hero).count).toBe(12)
      s.hero.strike = 0
      s.hero.moveAmount = 1
      expect(sampleHeroAnimation(s, s.hero).count).toBe(10)
    }
  })
})
