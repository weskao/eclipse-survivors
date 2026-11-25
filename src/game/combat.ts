// Hits, auto-attack, hero damage and dash (original hit / attack / damageHero / dash).
import { BALANCE } from './config'
import { recordKill } from './kill-streak'
import { burst, impact, emitHitImpact, pushDamageNumber, pushEcho, requestCameraKick, zigzag } from './fx'
import { getFiringOrigin } from './weapon-geometry'
import { dist, rand } from './math'
import { DASH_COOLDOWN, DURATION } from './constants'
import type { GameHooks, GameState, Hero, Mob } from './types'
import type { FactionBridge } from './content/enemies/integration'

/** Living mobs sorted nearest-first (shared by attack, bolt and meteor). */
export function nearestAlive(mobs: Mob[], hero: Hero): Mob[] {
  const alive: Mob[] = []
  const distances = new Map<Mob, number>()
  for (const e of mobs) {
    if (e.hp <= 0) continue
    alive.push(e)
    distances.set(e, dist(e.x - hero.x, e.y - hero.y) - e.r)
  }
  return alive.sort((a, b) => distances.get(a)! - distances.get(b)!)
}

export function hit(s: GameState, e: Mob, d: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero || e.hp <= 0 || !Number.isFinite(d) || d <= 0) return
  const applied = hooks.modifyOutgoingDamage?.(d, e) ?? d
  if (!Number.isFinite(applied) || applied <= 0) return
  const critical = hooks.consumeCriticalHit?.() ?? false
  const boss = e.type === 'boss'
  const heavy = boss || e.type === 'golem' || !!e.elite
  if ((critical || heavy) && s.time - (e.lastVisualHoldAt ?? -Infinity) >= BALANCE.combat.hitStopCooldownSeconds) {
    e.visualPhase ??= e.phase
    e.visualHold = critical ? BALANCE.combat.hitStopCriticalSeconds : BALANCE.combat.hitStopHeavySeconds
    e.lastVisualHoldAt = s.time
  }
  const dealt = Math.min(e.hp, applied)
  s.damageDealt += dealt
  e.hp = Math.max(0, e.hp - applied)
  e.hit = 0.16
  e.stagger = Math.min(0.22, e.stagger + (boss ? 0.04 : 0.12))
  const knock = dist(e.x - hero.x, e.y - hero.y) || 1
  e.kx = (e.x - hero.x) / knock
  e.ky = (e.y - hero.y) / knock
  const impactAngle = Math.atan2(e.ky, e.kx)
  emitHitImpact(s, e.x, e.y - Math.min(30, e.r), e.r, impactAngle, critical, heavy)
  pushDamageNumber(s, { x: e.x + rand(-13, 13), y: e.y - 38, life: critical ? 0.82 : 0.62, value: Math.round(applied), boss, critical })
  if (critical) hooks.content?.(s, { type: 'critical-hit', x: e.x, y: e.y - 20, angle: impactAngle, contactOwned: true })
  hooks.content?.(s, { type: 'hit', mob: e, damage: dealt })
  if (e.hp === 0) {
    recordKill(s)
    if (s.fallenMobs.length >= 24) s.fallenMobs.shift()
    e.deathVisual = boss ? .7 : .28
    s.fallenMobs.push(e)
    s.defeatedTypes[e.type] = (s.defeatedTypes[e.type] ?? 0) + 1
    const value = boss ? BALANCE.combat.killXp.boss : e.type === 'golem' ? BALANCE.combat.killXp.golem : e.type === 'goblin' ? BALANCE.combat.killXp.goblin : BALANCE.combat.killXp.default
    s.stars.push({ x: e.x, y: e.y, value: Math.round(value * (e.rewardXpMultiplier ?? 1)), t: rand(0, 6) })
    burst(s, e.x, e.y, boss ? '#ffae83' : '#8cebbf', boss ? 35 : 11)
    hooks.sfx(boss ? 'bossDefeat' : 'kill')
    if (boss) {
      s.bossDefeated = true
      hooks.message('🏆 擊敗森林魔王！')
      impact(s, e.x, e.y, 210, '#ffdca4', 3)
    }
    // Observers see a fully finalized kill, including the boss flag and spawned XP.
    hooks.content?.(s, { type: 'kill', mob: e, damage: dealt })
  }
}

export function dash(s: GameState, hooks: GameHooks): void {
  const hero = s.hero
  if (s.mode !== 'play' || !hero || hero.dashCd > 0) return
  hero.dash = BALANCE.combat.dashDuration
  hero.dashCd = DASH_COOLDOWN
  hero.inv = Math.max(hero.inv, BALANCE.combat.dashInvulnerability)
  burst(s, hero.x, hero.y, '#d8f8ff', 15)
  impact(s, hero.x, hero.y, 55, '#c6f7ff', 0.4)
  pushEcho(s, hero.x, hero.y, s.choice, 0)
  hooks.sfx('dash')
}

