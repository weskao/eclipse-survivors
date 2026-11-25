import type { Ctx2D } from './ctx'

export interface HealthBarTarget { hp: number; max: number }

export interface HealthBarMotion {
  front: number
  trail: number
  target: number
  at: number
}

export interface HealthBarFrame { readonly front: number; readonly trail: number; readonly target: number }

/** Use remaining HP fraction, never raw HP: elites and bosses can have larger maxima. */
export function healthBarColor(fraction: number): string {
  return fraction >= .75 ? '#78d8a0' : fraction >= .5 ? '#eac95f'
    : fraction >= .25 ? '#ed9851' : '#e66b73'
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
  if (!old || reduceMotion || !Number.isFinite(time) || time < old.at) {
    const current: HealthBarMotion = { front: target, trail: target, target, at: time }
    cache.set(mob, current)
    return current
  }
  // Most visible mobs are full or unchanged. Skip exponential easing entirely once settled.
  if (target === old.target && old.front === target && old.trail === target) {
    old.at = time
    return old
  }
  const dt = Math.max(0, Math.min(0.1, time - old.at))
  old.at = time
  if (target > old.target) old.trail = old.front // Healing never leaves a false damage trail.
  old.target = target
  if (dt > 0) {
    old.front += (target - old.front) * (1 - Math.exp(-dt * 13))
    old.trail += (target - old.trail) * (1 - Math.exp(-dt * 3.8))
  }
  if (target >= old.front) old.trail = old.front
  if (Math.abs(target - old.front) < 0.002) old.front = target
  if (Math.abs(target - old.trail) < 0.002) old.trail = target
  return old
}

/** Shared overhead UI for all non-boss enemies, regardless of their simulation pool. */
export function drawEnemyHealthBar(
  ctx: Ctx2D, motion: HealthBarFrame, x: number, top: number, spriteWidth: number, elite = false,
): void {
  const bar = Math.max(34, spriteWidth * 0.58), left = x - bar / 2
  ctx.fillStyle = '#020608e6'; ctx.fillRect(left, top, bar, 6)
  if (motion.trail > motion.front + 0.002) {
    ctx.fillStyle = '#f2c37e'; ctx.fillRect(left + 1, top + 1, (bar - 2) * motion.trail, 4)
  }
  // Keep elite identity separate from the authoritative HP color.
  if (elite) { ctx.strokeStyle = '#d6a4f3'; ctx.lineWidth = 1; ctx.strokeRect(left, top, bar, 6) }
  ctx.fillStyle = healthBarColor(motion.target)
  ctx.fillRect(left + 1, top + 1, (bar - 2) * motion.front, 4)
  ctx.fillStyle = '#fff1de88'; ctx.fillRect(left + 1, top + 1, (bar - 2) * motion.front, 1)
}
