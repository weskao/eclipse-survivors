// One simulation tick: the original update(dt) minus toast timer and HUD refresh (the engine does those).
import { sampleCombat } from './combat-telemetry'
import { BALANCE } from './config'
import { expireKillStreak, flushKillMilestone } from './kill-streak'
import { burst } from './fx'
import { compactXpGems } from './xp-gems'
import { attack, hit, victoryConditionMet } from './combat'
import { hallAttackDelay, tickHall, withHallSource } from './content/meta/hall-runtime'
import type { ContentRegistry } from './content/registry'
import type { FactionBridge } from './content/enemies/integration'
import { hasWonRun } from '../meta/modes'
import { tickWorld } from './events'
import { resolveObstacleCollision } from './world'
import { tickEnemies, tickEnemyProjectiles } from './enemies/ai'
import { minmax } from './math'
import { moveHero } from './movement'
import { addXp } from './progression'
import { sceneIndexAt, setScene } from './scene'
import { tickSkills } from './skills'
import { tickSpawning } from './spawn'
import type { GameHooks, GameState, Hero, MoveInput } from './types'

function tickTimers(s: GameState, hero: Hero, dt: number): void {
  s.time += dt
  expireKillStreak(s)
  s.worldClock += dt
  hero.attack -= dt
  hero.inv -= dt
  hero.dash -= dt
  hero.dashCd -= dt
  hero.bolt -= dt
  hero.chainCd -= dt
  hero.frostCd -= dt
  hero.meteorCd -= dt
  hero.blazeTick -= dt
  hero.vortexCd -= dt
  hero.shieldPulse -= dt
  for (const id of Object.keys(hero.evolutionCd) as (keyof typeof hero.evolutionCd)[]) {
    hero.evolutionCd[id] = (hero.evolutionCd[id] ?? 0) - dt
  }
  hero.strike = Math.max(0, hero.strike - dt)
  hero.levelAnim = Math.max(0, hero.levelAnim - dt * 0.9)
  s.cameraKick = Math.max(0, s.cameraKick - dt * 27)
}

function moveShots(s: GameState, hero: Hero, dt: number, hooks: GameHooks, factions?: FactionBridge): void {
  const shotHooks = withHallSource(s, hooks, 'basic')
  for (const b of s.shots) {
    const activeHooks = b.hallProc ? {...shotHooks,hallSource:'proc' as const,modifyOutgoingDamage:undefined,consumeCriticalHit:undefined} : shotHooks
    b.prevX = b.x
    b.prevY = b.y
    const travel = Math.min(dt, Math.max(0, b.life))
    b.x += b.vx * travel
    b.y += b.vy * travel
    if (travel <= 0) { b.life -= dt; continue }
    // The bridge owns both target pools, including misses. Resolve before
    // expiring the projectile so its final swept segment can still hit.
    if (factions) {
      factions.resolveShot(s, b, activeHooks, { x: b.prevX, y: b.prevY })
      b.life -= dt
      continue
    }
    b.life -= dt
    const dx = b.x - b.prevX
    const dy = b.y - b.prevY
    const lengthSquared = dx * dx + dy * dy
    let closest: typeof s.mobs[number] | null = null
    let firstContact = Infinity
    for (const e of s.mobs) {
      if (e.hp <= 0 || b.hallVisited?.has(e)) continue
      const ox = b.prevX - e.x
      const oy = b.prevY - e.y
      const reach = e.r + b.r
      const c = ox * ox + oy * oy - reach * reach
      let t = 0
      if (c > 0) {
        if (lengthSquared === 0) continue
        const projection = ox * dx + oy * dy
        const discriminant = projection * projection - lengthSquared * c
        if (discriminant < 0) continue
        t = (-projection - Math.sqrt(discriminant)) / lengthSquared
        if (t < 0 || t > 1) continue
      }
      if (t < firstContact) {
        closest = e
        firstContact = t
      }
    }
    if (closest) {
      hit(s, closest, b.d, activeHooks, { x: b.prevX, y: b.prevY })
      if (b.hallPierce) { b.hallPierce--; b.hallVisited?.add(closest) }
      else b.life = 0
    }
  }
  s.shots = s.shots.filter((b) => b.life > 0)
  // The required boss must never disappear just because the player moved far away.
  s.mobs = s.mobs.filter((e) => {
    if (e.hp <= 0) return false
    if (e.type === 'boss') return true
    const dx = e.x - hero.x, dy = e.y - hero.y
    return dx * dx + dy * dy < 1700 * 1700
  })
}