export function attack(s: GameState, hooks: GameHooks, factions?: FactionBridge): void {
  const hero = s.hero
  if (!hero || (!s.mobs.length && !factions?.runtime.enemies.length)) return
  const choice = s.choice
  const close = nearestAlive(s.mobs, hero)
  const legacy = close[0]
  const faction = factions?.nearestFaction(hero.x, hero.y, hero.range + 64)
  const useFaction = !!faction && (!legacy ||
    dist(faction.x - hero.x, faction.y - hero.y) - faction.radius <
    dist(legacy.x - hero.x, legacy.y - hero.y) - legacy.r)
  const target = useFaction ? faction : legacy
  if (!target) return
  const targetRadius = 'radius' in target ? target.radius : target.r
  if (dist(target.x - hero.x, target.y - hero.y) > hero.range + targetRadius) return
  const multi = Math.min(1 + (hero.skills.multi ?? 0), 4)
  const angle = Math.atan2(target.y - hero.y, target.x - hero.x)
  hero.face = Math.cos(angle) >= 0 ? 1 : -1
  hero.aimAngle = angle
  hero.strike = 0.29
  // The weapon ribbon owns melee release; ranged casts retain one local muzzle accent.
  if (choice === 'ranger') impact(s, hero.x, hero.y, 21, '#f8dba8', 0.35)
  if (choice === 'knight') {
    for (let j = 0; j < multi; j++) {
      const a = angle + (j - (multi - 1) / 2) * 0.43
      s.swipes.push({ x: hero.x, y: hero.y, a, life: 0.29, max: 0.29, r: rand(70, 84) })
      for (const e of close) {
        const r = dist(e.x - hero.x, e.y - hero.y)
        const d = Math.atan2(e.y - hero.y, e.x - hero.x)
        if (r < hero.range + e.r && Math.cos(d - a) > 0.71) hit(s, e, hero.damage, hooks)
      }
      // The authored faction pool is separate from the legacy Mob array.
      // Reuse its authoritative damage/reward bridge, never a fake Mob copy.
      for (const e of factions?.factionsInRadius(hero.x, hero.y, hero.range + 35) ?? []) {
        const r = dist(e.x - hero.x, e.y - hero.y)
        const d = Math.atan2(e.y - hero.y, e.x - hero.x)
        if (r < hero.range + e.radius && Math.cos(d - a) > 0.71) {
          factions!.hitFaction(s, e, hero.damage, hero.x, hero.y, hooks)
        }
      }
    }
    hooks.sfx('knight')
  } else {
    const ranger = choice === 'ranger'
    // The projectile and the rigged hand share a single world-space origin.
    const grip = getFiringOrigin(choice, hero.face)
    const originX = hero.x + grip.x
    const originY = hero.y + grip.y
    const shotAngle = Math.atan2(target.y - originY, target.x - originX)
    hero.aimAngle = shotAngle
    for (let j = 0; j < multi; j++) {
      const a = shotAngle + (j - (multi - 1) / 2) * 0.18
      const speed = ranger ? 540 : 340
      s.shots.push({
        x: originX, y: originY, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: ranger ? 1.2 : 1.7, d: hero.damage, kind: ranger ? 'arrow' : 'magic', r: ranger ? 5 : 9,
      })
    }
    if (choice === 'wizard') impact(s, originX, originY, 42, s.heroId === 'spirit-summoner' ? '#a5e8d7' : '#aa91ff', 0.45)
    hooks.sfx(ranger ? 'ranger' : 'wizard')
  }
  const chain = hero.skills.chain
  if (chain && hero.chainCd <= 0) {
    hero.chainCd = Math.max(BALANCE.combat.chainMinCooldown, BALANCE.skills.passive.chainCooldownBase - chain * BALANCE.skills.passive.chainCooldownPerRank)
    const limit = BALANCE.combat.chainTargetsByRank[Math.min(chain, BALANCE.combat.chainTargetsByRank.length) - 1]!
    const damage = hero.damage * (BALANCE.skills.passive.chainDamageBase + BALANCE.skills.passive.chainDamagePerRank * chain)
    const shock = chain >= BALANCE.combat.chainShockRank
    let from: Hero | Mob = hero
    let killed: Mob | undefined
    let count = 0, next = 0
    for (; next < close.length && count < limit; next++) {
      const to = close[next]!
      if (to.hp <= 0) continue
      zigzag(s, from.x, from.y - 25, to.x, to.y)
      hit(s, to, damage, hooks)
      if (to.hp > 0 && shock) to.slow = Math.max(to.slow, BALANCE.combat.chainShockSeconds)
      if (to.hp === 0) killed ??= to
      from = to
      count++
    }
    // One non-recursive discharge per cast. Only unvisited targets qualify.
    if (killed && chain >= BALANCE.combat.chainDischargeRank) {
      let extra: Mob | undefined
      let nearest = BALANCE.combat.chainDischargeRadius ** 2
      for (; next < close.length; next++) {
        const to = close[next]!
        if (to.hp <= 0) continue
        const d2 = (to.x - killed.x) ** 2 + (to.y - killed.y) ** 2
        if (d2 < nearest) { nearest = d2; extra = to }
      }
      if (extra) {
        zigzag(s, killed.x, killed.y - 25, extra.x, extra.y)
        hit(s, extra, damage * BALANCE.combat.chainDischargeDamageMultiplier, hooks)
        if (extra.hp > 0) extra.slow = Math.max(extra.slow, BALANCE.combat.chainShockSeconds)
      }
    }
    hooks.sfx('chain')
  }
}

