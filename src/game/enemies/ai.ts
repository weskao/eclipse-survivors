import { damageHero } from '../combat'
import { dist } from '../math'
import { summonBossMinions, updateBossPhase } from '../bosses/phases'
import type { EnemyBrain, EnemyProjectile, GameHooks, GameState, Hero, Mob } from '../types'

const NEAR = { slime: 70, bat: 205, goblin: 122, golem: 150, warlock: 310, boss: 265 } as const
const WINDUP = { pounce: 0.48, dive: 0.55, jab: 0.4, slam: 1.05, bolt: 0.72, summon: 0.8 } as const

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
  ai.state = 'windup'
  ai.timer = WINDUP[kind] + (e.type === 'boss' ? 0.25 : 0)
}

function recover(e: Mob, seconds: number): void {
  const ai = brain(e)
  ai.state = 'recover'
  ai.timer = seconds
}

function projectile(s: GameState, e: Mob, direction: number, speed: number): void {
  if (s.enemyShots.length >= 100) return
  const ai = brain(e)
  const base = Math.atan2(ai.dirY, ai.dirX) + direction
  const b: EnemyProjectile = {
    x: e.x, y: e.y - 8, vx: Math.cos(base) * speed, vy: Math.sin(base) * speed,
    radius: e.type === 'boss' ? 12 : 8, damage: e.dmg, life: 3.2,
  }
  s.enemyShots.push(b)
}

function fire(s: GameState, e: Mob): void {
  const elite = !!e.elite
  const phase = e.bossPhase ?? 1
  const count = e.type === 'boss' ? (phase === 3 ? 5 : 3) : (elite ? 3 : 1)
  const spacing = e.type === 'boss' ? 0.18 : 0.14
  for (let i = 0; i < count; i++) {
    projectile(s, e, (i - (count - 1) / 2) * spacing, e.type === 'boss' ? 185 : 205)
  }
}

function resolveStrike(s: GameState, e: Mob, hooks: GameHooks): void {
  if (e.hp <= 0 || !s.hero) return
  const ai = brain(e), hero = s.hero
  if (ai.attack === 'bolt') fire(s, e)
  else if (ai.attack === 'summon') summonBossMinions(s, e)
  else if (ai.attack === 'slam') {
    const radius = e.type === 'boss' ? 103 : e.elite ? 87 : 74
    if (dist(hero.x - ai.aimX, hero.y - ai.aimY) <= radius + 14) damageHero(s, e.dmg, hooks)
  } else if (ai.attack === 'pounce' || ai.attack === 'jab') {
    const maxDistance = ai.attack === 'pounce' ? 63 : 69
    const length = Math.min(maxDistance, dist(ai.aimX - e.x, ai.aimY - e.y))
    e.x += ai.dirX * length
    e.y += ai.dirY * length
    if (dist(hero.x - e.x, hero.y - e.y) < e.r + 19) damageHero(s, e.dmg, hooks)
  }
  recover(e, e.type === 'boss' ? 1.15 : e.type === 'golem' ? 1 : 0.65)
}

function moveApproach(e: Mob, hero: Hero, dt: number): void {
  const dx = hero.x - e.x, dy = hero.y - e.y, d = Math.max(1, dist(dx, dy))
  const k = (e.stagger > 0 ? 0.23 : 1) * (e.slow > 0 ? 0.46 : 1)
  const ai = brain(e)
  let toward = 1, side = 0
  if (e.type === 'slime') toward = 0.85 + Math.max(0, Math.sin(e.phase * 1.1)) * 0.65
  if (e.type === 'goblin') side = ai.cycle % 2 ? -0.7 : 0.7
  if (e.type === 'warlock' && d < 125) toward = -0.7
  const length = e.speed * k * dt
  e.x += ((dx / d) * toward - (dy / d) * side) * length + e.kx * (e.stagger > 0 ? (e.type === 'boss' ? 45 : 150) * dt : 0)
  e.y += ((dy / d) * toward + (dx / d) * side) * length + e.ky * (e.stagger > 0 ? (e.type === 'boss' ? 45 : 150) * dt : 0)
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
    if (e.telegraphUntil !== undefined && s.time < e.telegraphUntil) continue
    e.hit -= dt
    e.phase += dt * 5
    e.stagger = Math.max(0, e.stagger - dt)
    e.slow = Math.max(0, e.slow - dt)
    if (e.type === 'boss') updateBossPhase(s, e, hooks)
    const ai = brain(e)
    if (ai.state === 'recover') {
      ai.timer -= dt
      if (ai.timer <= 0) ai.state = 'approach'
      continue
    }
    if (!canTarget) {
      // Continue status/phase/recovery simulation, but cancel locked-on attacks during stealth.
      if (ai.state !== 'approach') {
        ai.state = 'recover'
        ai.timer = Math.max(0.2, ai.timer)
        ai.hitThisAttack = false
      }
      continue
    }
    if (ai.state === 'windup') {
      ai.timer -= dt
      if (ai.timer <= 0) {
        if (ai.attack === 'dive' || ai.attack === 'pounce') {
          ai.state = 'attack'; ai.timer = ai.attack === 'dive' ? 0.38 : 0.26
        }
        else resolveStrike(s, e, hooks)
      }
      continue
    }
    if (ai.state === 'attack') {
      const speed = ai.attack === 'pounce' ? 180 : 295
      const distance = Math.min(speed * dt * (e.slow > 0 ? 0.46 : 1),
        ai.attack === 'pounce' ? dist(ai.aimX - e.x, ai.aimY - e.y) : Infinity)
      const oldX = e.x, oldY = e.y
      e.x += ai.dirX * distance
      e.y += ai.dirY * distance
      const vx = e.x - oldX, vy = e.y - oldY
      const t = Math.max(0, Math.min(1, ((hero.x - oldX) * vx + (hero.y - oldY) * vy) / Math.max(0.0001, vx * vx + vy * vy)))
      if (!ai.hitThisAttack && dist(hero.x - (oldX + vx * t), hero.y - (oldY + vy * t)) < e.r + 17) {
        damageHero(s, e.dmg, hooks)
        ai.hitThisAttack = true
      }
      ai.timer -= dt
      if (ai.timer <= 0) { ai.hitThisAttack = false; recover(e, 0.7) }
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
    if (p.life > 0 && hero.hp > 0 && dist(hero.x - (x + dx * t), hero.y - (y + dy * t)) < p.radius + 15) {
      damageHero(s, p.damage, hooks)
      p.life = 0
    }
  }
  s.enemyShots = s.enemyShots.filter(p => p.life > 0)
}