function collectStars(s: GameState, hero: Hero, dt: number, hooks: GameHooks): void {
  let collected = 0
  const reach = s.magnetUntil > s.time ? Infinity : (BALANCE.skills.passive.xpMagnetBase + (hero.skills.magnet ?? 0) * BALANCE.skills.passive.xpMagnetPerRank) * (s.hall?.pickupRadius ?? 1)
  const pickupSquared = BALANCE.combat.starPickupDistance ** 2
  for (const star of s.stars) {
    if (star.dead) continue
    star.t += dt
    const dx = hero.x - star.x
    const dy = hero.y - star.y
    let squared = dx * dx + dy * dy
    if (squared < reach * reach) {
      // Normalize once, keep acceleration per gem and clamp at the hero.
      const d = Math.sqrt(squared)
      const speed = star.attractionSpeed ?? BALANCE.combat.starPickupSpeed
      const travel = Math.min(d, speed * dt)
      if (d > 0) {
        star.x += dx * travel / d
        star.y += dy * travel / d
      }
      star.attractionSpeed = Math.min(BALANCE.combat.starPickupMaxSpeed, speed + BALANCE.combat.starPickupAcceleration * dt)
      squared = (d - travel) ** 2
    } else {
      star.attractionSpeed = undefined
    }
    if (squared < pickupSquared) {
      star.dead = true
      // Keep one receipt per original drop, including pickup-triggered relic effects.
      if (star.mergedReceipts) {
        for (const [amount, count] of star.mergedReceipts) {
          collected += count
          for (let i = 0; i < count; i++) {
            addXp(s, amount * s.pickupGainMultiplier, hooks)
            hooks.content?.(s, { type: 'pickup', kind: 'xp', amount })
          }
        }
      } else {
        collected++
        addXp(s, star.value * s.pickupGainMultiplier, hooks)
        hooks.content?.(s, { type: 'pickup', kind: 'xp', amount: star.value })
      }
    }
  }
  if (collected >= BALANCE.combat.xpBurstThreshold) {
    hooks.sfx('pickupBurst')
    burst(s, hero.x, hero.y - 10, '#8ddfff', BALANCE.combat.xpBurstParticles)
  } else if (collected > 0) hooks.sfx('pickup')
  compactXpGems(s.stars)
}

/** Stable in-place cosmetic compaction: no per-frame filter arrays. */
function compactEffects<T extends {life: number}>(items: T[]): void {
  let write = 0
  for (let i = 0; i < items.length; i++) if (items[i]!.life > 0) items[write++] = items[i]!
  items.length = write
}

