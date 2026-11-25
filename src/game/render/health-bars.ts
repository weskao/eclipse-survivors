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
  boss: ['#a94463', '#be4258', '#d35048', '#eb674d'],
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

/** Static mirrored forged-metal caps, only for the boss. No per-frame gradients or images. */
function drawBossEnd(ctx: Ctx2D, x: number, y: number, direction: -1 | 1): void {
  ctx.beginPath()
  ctx.moveTo(x + direction * 8, y)
  ctx.lineTo(x, y - 8)
  ctx.lineTo(x, y - 4)
  ctx.lineTo(x, y + 4)
  ctx.lineTo(x, y + 8)
  ctx.closePath()
  ctx.fillStyle = '#2b242c'; ctx.fill()
  ctx.strokeStyle = '#bd9775'; ctx.lineWidth = 1; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + direction * 6, y)
  ctx.lineTo(x + direction * 3, y - 4)
  ctx.lineTo(x + direction, y)
  ctx.lineTo(x + direction * 3, y + 4)
  ctx.closePath()
  ctx.fillStyle = '#96374e'; ctx.fill()
  ctx.strokeStyle = '#d1a38b'; ctx.stroke()
}

/** One painter for all ranks. Small preselected color bands mimic metal and enamel
 * without allocating gradients, textures or animation objects for each enemy.
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
  // The recessed dark track and narrow bevels are static, independent of HP.
  ctx.fillStyle = boss ? '#170e19' : elite ? '#171322' : '#101720'
  ctx.fillRect(left, top, width, height)
  ctx.fillStyle = boss ? '#98765e' : elite ? '#74648e' : '#635b4e'
  ctx.fillRect(left, top, width, 1)
  ctx.fillStyle = '#07090d'; ctx.fillRect(left, top + height - 1, width, 1)
  if (boss || elite) {
    ctx.strokeStyle = boss ? '#98765e' : '#d6a4f3'
    ctx.lineWidth = 1
    ctx.strokeRect(left, top, width, height)
    ctx.fillStyle = boss ? '#423039' : '#332941'
    ctx.fillRect(left + 1, top + 1, width - 2, 1)
    ctx.fillRect(left + 1, top + height - 2, width - 2, 1)
  }
  if (motion.trail > motion.front + .002) {
    ctx.fillStyle = '#f2c37e'; ctx.fillRect(fillLeft, fillTop, trail, innerHeight)
  }
  if (front > 0) {
    ctx.fillStyle = healthBarColor(motion.target, rank)
    ctx.fillRect(fillLeft, fillTop, front, innerHeight)
    // Enamel/gemstone ridge and dark lower bevel. Never extend past the fill.
    ctx.fillStyle = '#ffffff26'
    ctx.fillRect(fillLeft, fillTop, front, Math.max(1, Math.floor(innerHeight * .35)))
    ctx.fillStyle = '#00000055'
    ctx.fillRect(fillLeft, fillTop + innerHeight - 1, front, 1)
    if ((boss || elite) && motion.trail > motion.front + .002 && front >= 2) {
      // Local moving edge (no flash or pulse). Reduced motion has no trail/edge.
      ctx.fillStyle = '#fff3cf'; ctx.fillRect(fillLeft + front - 2, fillTop, 2, innerHeight)
    }
  }
  if (boss) {
    drawBossEnd(ctx, left, top + height / 2, -1)
    drawBossEnd(ctx, left + width, top + height / 2, 1)
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
