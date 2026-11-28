import type { Ctx2D } from './ctx'
import { LOW_HP_PCT } from '../constants'
import { classifyHealthImpact, healthCriticalVersion, type HealthImpact } from '../health-impact'

export interface HealthBarTarget { hp: number; max: number }

export interface HealthBarMotion {
  front: number
  trail: number
  target: number
  at: number
  holdUntil: number
  criticalVersion?: number
  impact?: HealthImpact
  impactUntil?: number
}

export interface HealthBarFrame { readonly front: number; readonly trail: number; readonly target: number; readonly impact?: HealthImpact }

export type HealthBarRank = 'ordinary' | 'elite' | 'boss' | 'hero'
const HEALTH_PALETTES = {
  ordinary: ['#78d8a0', '#eac95f', '#ed9851', '#e66b73'],
  elite: ['#b697fa', '#d78ee9', '#e97ba1', '#ef526f'],
  boss: ['#a94463', '#be4258', '#d35048', '#eb674d'],
} as const

/** Remaining HP fraction, not raw HP; rank changes the palette, never the thresholds. */
export function healthBarColor(fraction: number, rank: HealthBarRank = 'ordinary'): string {
  if (rank === 'hero') return fraction * 100 <= LOW_HP_PCT ? '#ff4250' : '#d65854'
  return HEALTH_PALETTES[rank][fraction >= .75 ? 0 : fraction >= .5 ? 1 : fraction >= .25 ? 2 : 3]
}

const ratio = (mob: HealthBarTarget): number => mob.max > 0 && Number.isFinite(mob.hp) && Number.isFinite(mob.max)
  ? Math.max(0, Math.min(1, mob.hp / mob.max)) : 0

/** A WeakMap lives with the renderer: dead mobs never retain history and simulation HP is untouched. */
export function sampleHealthBar(
  mob: HealthBarTarget, time: number, cache?: WeakMap<HealthBarTarget, HealthBarMotion>, reduceMotion = false,
  criticalVersion = healthCriticalVersion(mob),
): HealthBarFrame {
  const target = ratio(mob)
  if (!cache) return { front: target, trail: target, target }
  const old = cache.get(mob)
  if (!old || reduceMotion || !Number.isFinite(time) || !Number.isFinite(old.at) || time < old.at) {
    const current: HealthBarMotion = { front: target, trail: target, target, at: time, holdUntil: time, criticalVersion }
    cache.set(mob, current)
    return current
  }
  const realCrit = criticalVersion !== (old.criticalVersion ?? 0)
  old.criticalVersion = criticalVersion
  if (time >= (old.impactUntil ?? 0)) old.impact = undefined
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
    old.impact = undefined
    old.impactUntil = time
  } else if (target < old.target) {
    const severity = classifyHealthImpact(old.target - target, realCrit)
    if (old.trail <= old.front + .002) {
      old.trail = old.front
      old.holdUntil = time + (severity === 'critical' ? .16 : severity === 'heavy' ? .14 : .08)
    }
    if (severity) {
      if (old.impact !== 'critical' || severity === 'critical') old.impact = severity
      old.impactUntil = time + .24
    }
  }
  const hasDamageTrail = !healing && (target < old.target || old.at < old.holdUntil || old.trail > old.front + .002)
  const trailDt = Math.max(0, Math.min(dt, time - Math.max(old.at, old.holdUntil)))
  old.at = time
  old.target = target
  if (dt > 0) {
    old.front += (target - old.front) * (1 - Math.exp(-dt * (target < old.front ? old.impact === 'critical' ? 26 : old.impact === 'heavy' ? 21 : 18 : 10)))
    if (trailDt > 0) old.trail += (target - old.trail) * (1 - Math.exp(-trailDt * (old.impact ? 4 : 5)))
  }
  if (!hasDamageTrail || target >= old.front || old.trail < old.front) old.trail = old.front
  if (Math.abs(target - old.front) < 0.002) old.front = target
  if (Math.abs(target - old.trail) < 0.002) old.trail = target
  if (old.front === target && old.trail === target) old.impact = undefined
  return old
}

/** Keep healing visible until the existing fill and trail finish settling. */
export function shouldShowHealthBar(motion: HealthBarFrame, showFull = false): boolean {
  return showFull || motion.target < 1 || motion.front < 1 || motion.trail < 1
}

/** Static mirrored blackened-bronze wings and faceted blood crystals.
 * All points stay outside the HP fill; no shadow blur, gradients or animated particles.
 */
function drawBossEnd(ctx: Ctx2D, x: number, y: number, direction: -1 | 1): void {
  ctx.beginPath()
  ctx.moveTo(x + direction * 14, y)
  ctx.lineTo(x + direction * 7, y - 5)
  ctx.lineTo(x + direction * 3, y - 9)
  ctx.lineTo(x, y - 8)
  ctx.lineTo(x, y + 8)
  ctx.lineTo(x + direction * 3, y + 9)
  ctx.lineTo(x + direction * 7, y + 5)
  ctx.closePath()
  ctx.fillStyle = '#241923'; ctx.fill()
  ctx.strokeStyle = '#d6ac7c'; ctx.lineWidth = 1; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + direction * 10, y)
  ctx.lineTo(x + direction * 4, y - 5)
  ctx.lineTo(x + direction, y)
  ctx.lineTo(x + direction * 4, y + 5)
  ctx.closePath()
  ctx.fillStyle = '#b14260'; ctx.fill()
  ctx.strokeStyle = '#f1c4a0'; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + direction, y)
  ctx.lineTo(x + direction * 4, y - 5)
  ctx.lineTo(x + direction * 4, y)
  ctx.closePath()
  ctx.fillStyle = '#f594a0'; ctx.fill()
}

