import type { Ctx2D } from './ctx'

export interface HealthBarTarget { hp: number; max: number }

export interface HealthBarMotion {
  front: number
  trail: number
  target: number
  at: number
  holdUntil: number
}

export interface HealthBarFrame { readonly front: number; readonly trail: number; readonly target: number }

export type HealthBarRank = 'ordinary' | 'elite' | 'boss'
const HEALTH_PALETTES = {
  ordinary: ['#78d8a0', '#eac95f', '#ed9851', '#e66b73'],
  elite: ['#b697fa', '#d78ee9', '#e97ba1', '#ef526f'],
  boss: ['#efc46c', '#eaa34f', '#e46a48', '#d93859'],
} as const

/** Remaining HP fraction, not raw HP; rank changes the palette, never the thresholds. */
export function healthBarColor(fraction: number, rank: HealthBarRank = 'ordinary'): string {
  return HEALTH_PALETTES[rank][fraction >= .75 ? 0 : fraction >= .5 ? 1 : fraction >= .25 ? 2 : 3]
}

const ratio = (mob: HealthBarTarget): number => mob.max > 0 && Number.isFinite(mob.hp) && Number.isFinite(mob.max)
  ? Math.max(0, Math.min(1, mob.hp / mob.max)) : 0

/** A WeakMap lives with the renderer: dead mobs never retain history and simulation HP is untouched. */
export function sampleHealthBar(
  mob: HealthBarTarget, time: number, cache?: WeakMap<HealthBarTarget, HealthBarMotion>, reduceMotion = false,
): HealthBarFrame {
  const target = ratio(mob)
  if (!cache) return { front: target, trail: target, target }
  const old = cache.get(mob)
  if (!old || reduceMotion || !Number.isFinite(time) || !Number.isFinite(old.at) || time < old.at) {
    const current: HealthBarMotion = { front: target, trail: target, target, at: time, holdUntil: time }
    cache.set(mob, current)
    return current
  }
  // Most visible mobs are full or unchanged. Skip exponential easing entirely once settled.
  if (target === old.target && old.front === target && old.trail === target) {
    old.at = time
    return old
  }
  const dt = Math.max(0, Math.min(0.1, time - old.at))
  const healing = target > old.target
  if (healing) {
    // Even a partial heal below the eased front must not leave a false damage trail.
    old.trail = Math.min(old.front, target)
    old.holdUntil = time
  } else if (target < old.target && old.trail <= old.front + .002) {
    old.trail = old.front
    old.holdUntil = time + .08
  }
  const hasDamageTrail = !healing && (target < old.target || old.trail > old.front + .002)
  const trailDt = Math.max(0, Math.min(dt, time - Math.max(old.at, old.holdUntil)))
  old.at = time
  old.target = target
  if (dt > 0) {
    old.front += (target - old.front) * (1 - Math.exp(-dt * (target < old.front ? 18 : 10)))
    if (trailDt > 0) old.trail += (target - old.trail) * (1 - Math.exp(-trailDt * 5))
  }
  if (!hasDamageTrail || target >= old.front || old.trail < old.front) old.trail = old.front
  if (Math.abs(target - old.front) < 0.002) old.front = target
  if (Math.abs(target - old.trail) < 0.002) old.trail = target
  return old
}

/** Keep healing visible until the existing fill and trail finish settling. */
export function shouldShowHealthBar(motion: HealthBarFrame, showFull = false): boolean {
  return showFull || motion.target < 1 || motion.front < 1 || motion.trail < 1
}

/** One painter for ordinary, elite and boss bars. Only special ranks add bevel/caps.
 * Flat rectangles avoid per-actor gradients, extra textures and Canvas state allocations.
 */
function drawHealthBar(
  ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, width: number, rank: HealthBarRank,
): void {
  const boss = rank === 'boss', elite = rank === 'elite'
  const height = boss ? 14 : elite ? 9 : 6
  const inset = boss || elite ? 2 : 1
  const inner = width - inset * 2, innerHeight = height - inset * 2
  const left = x - width / 2, fillLeft = left + inset, fillTop = top + inset
  const front = inner * motion.front, trail = inner * motion.trail
  ctx.fillStyle = '#020608e6'; ctx.fillRect(left, top, width, height)
  if (boss || elite) {
    ctx.strokeStyle = boss ? '#e9c078' : '#d6a4f3'
    ctx.lineWidth = 1
    ctx.strokeRect(left, top, width, height)
  }
  if (motion.trail > motion.front + .002) {
    ctx.fillStyle = '#f2c37e'; ctx.fillRect(fillLeft, fillTop, trail, innerHeight)
  }
  ctx.fillStyle = healthBarColor(motion.target, rank)
  ctx.fillRect(fillLeft, fillTop, front, innerHeight)
  ctx.fillStyle = '#fff1de88'; ctx.fillRect(fillLeft, fillTop, front, 1)
  if (boss || elite) {
    ctx.fillStyle = '#00000044'; ctx.fillRect(fillLeft, fillTop + innerHeight - 1, front, 1)
    if (motion.trail > motion.front + .002 && front >= 2) {
      // Local moving edge (no flash or pulse). Reduced motion has no trail/edge.
      ctx.fillStyle = '#fff3cf'; ctx.fillRect(fillLeft + front - 2, fillTop, 2, innerHeight)
    }
  }
}

export function drawEnemyHealthBar(
  ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, spriteWidth: number, elite = false,
): void {
  const width = Math.max(34, spriteWidth * .58) + (elite ? 8 : 0)
  drawHealthBar(ctx, motion, x, top - (elite ? 3 : 0), width, elite ? 'elite' : 'ordinary')
}

export function drawBossHealthBar(ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number): void {
  drawHealthBar(ctx, motion, x, top - 2, 190, 'boss')
}
