import { describe, expect, it, vi } from 'vitest'
import { attack } from '../combat'
import { moveHero } from '../movement'
import { createHero, createState } from '../state'
import type { GameState, JobId, Mob } from '../types'
import { sampleHeroAnimation } from './animation'
import { sampleWeaponRig } from './weapon-rig'
import { getFiringOrigin } from '../weapon-geometry'

const target = (x: number, y: number): Mob => ({
  x, y, type: 'slime', hp: 100, max: 100, r: 18, speed: 0, dmg: 1,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})
const hooks = { sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn() }
function setup(job: JobId): GameState {
  const s = createState()
  s.choice = job
  s.hero = createHero(job)
  s.mode = 'play'
  return s
}

describe('weapon world-space alignment', () => {
  it.each(['ranger', 'wizard'] as const)('%s fires from its drawn hand toward the enemy in every quadrant', (job) => {
    for (const [x, y] of [[100, 85], [-100, 85], [100, -85], [-100, -85]]) {
      const s = setup(job)
      s.mobs.push(target(x, y))
      attack(s, hooks)
      const hero = s.hero!
      const shot = s.shots[0]!
      const grip = getFiringOrigin(job, hero.face)
      expect(shot.x).toBeCloseTo(hero.x + grip.x)
      expect(shot.y).toBeCloseTo(hero.y + grip.y)
      expect(hero.aimAngle).toBeCloseTo(Math.atan2(y - shot.y, x - shot.x))
      expect(shot.vx * (y - shot.y) - shot.vy * (x - shot.x)).toBeCloseTo(0, 5)
      expect(shot.vx * (x - shot.x) + shot.vy * (y - shot.y)).toBeGreaterThan(0)
    }
  })

  it('locks facing during the active swing instead of letting movement reverse the weapon', () => {
    const s = setup('knight')
    s.mobs.push(target(-55, 0))
    attack(s, hooks)
    expect(s.hero!.face).toBe(-1)
    moveHero(s, { x: 1, y: 0 }, 0.12)
    expect(s.hero!.face).toBe(-1)
  })
})

describe('physical two-bone animation', () => {
  it.each(['knight', 'ranger', 'wizard'] as const)('%s has actual elbow and wrist joints with constrained limb lengths', (job) => {
    const s = setup(job)
    const hero = s.hero!
    hero.aimAngle = 0.25
    hero.strike = 0.28
    const windup = sampleWeaponRig(job, hero, sampleHeroAnimation(s, hero))
    hero.strike = 0.10
    const release = sampleWeaponRig(job, hero, sampleHeroAnimation(s, hero))
    for (const pose of [windup, release]) {
      expect(Math.hypot(pose.elbow.x - pose.shoulder.x, pose.elbow.y - pose.shoulder.y)).toBeCloseTo(pose.upperLength, 4)
      expect(Math.hypot(pose.hand.x - pose.elbow.x, pose.hand.y - pose.elbow.y)).toBeCloseTo(pose.foreLength, 4)
    }
    expect(release.elbow).not.toEqual(windup.elbow)
  })

  it('aims the wizard and ranger in the same facing-local coordinates as the shot origin', () => {
    for (const job of ['ranger', 'wizard'] as const) {
      const s = setup(job)
      const hero = s.hero!
      hero.face = -1
      hero.strike = 0.2
      hero.aimAngle = Math.PI * 0.75
      const rig = sampleWeaponRig(job, hero, sampleHeroAnimation(s, hero))
      const origin = getFiringOrigin(job, hero.face)
      expect(rig.hand.x * hero.face).toBeCloseTo(origin.x)
      expect(rig.hand.y).toBeCloseTo(origin.y)
      expect(Math.cos(rig.aim)).toBeGreaterThan(0)
    }
  })
})
