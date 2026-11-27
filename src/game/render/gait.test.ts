import { describe, expect, it } from 'vitest'
import { createHero } from '../state'
import type { HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'
import { createFakeCtx } from './fakes'
import { drawGaitBody, gaitLegPoint, gaitPoint, sampleGait, type GaitPoint } from './gait'
import { sampleWeaponRig } from './weapon-rig'

const run = (frame: number, count = 20, direction = 0): HeroAnimation => ({
  pose: 'run', frame, count, phase: frame / count, direction, reducedMotion: false,
})
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const point = (): GaitPoint => ({ x: 0, y: 0, rotation: 0 })

describe('procedural human gait', () => {
  it('only animates locomotion, never idle, actions or reduced motion', () => {
    for (const pose of ['idle', 'attack', 'cast', 'hurt', 'death', 'victory'] as const) {
      expect(sampleGait({ ...run(3), pose }, true)).toBeNull()
    }
    expect(sampleGait({ ...run(3), reducedMotion: true }, true)).toBeNull()
    expect(sampleGait({ ...run(3), pose: 'dash', phase: 0.5 }, true)).not.toBeNull()
  })

  it('swings the two legs in anti-phase, with arms countering the same-side leg', () => {
    const count = 20
    for (let f = 0; f < count; f++) {
      const a = copy(sampleGait(run(f, count), true)!)
      const b = copy(sampleGait(run((f + count / 2) % count, count), true)!)
      expect(a.thigh[0]).toBeCloseTo(b.thigh[1])
      expect(a.knee[0]).toBeCloseTo(b.knee[1])
      for (const i of [0, 1]) expect(a.arm[i]! * a.thigh[i]!).toBeLessThanOrEqual(1e-9)
    }
    const strike = sampleGait(run(0, count), true)!
    expect(strike.thigh[0]).toBeGreaterThan(0.3) // heel strike: leg reaches forward
    expect(strike.thigh[1]).toBeLessThan(-0.2) // toe-off: leg trails behind
  })

  it('flexes knees only forward, little in stance and strongly in swing', () => {
    const count = 40
    let stance = 0, swing = 0
    for (let f = 0; f < count; f++) {
      const g = sampleGait(run(f, count), true)!
      expect(g.knee[0]).toBeGreaterThanOrEqual(0)
      expect(g.knee[1]).toBeGreaterThanOrEqual(0)
      if (f / count < 0.5) stance = Math.max(stance, g.knee[0]); else swing = Math.max(swing, g.knee[0])
    }
    expect(stance).toBeGreaterThan(0.1)
    expect(stance).toBeLessThan(0.4)
    expect(swing).toBeGreaterThan(0.9)
  })

  it('bobs the pelvis twice per stride, lowest at heel strike, with a foot always planted', () => {
    const count = 40
    const pelvis = Array.from({ length: count }, (_, f) => sampleGait(run(f, count), true)!.pelvis)
    for (let f = 0; f < count; f++) {
      expect(pelvis[f]).toBeGreaterThanOrEqual(0)
      expect(pelvis[f]).toBeCloseTo(pelvis[(f + count / 2) % count]!, 9) // one bob per step
    }
    expect(Math.max(...pelvis)).toBeCloseTo(pelvis[0]!, 9) // heel strike carries the weight
    expect(Math.max(...pelvis) - Math.min(...pelvis)).toBeGreaterThan(0.02) // visible bob
    // One foot is planted (y = 0) and neither ever sinks below the ground.
    const out = point()
    const height = 100
    for (let f = 0; f < count; f++) {
      const g = sampleGait(run(f, count), true)!
      const a = gaitLegPoint(g, 0, 0.42 * height, height, out).y
      const b = gaitLegPoint(g, 1, 0.42 * height, height, out).y
      expect(Math.max(a, b)).toBeCloseTo(0, 6)
    }
  })

  it('leans the torso and moves the forward foot toward the travel direction', () => {
    const height = 100
    const out = point()
    const east = sampleGait(run(0), false)!
    expect(gaitPoint(east, 0, -height, height, out).x).toBeGreaterThan(0)
    expect(gaitLegPoint(east, 0, 0.42 * height, height, out).x).toBeGreaterThan(0)
    const west = sampleGait(run(0, 20, 4), false)!
    expect(gaitPoint(west, 0, -height, height, out).x).toBeLessThan(0)
    expect(gaitLegPoint(west, 0, 0.42 * height, height, out).x).toBeLessThan(0)
    // Facing the camera, the stride reads as depth: no sideways leg rotation.
    const south = sampleGait(run(0, 20, 2), false)!
    expect(Math.abs(gaitLegPoint(south, 0, 0.42 * height, height, out).rotation)).toBeLessThan(1e-9)
    expect(gaitLegPoint(south, 0, 0.42 * height, height, out).y).toBeGreaterThan(0)
  })

  it('draws baked full-body art as a few rigid pieces sampled inside the source rect', () => {
    const crops: number[][] = []
    const { ctx, calls } = createFakeCtx()
    const spy: Ctx2D = { ...ctx, drawImage: (...args: unknown[]) => {
      crops.push(args.slice(1, 5) as number[])
      ctx.drawImage(...(args as Parameters<Ctx2D['drawImage']>))
    } }
    const image = {} as HTMLImageElement
    drawGaitBody(spy, image, 904, 1352, 432, 432, -70, -140, 140, 140, 4, 120, sampleGait(run(5), false)!)
    expect(crops.length).toBeGreaterThanOrEqual(5)
    expect(crops.length).toBeLessThanOrEqual(8)
    for (const [x, y, w, h] of crops) {
      expect(x).toBeGreaterThanOrEqual(904 - 1e-6)
      expect(y).toBeGreaterThanOrEqual(1352 - 1e-6)
      expect(x! + w!).toBeLessThanOrEqual(904 + 432 + 1e-6)
      expect(y! + h!).toBeLessThanOrEqual(1352 + 432 + 1e-6)
    }
    expect(calls.filter(c => c === 'save').length).toBe(calls.filter(c => c === 'restore').length)
  })

  it('swings the legacy weapon arms while running, so the rigid weapon follows the hand', () => {
    const hero = createHero('knight')
    const a = sampleWeaponRig('knight', hero, run(0, 10))
    const b = sampleWeaponRig('knight', hero, run(5, 10))
    expect(Math.abs(a.hand.x - b.hand.x)).toBeGreaterThan(2)
    expect(Math.abs(a.supportHand.x - b.supportHand.x)).toBeGreaterThan(2)
    // Arms counter-swing: the two hands move in opposite directions.
    expect(Math.sign(a.hand.x - b.hand.x)).toBe(-Math.sign(a.supportHand.x - b.supportHand.x))
    // Bones keep their rigid lengths.
    expect(Math.hypot(a.elbow.x - a.shoulder.x, a.elbow.y - a.shoulder.y)).toBeCloseTo(a.upperLength, 5)
  })
})
