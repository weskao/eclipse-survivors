import { BALANCE } from '../config'
import { damageHero } from '../combat'
import { dist } from '../math'
import { summonBossMinions, updateBossPhase } from '../bosses/phases'
import type { EnemyBrain, EnemyProjectile, GameHooks, GameState, Hero, Mob } from '../types'

const AI = BALANCE.enemies.ai
const NEAR = AI.near
const WINDUP = AI.windup

function brain(e: Mob): EnemyBrain {
  return e.ai ?? (e.ai = {
    state: 'approach', timer: 0, attack: 'pounce', aimX: e.x, aimY: e.y,
    dirX: 0, dirY: 0, cycle: 0,
  })
}

function warn(e: Mob, hero: Hero, kind: EnemyBrain['attack']): void {
  const ai = brain(e)
  const length = Math.max(1, dist(hero.x - e.x, hero.y - e.y))
  ai.dirX = (hero.x - e.x) / length
  ai.dirY = (hero.y - e.y) / length
  ai.aimX = hero.x
  ai.aimY = hero.y
  ai.attack = kind
  ai.releaseFx = 0
  ai.state = 'windup'
  ai.timer = WINDUP[kind] + (e.type === 'boss' ? AI.bossWindupExtra : 0)
}

function recover(e: Mob, seconds: number): void {
  const ai = brain(e)
  ai.state = 'recover'
  ai.timer = seconds
}

function projectile(s: GameState, e: Mob, direction: number, speed: number): void {
  if (s.enemyShots.length >= AI.maxProjectiles) return
  const ai = brain(e)
  const base = Math.atan2(ai.dirY, ai.dirX) + direction
  const b: EnemyProjectile = {
    x: e.x, y: e.y - 8, vx: Math.cos(base) * speed, vy: Math.sin(base) * speed,
    radius: e.type === 'boss' ? AI.projectileRadius.boss : AI.projectileRadius.default, damage: e.dmg, life: AI.projectileLifetime,
  }
  s.enemyShots.push(b)
}

function fire(s: GameState, e: Mob): void {
  const elite = !!e.elite
  const phase = e.bossPhase ?? 1
  const count = e.type === 'boss' ? (phase === 3 ? AI.projectileCount.bossThirdPhase : AI.projectileCount.bossOther) : (elite ? AI.projectileCount.elite : AI.projectileCount.default)
  const spacing = e.type === 'boss' ? AI.projectileSpread.boss : AI.projectileSpread.default
  for (let i = 0; i < count; i++) {
    projectile(s, e, (i - (count - 1) / 2) * spacing, e.type === 'boss' ? AI.projectileSpeed.boss : AI.projectileSpeed.default)
  }
}

function resolveStrike(s: GameState, e: Mob, hooks: GameHooks): void {
  if (e.hp <= 0 || !s.hero) return
  const ai = brain(e), hero = s.hero
  ai.releaseFx = 0.32
  if (ai.attack === 'bolt') fire(s, e)
  else if (ai.attack === 'summon') summonBossMinions(s, e, hooks.otherLivingActors?.() ?? 0)
  else if (ai.attack === 'slam') {
    const radius = e.type === 'boss' ? AI.slamRadius.boss : e.elite ? AI.slamRadius.elite : AI.slamRadius.default
    if (dist(hero.x - ai.aimX, hero.y - ai.aimY) <= radius + AI.slamContactMargin) damageHero(s, e.dmg, hooks, e)
  } else if (ai.attack === 'pounce' || ai.attack === 'jab') {
    const maxDistance = ai.attack === 'pounce' ? AI.lungeDistance.pounce : AI.lungeDistance.jab
    const length = Math.min(maxDistance, dist(ai.aimX - e.x, ai.aimY - e.y))
    e.x += ai.dirX * length
    e.y += ai.dirY * length
    if (dist(hero.x - e.x, hero.y - e.y) < e.r + AI.lungeContactMargin) damageHero(s, e.dmg, hooks, e)
  }
  recover(e, e.type === 'boss' ? AI.recoverySeconds.boss : e.type === 'golem' ? AI.recoverySeconds.golem : AI.recoverySeconds.default)
}

function moveApproach(e: Mob, hero: Hero, dt: number): void {
  const dx = hero.x - e.x, dy = hero.y - e.y, d = Math.max(1, dist(dx, dy))
  const k = (e.stagger > 0 ? AI.staggeredSpeedMultiplier : 1) * (e.slow > 0 ? AI.slowedSpeedMultiplier : 1)
  const ai = brain(e)
  let toward = 1, side = 0
  if (e.type === 'slime') toward = 0.85 + Math.max(0, Math.sin(e.phase * 1.1)) * 0.65
  if (e.type === 'goblin') side = ai.cycle % 2 ? -0.7 : 0.7
  if (e.type === 'warlock' && d < 125) toward = -0.7
  const length = e.speed * k * dt
  e.x += ((dx / d) * toward - (dy / d) * side) * length + e.kx * (e.stagger > 0 ? (e.type === 'boss' ? AI.knockbackSpeed.boss : AI.knockbackSpeed.default) * dt : 0)
  e.y += ((dy / d) * toward + (dx / d) * side) * length + e.ky * (e.stagger > 0 ? (e.type === 'boss' ? AI.knockbackSpeed.boss : AI.knockbackSpeed.default) * dt : 0)
}