function ageEffects(s: GameState, hero: Hero, dt: number): void {
  let fallenWrite = 0
  for (const mob of s.fallenMobs) {
    mob.deathVisual = Math.max(0, (mob.deathVisual ?? 0) - dt)
    if (mob.deathVisual > 0) s.fallenMobs[fallenWrite++] = mob
  }
  s.fallenMobs.length = fallenWrite
  for (const f of s.fx) {
    f.x += (f.vx ?? 0) * dt
    f.y += (f.vy ?? 0) * dt
    f.life -= dt
    if (f.type === 'meteor') {
      f.y -= 125 * dt
      f.x += Math.sin(f.life * 26) * 8
    } else if (f.type === 'ember') {
      f.vx = (f.vx ?? 0) * 0.985
      f.vy = (f.vy ?? 0) * 0.98
    } else if (f.type === 'ice') {
      f.vx = (f.vx ?? 0) * 0.97
      f.vy = (f.vy ?? 0) * 0.97
    } else if (f.type === 'vortex') {
      f.a = (f.a ?? 0) + dt * 7
      f.x = hero.x + Math.cos(f.a) * (72 + Math.sin(f.life * 9) * 18)
      f.y = hero.y + Math.sin(f.a) * (72 + Math.sin(f.life * 9) * 18)
    }
  }
  for (const z of s.numberFx) {
    z.y -= (z.critical ? 42 : 34) * dt
    z.life -= dt
  }
  compactEffects(s.numberFx)
  compactEffects(s.fx)
  for (const z of s.impactWaves) z.life -= dt
  compactEffects(s.impactWaves)
  for (const z of s.lightningFx) z.life -= dt
  compactEffects(s.lightningFx)
  for (const z of s.motionEchoes) z.life -= dt
  compactEffects(s.motionEchoes)
  for (const w of s.swipes) w.life -= dt
  compactEffects(s.swipes)
}

export interface BossStepAdapter {
  spawn(state: GameState, hooks: GameHooks): void
  tick(state: GameState, dt: number, hooks: GameHooks): void
}

export function step(s: GameState, dt: number, input: MoveInput, hooks: GameHooks, registry?: ContentRegistry, bosses?: BossStepAdapter, factions?: FactionBridge): void {
  const hero = s.hero
  if (!hero || s.mode !== 'play') return
  const wasDashing = hero.dash > 0
  tickTimers(s, hero, dt)
  tickHall(s, dt, wasDashing && hero.dash <= 0)
  registry?.tick(s, dt, hooks)
  const nextScene = sceneIndexAt(s.time)
  if (nextScene !== s.currentScene) setScene(s, nextScene, true, hooks)
  tickSpawning(s, dt, hooks, bosses?.spawn, factions?.runtime.enemies.length ?? 0, factions)
  moveHero(s, input, dt, factions?.movementMultiplier ?? 1)
  const free = resolveObstacleCollision(s.currentScene, hero.x, hero.y, 17)
  hero.x = free.x; hero.y = free.y
  if (hero.attack <= 0) {
    attack(s, hooks, factions)
    hero.attack = hero.delay * hallAttackDelay(s)
  }
  tickEnemies(s, dt, hooks)
  bosses?.tick(s, dt, hooks)
  for (const e of s.mobs) {
    if (e.hp <= 0) continue
    const safe = resolveObstacleCollision(s.currentScene, e.x, e.y, e.r * 0.65)
    e.x = safe.x; e.y = safe.y
  }
  tickEnemyProjectiles(s, dt, hooks)
  factions?.tick(s, dt, hooks)
  if (hero.hp <= 0 || s.mode !== 'play') return
  tickSkills(s, dt, hooks, factions)
  moveShots(s, hero, dt, hooks, factions)
  flushKillMilestone(s, hooks)
  collectStars(s, hero, dt, hooks)
  tickWorld(s, dt, hooks)
  sampleCombat(s, factions?.runtime.enemies)
  if (hero.hp <= 0 || s.mode !== 'play') return
  if (hero.skills.heal) hero.hp = Math.min(hero.max, hero.hp + hero.skills.heal * BALANCE.skills.passive.regenPerRank * dt)
  ageEffects(s, hero, dt)
  s.cam.x += (hero.x - s.cam.x) * minmax(dt * 9, 0, 1)
  s.cam.y += (hero.y - s.cam.y) * minmax(dt * 9, 0, 1)
  s.sceneFxClock += dt
  if (s.mode === 'play' && hasWonRun(s.runMode, { seconds: s.time, bossSpawned: s.bossSpawned, bossDefeated: s.bossDefeated })
    && victoryConditionMet(s, 'boss')) hooks.end(true)
}
