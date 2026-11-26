import { describe, expect, it } from 'vitest'
import type { SfxCue } from '../types'
import { NOISE_CUES, SFX_COOLDOWN, SFX_CUES, milestoneTones, treasureTones } from './sfx'

// Copied from the original game.js `sfxCooldown` table.
const ORIGINAL_COOLDOWN: Record<Exclude<SfxCue, 'treasureReveal' | 'treasureClaim' | 'hitNormal' | 'hitHeavy' | 'hitCritical' | 'hitElemental' | 'hitEvolved' | 'hitHero' | 'eliteKill' | 'bossStagger' | 'pickupBurst' | 'evolution' | 'killStreak' | 'massKill' | 'deny' | 'hurt-heavy' | 'hurt-critical' | 'hurt-extreme' | 'shadowblade-special' | 'spirit-summoner-special' | 'crimson-paladin-special'>, number> = {
  ui: 0.07, hover: 0.15, select: 0.09, start: 0.4, pause: 0.2, resume: 0.2, upgrade: 0.1, level: 0.26,
  dash: 0.28, knight: 0.12, ranger: 0.1, wizard: 0.15, chain: 0.23, kill: 0.14, boss: 0.8, bossDefeat: 0.8,
  hurt: 0.28, pickup: 0.16, scene: 0.45, victory: 1, defeat: 1, bolt: 0.3, frost: 0.5, meteor: 0.45, vortex: 0.5,
}

describe('sfx tables', () => {
  it('cooldowns match game.js', () => {
    const { treasureReveal, treasureClaim, hitNormal, hitHeavy, hitCritical, hitElemental, hitEvolved, hitHero, eliteKill, deny, 'hurt-heavy': heavy, 'hurt-critical': critical, 'hurt-extreme': extreme, killStreak, massKill, pickupBurst, evolution, bossStagger, 'shadowblade-special': shadow, 'spirit-summoner-special': spirit, 'crimson-paladin-special': paladin, ...legacy } = SFX_COOLDOWN
    expect([heavy, critical, extreme]).toEqual([.34, .39, .48])
    expect([shadow, spirit, paladin]).toEqual([0.55, 0.9, 0.75])
    expect(legacy).toEqual(ORIGINAL_COOLDOWN)
    expect(deny).toBe(0.22)
    expect(treasureReveal).toBeGreaterThan(0)
    expect(treasureClaim).toBeGreaterThan(0)
    expect([hitNormal,hitHeavy,hitCritical,hitElemental,hitEvolved,hitHero,eliteKill].every(n=>n>=.1)).toBe(true)
    expect(killStreak).toBeGreaterThan(0.5)
    expect(massKill).toBeGreaterThan(0.5)
    expect(pickupBurst).toBeGreaterThan(0.16)
    expect(evolution).toBeGreaterThan(0.1)
    expect(bossStagger).toBeGreaterThan(0.5)
  })

  it('hero casts have distinct, finite, bounded one-shot signatures', () => {
    const cues = ['shadowblade-special', 'spirit-summoner-special', 'crimson-paladin-special'] as const
    const signatures = cues.map(cue => SFX_CUES[cue])
    expect(new Set(signatures.map(notes => JSON.stringify(notes))).size).toBe(3)
    for (const notes of signatures) {
      expect(notes.length).toBeGreaterThanOrEqual(3)
      expect(notes.length).toBeLessThanOrEqual(6)
      expect(notes[0]?.[1]).toBe(0)
      expect(notes.every(([, delay, duration, gain]) => delay >= 0 && duration > 0 && delay + duration <= 1.2 && gain > 0 && gain <= 0.085)).toBe(true)
    }
  })

  it('every cue has at least one tone and the original cue count', () => {
    const cues = Object.keys(SFX_COOLDOWN) as SfxCue[]
    expect(Object.keys(SFX_CUES).sort()).toEqual([...cues].sort())
    for (const cue of cues) expect(SFX_CUES[cue].length).toBeGreaterThan(0)
  })

  it('spot-checks tone tuples [pitch, delay, duration, gain, wave]', () => {
    expect(SFX_CUES.ui).toEqual([[72, 0, 0.07, 0.02, 'sine']])
    expect(SFX_CUES.deny).toEqual([[56, 0, 0.11, 0.026, 'triangle'], [49, 0.09, 0.18, 0.019, 'sine']])
    expect(SFX_CUES.start).toEqual([[48, 0, 0.47, 0.085, 'sawtooth'], [55, 0.11, 0.65, 0.05, 'triangle'], [72, 0.18, 0.77, 0.055, 'sine']])
    expect(SFX_CUES.victory).toEqual([[64, 0, 0.28, 0.043, 'triangle'], [67, 0.13, 0.34, 0.035, 'sine'], [76, 0.29, 0.43, 0.023, 'sine']])
    expect(SFX_CUES.vortex).toEqual([[52, 0, 0.5, 0.06, 'triangle'], [59, 0.16, 0.5, 0.033, 'sine']])
    expect(SFX_CUES.hurt).toEqual([[42, 0, 0.2, 0.07, 'sawtooth'], [35, 0.06, 0.19, 0.05, 'triangle'], [30, 0.12, 0.13, 0.022, 'sine']])
    expect(SFX_CUES.defeat).toEqual([[52, 0, 0.44, 0.06, 'triangle'], [47, 0.2, 0.52, 0.05, 'sawtooth'], [40, 0.44, 0.74, 0.05, 'sine']])
  })

  it('uses a short E/G celebration accent that does not clash with the sampled E-minor fanfare', () => {
    const notes = SFX_CUES.victory
    expect(notes.every(([pitch, delay, duration]) =>
      [4, 7].includes(pitch % 12) && delay + duration <= 0.75)).toBe(true)
  })

  it('noise burst cues are knight, dash, hurt, boss', () => {
    expect([...NOISE_CUES].sort()).toEqual(['boss', 'dash', 'hurt', 'knight'])
  })
})

it('has six distinct bounded layered streak signatures and three distinct hit signatures', () => {
  const signatures = [10,25,50,100,200,500].map(milestoneTones)
  expect(new Set(signatures.map(t=>JSON.stringify(t))).size).toBe(6)
  expect(signatures.every(tones=>tones.length<=6 && tones.every(([,delay,duration,gain])=>delay+duration<=1.5 && gain<=.085))).toBe(true)
  expect(new Set([SFX_CUES.hitNormal,SFX_CUES.hitHeavy,SFX_CUES.hitCritical].map(t=>JSON.stringify(t))).size).toBe(3)
})

it('gives five advertised chest tiers distinct bounded reveal sounds',()=>{
  const tones=[0,1,2,3,4].map(treasureTones)
  expect(new Set(tones.map(t=>JSON.stringify(t))).size).toBe(5)
  expect(tones.every(t=>t.length<=6&&t.every(([,d,l,g])=>d+l<=1.5&&g<=.085))).toBe(true)
})

it('gives elemental, evolution and active-skill contact audio distinct bounded layers', () => {
  const cues = ['hitElemental', 'hitEvolved', 'hitHero'] as const
  // String lookup keeps this test executable on the pre-feature commit.
  const notes = cues.map(cue => (SFX_CUES as Record<string, readonly (readonly [number, number, number, number, string])[]>)[cue])
  expect(notes.every(n => n && n.length >= 2 && n.length <= 4)).toBe(true)
  expect(new Set(notes.map(n => JSON.stringify(n))).size).toBe(3)
  expect(notes.every(n => n!.every(([, delay, duration, gain]) => delay + duration <= .5 && gain <= .065))).toBe(true)
})