/** Small crown-shaped sigil above the track, not a phase/HP indicator. */
function drawBossCrest(ctx: Ctx2D, x: number, top: number): void {
  ctx.beginPath()
  ctx.moveTo(x, top - 14)
  ctx.lineTo(x + 5, top - 7)
  ctx.lineTo(x + 13, top - 11)
  ctx.lineTo(x + 10, top - 1)
  ctx.lineTo(x - 10, top - 1)
  ctx.lineTo(x - 13, top - 11)
  ctx.lineTo(x - 5, top - 7)
  ctx.closePath()
  ctx.fillStyle = '#2e2029'; ctx.fill()
  ctx.strokeStyle = '#e5bd86'; ctx.lineWidth = 1; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, top - 10)
  ctx.lineTo(x + 4, top - 6)
  ctx.lineTo(x, top - 2)
  ctx.lineTo(x - 4, top - 6)
  ctx.closePath()
  ctx.fillStyle = '#d35c73'; ctx.fill()
  ctx.strokeStyle = '#f4c6ad'; ctx.stroke()
}

/** One painter for all ranks. Small preselected color bands mimic metal and enamel
 * without allocating gradients, textures or animation objects for each enemy.
 */
function drawHealthBar(
  ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, width: number, rank: HealthBarRank, reduceFlashing = false,
): void {
  const boss = rank === 'boss', elite = rank === 'elite', hero = rank === 'hero'
  const height = boss ? 18 : elite ? 9 : 6
  const inset = hero ? 0 : boss || elite ? 2 : 1
  const inner = width - inset * 2, innerHeight = height - inset * 2
  const left = x - width / 2, fillLeft = left + inset, fillTop = top + inset
  const front = inner * motion.front, trail = inner * motion.trail
  if (boss) {
    // Outer metal shoulders and opaque backing retain contrast on bright battle effects.
    ctx.fillStyle = '#08070de8'; ctx.fillRect(left - 2, top - 2, width + 4, height + 4)
    ctx.fillStyle = '#b28b62'; ctx.fillRect(left, top - 1, width, 1)
    ctx.fillStyle = '#4c3235'; ctx.fillRect(left, top + height, width, 1)
  }
  // The recessed dark track and narrow bevels are static, independent of HP.
  ctx.fillStyle = hero ? '#070c11d9' : boss ? '#170e19' : elite ? '#171322' : '#101720'
  ctx.fillRect(left, top, width, height)
  if (!hero) {
    ctx.fillStyle = boss ? '#98765e' : elite ? '#74648e' : '#635b4e'
    ctx.fillRect(left, top, width, 1)
    ctx.fillStyle = '#07090d'; ctx.fillRect(left, top + height - 1, width, 1)
  }
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
    if (boss) {
      ctx.fillStyle = '#ffba9c'; ctx.fillRect(fillLeft, fillTop, front, 1)
      ctx.fillStyle = '#ffcfbf26'; ctx.fillRect(fillLeft, fillTop + 2, front, 3)
      ctx.fillStyle = '#310b2466'; ctx.fillRect(fillLeft, fillTop + innerHeight - 4, front, 3)
      if (motion.trail > motion.front + .002 && front >= 5) {
        ctx.fillStyle = '#ffd89a'; ctx.fillRect(fillLeft + front - 5, fillTop + 2, 5, innerHeight - 4)
      }
    }
    if ((boss || elite || hero) && motion.trail > motion.front + .002 && front >= 2) {
      // Local moving edge (no flash or pulse). Reduced motion has no trail/edge.
      ctx.fillStyle = '#fff3cf'; ctx.fillRect(fillLeft + front - 2, fillTop, 2, innerHeight)
    }
  }
  if (hero && motion.target * 100 <= LOW_HP_PCT) {
    ctx.strokeStyle = '#ffe3d3'; ctx.lineWidth = 1
    ctx.strokeRect(left, top, width, height)
  }
  // Local accent bounded by the meter, never a screen flash or particle loop.
  if (motion.impact && !reduceFlashing && trail > front + inner * .002) {
    const edge = Math.min(front, motion.impact === 'critical' ? 5 : 3)
    ctx.fillStyle = motion.impact === 'critical' ? '#ffdc92' : '#ffc27f'
    if (edge > 0) ctx.fillRect(fillLeft + front - edge, fillTop, edge, innerHeight)
    const rail = Math.min(inner, trail) - front
    if (rail > 0) {
      ctx.fillRect(fillLeft + front, top, rail, 1)
      ctx.fillRect(fillLeft + front, top + height - 1, rail, 1)
    }
  }
  if (boss) {
    drawBossEnd(ctx, left, top + height / 2, -1)
    drawBossEnd(ctx, left + width, top + height / 2, 1)
    drawBossCrest(ctx, x, top)
  }
}

export function drawEnemyHealthBar(
  ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, spriteWidth: number, elite = false, reduceFlashing = false,
): void {
  const width = Math.max(34, spriteWidth * .58) + (elite ? 8 : 0)
  drawHealthBar(ctx, motion, x, top - (elite ? 3 : 0), width, elite ? 'elite' : 'ordinary', reduceFlashing)
}

export function drawBossHealthBar(ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, reduceFlashing = false): void {
  // Extend upward, not toward the boss sprite. Keep the old track bottom edge.
  ctx.save()
  drawHealthBar(ctx, motion, x, top - 6, 206, 'boss', reduceFlashing)
  ctx.restore()
}

export function drawHeroHealthBar(ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, width: number, reduceFlashing = false): void {
  ctx.save()
  drawHealthBar(ctx, motion, x, top, width, 'hero', reduceFlashing)
  ctx.restore()
}
