import { describe, expect, it } from 'vitest'
import {
  HERO_ART_SLOTS, HERO_MOTE_SLOTS, heroArtPose, heroMoteBudget, heroMotePose, heroStrikeTime,
  type HeroCast, type HeroPose,
} from './hero-choreography'

const pose = (): HeroPose => ({ x: 0, y: 0, rotation: 0, width: 0, height: 0, alpha: 0, tint: 0, texture: 'spark', additive: true })
const targets = [{ x: 120, y: 10 }, { x: -60, y: 90 }, { x: 30, y: -130 }] as const
const cast = (kind: HeroCast['kind'], elapsed: number, life: number, reduced = false): HeroCast =>
  ({ kind, elapsed, life, targets, reduced })
const art = (c: HeroCast) => {
  const out: HeroPose[] = []
  for (let i = 0; i < HERO_ART_SLOTS; i++) { const p = pose(); if (heroArtPose(p, c, i)) out.push(p) }
  return out
}
const motes = (c: HeroCast, budget = HERO_MOTE_SLOTS) => {
  const out: HeroPose[] = []
  for (let i = 0; i < budget; i++) { const p = pose(); if (heroMotePose(p, c, i)) out.push(p) }
  return out
}

describe('hero special GPU choreography', () => {
  it('staggers Shadowblade blink-cuts on each struck enemy in step with the cast SFX transients', () => {
    expect(heroStrikeTime('hero-shadowblade', 0)).toBeLessThanOrEqual(0.05)
    for (let i = 0; i < 3; i++) {
      const at = heroStrikeTime('hero-shadowblade', i)
      if (i) expect(at - heroStrikeTime('hero-shadowblade', i - 1)).toBeCloseTo(0.13, 2)
      const cuts = art(cast('hero-shadowblade', at + 0.03, 1)).filter(p => p.texture === 'rift'
        && Math.abs(p.x - targets[i]!.x) < 0.01 && Math.abs(p.y - targets[i]!.y) < 0.01)
      expect(cuts.length).toBeGreaterThanOrEqual(2)
      expect(new Set(cuts.map(c => c.rotation.toFixed(2))).size).toBeGreaterThan(1)
    }
    // Before its own strike, no cut is painted at the last target.
    const early = art(cast('hero-shadowblade', heroStrikeTime('hero-shadowblade', 2) - 0.08, 1))
    expect(early.some(p => p.texture === 'rift' && p.x === targets[2].x && p.y === targets[2].y)).toBe(false)
  })

  it('sends Spirit Summoner wisps from the hero to each target, then shows a rising heal', () => {
    const gather = art(cast('hero-spirit-summoner', 0.2, 1.1)).filter(p => p.texture === 'flame')
    expect(gather.length).toBe(3)
    expect(gather.every(p => Math.hypot(p.x, p.y) < 80)).toBe(true)
    const arrive = art(cast('hero-spirit-summoner', heroStrikeTime('hero-spirit-summoner', 0), 0.8))
    for (const t of targets) expect(arrive.some(p => p.texture === 'flame' && Math.hypot(p.x - t.x, p.y - t.y) < 1)).toBe(true)
    expect(art(cast('hero-spirit-summoner', 0.5, 0.8)).some(p => p.texture === 'guardian')).toBe(true)
    const heal = motes(cast('hero-spirit-summoner', 0.9, 0.4))
    expect(heal.length).toBeGreaterThan(4)
    expect(heal.filter(p => Math.hypot(p.x, p.y) < 90).length).toBeGreaterThan(heal.length / 2)
  })

  it('holds the Scarlet Aegis ward and orbiting runes on the hero, then shatters outward', () => {
    const sustain = art(cast('hero-crimson-paladin', 1.8, 1.7))
    const ward = sustain.find(p => p.texture === 'ward')!
    expect(ward).toMatchObject({ x: 0, y: 0 })
    const runes = sustain.filter(p => p.texture === 'crystal')
    expect(runes).toHaveLength(6)
    const later = art(cast('hero-crimson-paladin', 2.1, 1.4)).filter(p => p.texture === 'crystal')
    expect(later.map(p => p.x)).not.toEqual(runes.map(p => p.x))
    const shatter = art(cast('hero-crimson-paladin', 3.4, 0.1))
    const brokenWard = shatter.find(p => p.texture === 'ward')!
    expect(brokenWard.width).toBeGreaterThan(ward.width)
    expect(brokenWard.alpha).toBeLessThan(ward.alpha)
    const r = (p: HeroPose) => Math.hypot(p.x, p.y)
    expect(Math.min(...shatter.filter(p => p.texture === 'crystal').map(r))).toBeGreaterThan(Math.max(...runes.map(r)))
  })

  it('reduced motion keeps a static readable pose, dim alpha and no particles', () => {
    for (const kind of ['hero-shadowblade', 'hero-spirit-summoner', 'hero-crimson-paladin'] as const) {
      expect(heroMoteBudget(true, 'high')).toBe(0)
      const a = art(cast(kind, 0.2, 0.9, true)), b = art(cast(kind, 0.6, 0.6, true))
      expect(a.length).toBeGreaterThan(0)
      expect(a.map(p => [p.x, p.y, p.rotation, p.width, p.height])).toEqual(b.map(p => [p.x, p.y, p.rotation, p.width, p.height]))
      expect(a.every(p => p.alpha <= 0.55)).toBe(true)
    }
  })

  it('is bounded and finite for every quality, phase and empty target list', () => {
    expect(heroMoteBudget(false, 'low')).toBeLessThan(heroMoteBudget(false, 'medium'))
    expect(heroMoteBudget(false, 'high')).toBe(HERO_MOTE_SLOTS)
    for (const kind of ['hero-shadowblade', 'hero-spirit-summoner', 'hero-crimson-paladin'] as const) {
      for (let e = 0; e <= 3.5; e += 0.07) {
        for (const list of [[], targets]) {
          const c: HeroCast = { kind, elapsed: e, life: Math.max(0.01, 3.5 - e), targets: list, reduced: false }
          for (const p of [...art(c), ...motes(c)]) {
            expect([p.x, p.y, p.rotation, p.width, p.height, p.alpha].every(Number.isFinite)).toBe(true)
            expect(p.alpha).toBeGreaterThanOrEqual(0)
            expect(p.alpha).toBeLessThanOrEqual(1)
          }
        }
      }
      expect(heroArtPose(pose(), cast(kind, 0.3, 0.8), HERO_ART_SLOTS)).toBe(false)
      expect(heroMotePose(pose(), cast(kind, 0.3, 0.8), HERO_MOTE_SLOTS)).toBe(false)
    }
  })
})