function chooseAttack(e: Mob): EnemyBrain['attack'] {
  if (e.type === 'slime') return 'pounce'
  if (e.type === 'bat') return 'dive'
  if (e.type === 'goblin') return 'jab'
  if (e.type === 'golem') return 'slam'
  if (e.type === 'warlock') return 'bolt'
  const ai = brain(e), phase = e.bossPhase ?? 1
  if (phase === 1) return 'bolt'
  if (phase === 2) return ai.cycle % 3 === 2 ? 'summon' : 'slam'
  return ai.cycle % 3 === 2 ? 'summon' : ai.cycle % 2 ? 'bolt' : 'slam'
}

/** Deterministic finite state machines; positions and timings are in world units, not screen pixels. */
export function tickEnemies(s: GameState, dt: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero || s.mode !== 'play') return
  const canTarget = hooks.canTargetHero?.() ?? true
  for (const e of s.mobs) {
    if (e.hp <= 0) continue
    e.hit -= dt
    e.phase += dt * 5
    if (e.visualPhase !== undefined) {
      const held = Math.min(dt, e.visualHold ?? 0)
      e.visualHold = Math.max(0, (e.visualHold ?? 0) - dt)
      e.visualPhase += (dt - held) * 5
    }
    e.stagger = Math.max(0, e.stagger - dt)
    e.slow = Math.max(0, e.slow - dt)
    if (e.type === 'boss') updateBossPhase(s, e, hooks)
    const ai = brain(e)
    if (ai.releaseFx) ai.releaseFx = Math.max(0, ai.releaseFx - dt)
    if (ai.state === 'recover') {
      ai.timer -= dt
      if (ai.timer <= 0) ai.state = 'approach'
      continue
    }
    if (!canTarget) {
      // Continue status/phase/recovery simulation, but cancel locked-on attacks during stealth.
      if (ai.state !== 'approach') {
        ai.state = 'recover'
        ai.timer = Math.max(AI.stealthRecoverMin, ai.timer)
        ai.hitThisAttack = false
      }
      continue
    }
    if (ai.state === 'windup') {
      ai.timer -= dt
      if (ai.timer <= 0) {
        if (ai.attack === 'dive' || ai.attack === 'pounce') {
          ai.state = 'attack'; ai.timer = ai.attack === 'dive' ? AI.attackDuration.dive : AI.attackDuration.pounce
          ai.releaseFx = 0.32
        }
        else resolveStrike(s, e, hooks)
      }
      continue
    }
    if (ai.state === 'attack') {
      const speed = ai.attack === 'pounce' ? AI.attackSpeed.pounce : AI.attackSpeed.dive
      const distance = Math.min(speed * dt * (e.slow > 0 ? AI.slowedSpeedMultiplier : 1),
        ai.attack === 'pounce' ? dist(ai.aimX - e.x, ai.aimY - e.y) : Infinity)
      const oldX = e.x, oldY = e.y
      e.x += ai.dirX * distance
      e.y += ai.dirY * distance
      const vx = e.x - oldX, vy = e.y - oldY
      const t = Math.max(0, Math.min(1, ((hero.x - oldX) * vx + (hero.y - oldY) * vy) / Math.max(0.0001, vx * vx + vy * vy)))
      if (!ai.hitThisAttack && dist(hero.x - (oldX + vx * t), hero.y - (oldY + vy * t)) < e.r + AI.hitMargin) {
        damageHero(s, e.dmg, hooks, e)
        ai.hitThisAttack = true
      }
      ai.timer -= dt
      if (ai.timer <= 0) { ai.hitThisAttack = false; recover(e, AI.recoverySeconds.afterDive) }
      continue
    }
    const dx = hero.x - e.x, dy = hero.y - e.y
    const range = NEAR[e.type]
    if (dx * dx + dy * dy <= range * range) {
      const attack = chooseAttack(e)
      ai.cycle++
      warn(e, hero, attack)
    } else moveApproach(e, hero, dt)
  }
}

export function tickEnemyProjectiles(s: GameState, dt: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero) return
  for (const p of s.enemyShots) {
    const x = p.x, y = p.y
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    const dx = p.x - x, dy = p.y - y
    const dot = dx * dx + dy * dy
    const t = Math.max(0, Math.min(1, ((hero.x - x) * dx + (hero.y - y) * dy) / Math.max(0.0001, dot)))
    if (p.life > 0 && hero.hp > 0 && dist(hero.x - (x + dx * t), hero.y - (y + dy * t)) < p.radius + AI.projectileContactMargin) {
      damageHero(s, p.damage, hooks)
      p.life = 0
    }
  }
  s.enemyShots = s.enemyShots.filter(p => p.life > 0)
}
