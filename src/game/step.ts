// One simulation tick: the original update(dt) minus toast timer and HUD refresh (the engine does those).
import { attack, hit, victoryConditionMet } from './combat'
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
  for (const b of s.shots) {
    b.prevX = b.x
    b.prevY = b.y
    const travel = Math.min(dt, Math.max(0, b.life))
    b.x += b.vx * travel
    b.y += b.vy * travel
    b.life -= dt
    if (travel <= 0) continue
    // The faction bridge computes first contact against both legacy and new
    // actors, preventing double hits and keeping existing XP ownership.
    if (factions && factions.resolveShot(s, b, hooks, { x: b.prevX!, y: b.prevY! })) continue
    const dx = b.x - b.prevX
    const dy = b.y - b.prevY
    const lengthSquared = dx * dx + dy * dy
    let closest: typeof s.mobs[number] | null = null
    let firstContact = Infinity
    for (const e of s.mobs) {
      if (e.hp <= 0) continue
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
      hit(s, closest, b.d, hooks)
      b.life = 0
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
  for (const star of s.stars) {
    star.t += dt
    const dx = hero.x - star.x
    const dy = hero.y - star.y
    const squared = dx * dx + dy * dy
    const reach = 115 + (hero.skills.magnet ?? 0) * 55
    if (squared < reach * reach) {
      // Only crystal attraction needs a true distance for normalization.
      const d = Math.max(1, Math.sqrt(squared))
      star.x += (dx / d) * Math.min(d, 450 * dt)
      star.y += (dy / d) * Math.min(d, 450 * dt)
    }
    if (squared < 23 * 23) {
      star.dead = true
      addXp(s, star.value, hooks)
      hooks.sfx('pickup')
      hooks.content?.(s, { type: 'pickup', kind: 'xp', amount: star.value })
    }
  }
  s.stars = s.stars.filter((star) => !star.dead).slice(-220)
}

function ageEffects(s: GameState, hero: Hero, dt: number): void {
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
    z.y -= 34 * dt
    z.life -= dt
  }
  s.numberFx = s.numberFx.filter((z) => z.life > 0)
  s.fx = s.fx.filter((f) => f.life > 0)
  for (const z of s.impactWaves) z.life -= dt
  s.impactWaves = s.impactWaves.filter((z) => z.life > 0)
  for (const z of s.lightningFx) z.life -= dt
  s.lightningFx = s.lightningFx.filter((z) => z.life > 0)
  for (const z of s.motionEchoes) z.life -= dt
  s.motionEchoes = s.motionEchoes.filter((z) => z.life > 0)
  for (const w of s.swipes) w.life -= dt
  s.swipes = s.swipes.filter((w) => w.life > 0)
}

export interface BossStepAdapter {
  spawn(state: GameState, hooks: GameHooks): void
  tick(state: GameState, dt: number, hooks: GameHooks): void
}

export function step(s: GameState, dt: number, input: MoveInput, hooks: GameHooks, registry?: ContentRegistry, bosses?: BossStepAdapter, factions?: FactionBridge): void {
  const hero = s.hero
  if (!hero || s.mode !== 'play') return
  tickTimers(s, hero, dt)
  registry?.tick(s, dt, hooks)
  const nextScene = sceneIndexAt(s.time)
  if (nextScene !== s.currentScene) setScene(s, nextScene, true, hooks)
  tickSpawning(s, dt, hooks, bosses?.spawn, factions?.runtime.enemies.length ?? 0)
  moveHero(s, input, dt, factions?.movementMultiplier ?? 1)
  const free = resolveObstacleCollision(s.currentScene, hero.x, hero.y, 17)
  hero.x = free.x; hero.y = free.y
  if (hero.attack <= 0) {
    attack(s, hooks)
    hero.attack = hero.delay
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
  tickSkills(s, dt, hooks)
  moveShots(s, hero, dt, hooks, factions)
  collectStars(s, hero, dt, hooks)
  tickWorld(s, dt, hooks)
  if (hero.hp <= 0 || s.mode !== 'play') return
  if (hero.skills.heal) hero.hp = Math.min(hero.max, hero.hp + hero.skills.heal * 0.9 * dt)
  ageEffects(s, hero, dt)
  s.cam.x += (hero.x - s.cam.x) * minmax(dt * 9, 0, 1)
  s.cam.y += (hero.y - s.cam.y) * minmax(dt * 9, 0, 1)
  s.sceneFxClock += dt
  if (s.mode === 'play' && hasWonRun(s.runMode, { seconds: s.time, bossSpawned: s.bossSpawned, bossDefeated: s.bossDefeated })
    && victoryConditionMet(s, 'boss')) hooks.end(true)
}