/** Independent victory predicates for timed, boss-rush, and combined modes. */
export function victoryConditionMet(
  s: GameState,
  rule: 'survival' | 'boss' | 'survival-boss' = 'survival-boss',
): boolean {
  if (!s.hero || s.hero.hp <= 0) return false
  const survived = s.time >= DURATION
  // Never mistake a despawned boss, an unspawned boss, or a second live boss for a kill.
  const bossDefeated = s.bossDefeated && !s.mobs.some((e) => e.type === 'boss' && e.hp > 0)
  if (rule === 'survival') return survived
  if (rule === 'boss') return bossDefeated
  return survived && bossDefeated
}

export function damageHero(s: GameState, n: number, hooks: GameHooks, source?: Mob): void {
  const hero = s.hero
  if (!hero || s.mode !== 'play' || hero.hp <= 0 || hero.inv > 0 || hero.dash > 0 || !Number.isFinite(n) || n <= 0) return
  const mitigated = hooks.mitigateIncomingDamage?.(n) ?? n
  // A completely absorbed hit neither removes HP nor grants phantom invulnerability.
  if (!Number.isFinite(mitigated) || mitigated <= 0) return
  const shield = hero.skills.shield ?? 0
  const reduce = 1 - Math.min(BALANCE.skills.passive.shieldReductionCap, shield * BALANCE.skills.passive.shieldReductionPerRank)
  const taken = mitigated * reduce
  const actuallyTaken = Math.min(Math.max(0, hero.hp), taken)
  s.damageTaken += actuallyTaken
  hero.hp = Math.max(0, hero.hp - taken)
  if (actuallyTaken > 0) {
    pushDamageNumber(s, { x: hero.x, y: hero.y - 56, life: 0.7,
      value: Math.round(actuallyTaken), boss: false, received: true })
  }
  hero.inv = 1
  // Routine chip damage uses local hit feedback; only major HP loss nudges the camera.
  if (actuallyTaken >= hero.max * 0.22) requestCameraKick(s, 1.6)
  impact(s, hero.x, hero.y, 48, '#ff5b69', 1)
  if (shield) {
    impact(s, hero.x, hero.y, 58, '#9ad3ff', 0.4)
    burst(s, hero.x, hero.y, '#bbdcff', 10)
  }
  burst(s, hero.x, hero.y, '#ff9d9e', 14)
  // Create breathing room after a contact hit, including when mobs overlap exactly.
  for (const [i, e] of s.mobs.entries()) {
    if (e.hp <= 0) continue
    const dx = e.x - hero.x
    const dy = e.y - hero.y
    const distance = dist(dx, dy)
    const boss = e.type === 'boss'
    const clearance = e.r + 15 + (boss ? 10 : 30)
    if (distance >= clearance) continue
    const a = i * 2.4
    const kx = distance > 0.001 ? dx / distance : Math.cos(a)
    const ky = distance > 0.001 ? dy / distance : Math.sin(a)
    const push = (clearance - distance) * (boss ? 0.45 : 1)
    e.x += kx * push
    e.y += ky * push
    e.kx = kx
    e.ky = ky
    e.stagger = Math.max(e.stagger, boss ? 0.04 : 0.14)
  }
  hooks.sfx('hurt')
  hooks.content?.(s, { type: 'damage', amount: actuallyTaken })
  hooks.afterDamage?.(actuallyTaken, source)
  if (hero.hp === 0) hooks.end(false)
}
