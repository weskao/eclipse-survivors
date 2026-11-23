import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { burst, impact, pushDamageNumber, pushEcho, zigzag } from './fx'
import { seeded, setRandom } from './math'
import { createState } from './state'

beforeEach(() => setRandom(seeded(1)))
afterEach(() => setRandom())

describe('burst', () => {
  it('pushes n sparks (default 7) and stops at 240 fx', () => {
    const s = createState()
    burst(s, 10, 20, '#fff')
    expect(s.fx).toHaveLength(7)
    expect(s.fx[0]).toMatchObject({ x: 10, y: 20, max: 0.65, color: '#fff' })
    for (const f of s.fx) {
      expect(f.life).toBeGreaterThanOrEqual(0.2)
      expect(f.life).toBeLessThan(0.65)
    }
    burst(s, 0, 0, '#000', 500)
    expect(s.fx).toHaveLength(240)
  })
})

describe('impact', () => {
  it('keeps rapid regular and elite impacts local, while allowing only rare gentle camera nudges', () => {
    const s = createState()
    impact(s, 1, 2)
    expect(s.impactWaves[0]).toEqual({ x: 1, y: 2, size: 36, color: '#ffd59a', life: 0.38, max: 0.38 })
    expect(s.cameraKick).toBe(0)
    for (let i = 0; i < 50; i++) impact(s, i, 0, 10, '#abc', 2)
    expect(s.impactWaves).toHaveLength(37)
    expect(s.impactWaves.at(-1)?.x).toBe(49)
    expect(s.cameraKick).toBe(0)
    impact(s, 0, 0, 200, '#fff', 3)
    expect(s.cameraKick).toBeGreaterThan(0)
    expect(s.cameraKick).toBeLessThanOrEqual(1.6)
    // A crowd of simultaneous heavy impacts should never create a continuous shake.
    s.cameraKick = 0
    for (let i = 0; i < 50; i++) {
      s.worldClock += 0.01
      impact(s, i, 0, 120, '#fff', 3)
    }
    expect(s.cameraKick).toBe(0)
    s.worldClock += 0.7
    impact(s, 0, 0, 120, '#fff', 3)
    expect(s.cameraKick).toBeGreaterThan(0)
  })
})

describe('zigzag', () => {
  it('builds an 8-point bolt from start to end that lives .23s', () => {
    const s = createState()
    zigzag(s, 0, 0, 70, 140)
    const bolt = s.lightningFx[0]!
    expect(bolt.pts).toHaveLength(8)
    expect(bolt.pts[0]).toEqual({ x: 0, y: 0 })
    expect(bolt.pts[7]).toEqual({ x: 70, y: 140 })
    expect(Math.abs(bolt.pts[1]!.x - 10)).toBeLessThanOrEqual(22)
    expect(bolt).toMatchObject({ life: 0.23, max: 0.23 })
  })
})

describe('pushEcho', () => {
  it('keeps at most 17 echoes', () => {
    const s = createState()
    pushEcho(s, 1, 2, 'wizard', 3)
    expect(s.motionEchoes[0]).toEqual({ x: 1, y: 2, kind: 'wizard', frame: 3, angle: 0, life: 0.23, max: 0.23 })
    for (let i = 0; i < 30; i++) pushEcho(s, i, 0, 'knight', 0, 1)
    expect(s.motionEchoes).toHaveLength(17)
  })
})

describe('damage number priority', () => {
  it('preserves critical popups when ordinary hit numbers fill the bounded queue', () => {
    const s = createState()
    for (let i = 0; i < 80; i++) pushDamageNumber(s, { x: i, y: 0, life: 0.62, value: i, boss: false, critical: false })
    pushDamageNumber(s, { x: 999, y: 0, life: 0.82, value: 9000, boss: false, critical: true })
    expect(s.numberFx).toHaveLength(80)
    expect(s.numberFx.some(n => n.value === 9000 && n.critical)).toBe(true)

    for (let i = 0; i < 80; i++) pushDamageNumber(s, { x: i, y: 0, life: 0.62, value: i, boss: false, critical: false })
    expect(s.numberFx.some(n => n.value === 9000 && n.critical)).toBe(true)
    expect(s.numberFx.length).toBeLessThanOrEqual(80)
  })
})
