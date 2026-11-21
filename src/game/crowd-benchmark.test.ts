import { describe, it } from 'vitest'
import { createHero, createState } from './state'
import { step } from './step'
import { createFakeCtx, fakeArtwork, fakeCanvasFactory } from './render/fakes'
import { createRenderAssets, drawFrame } from './render'
import type { GameHooks, Mob } from './types'

const hooks: GameHooks = { sfx() {}, message() {}, offerUpgrades() {}, end() {} }

function crowd() {
  const s = createState()
  s.hero = createHero('knight')
  s.hero.hp = s.hero.max = 100000
  s.hero.inv = 100000
  s.hero.attack = 100000
  s.mode = 'play'
  s.W = 960; s.H = 540
  s.spawnT = 100000
  for (let i = 0; i < 130; i++) {
    const angle = i * 2.399963
    const radius = 70 + (i % 8) * 44
    const m: Mob = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      type: i % 10 === 0 ? 'golem' : 'slime', hp: 1000, max: 1000,
      r: 18, speed: 58, dmg: 0, phase: i, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 }
    s.mobs.push(m)
  }
  return s
}

describe('130-mob crowd benchmark (diagnostic, not a timing gate)', () => {
  it('reports deterministic simulation and render workloads', () => {
    const s = crowd()
    const t0 = performance.now()
    for (let i = 0; i < 240; i++) step(s, 1 / 60, { x: 0, y: 0 }, hooks)
    const simMs = performance.now() - t0
    const fake = createFakeCtx()
    const assets = createRenderAssets(fakeArtwork(true), fakeCanvasFactory().make)
    const t1 = performance.now()
    for (let i = 0; i < 60; i++) {
      drawFrame(fake.ctx, s, 1, assets)
      fake.calls.length = 0
      fake.drawn.length = 0
    }
    const renderMs = performance.now() - t1
    console.info(`crowd-130 simulation(240 ticks): ${simMs.toFixed(2)}ms; rendering(60 fake-context frames): ${renderMs.toFixed(2)}ms; survivors: ${s.mobs.length}`)
  })
})
