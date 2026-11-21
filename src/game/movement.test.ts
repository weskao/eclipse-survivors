import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { moveHero } from './movement'
import { dist, seeded, setRandom } from './math'
import { createHero, createState } from './state'
import type { GameState, Hero, MoveInput } from './types'

function setup(): { s: GameState; hero: Hero } {
  const s = createState()
  const hero = createHero('knight')
  s.hero = hero
  s.mode = 'play'
  return { s, hero }
}
const run = (s: GameState, input: MoveInput, frames: number) => {
  for (let i = 0; i < frames; i++) moveHero(s, input, 1 / 60)
}

beforeEach(() => setRandom(seeded(10)))
afterEach(() => setRandom())

describe('moveHero', () => {
  it('accelerates smoothly toward full speed', () => {
    const { s, hero } = setup()
    moveHero(s, { x: 1, y: 0 }, 1 / 60)
    expect(hero.vx).toBeCloseTo(190 * (1 - Math.exp(-19 / 60)))
    run(s, { x: 1, y: 0 }, 120)
    expect(hero.vx).toBeCloseTo(190)
    expect(hero.x).toBeGreaterThan(0)
    expect(hero.moveAmount).toBeGreaterThan(0.9)
  })
  it('preserves speed on diagonals', () => {
    const { s, hero } = setup()
    run(s, { x: 1, y: 1 }, 120)
    expect(dist(hero.vx, hero.vy)).toBeCloseTo(190)
    expect(hero.vx).toBeCloseTo(hero.vy)
  })
  it('stops completely on release and faces the travel direction', () => {
    const { s, hero } = setup()
    run(s, { x: -1, y: 0 }, 60)
    expect(hero.face).toBe(-1)
    run(s, { x: 0, y: 0 }, 60)
    expect(hero.vx).toBe(0)
    expect(hero.vy).toBe(0)
  })
  it('leaves footstep dust every 48px except in the storm scene', () => {
    const { s } = setup()
    run(s, { x: 1, y: 0 }, 60)
    expect(s.fx.some((f) => f.type === 'footstep' && f.color === '#c7ac88')).toBe(true)
    const storm = setup()
    storm.s.currentScene = 1
    run(storm.s, { x: 1, y: 0 }, 60)
    expect(storm.s.fx).toHaveLength(0)
  })
  it('dashing moves at 2.8x speed', () => {
    const { s, hero } = setup()
    hero.dash = 10
    run(s, { x: 1, y: 0 }, 120)
    expect(hero.vx).toBeCloseTo(190 * 2.8)
  })
})
