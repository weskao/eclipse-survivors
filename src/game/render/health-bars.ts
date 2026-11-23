import type { Mob } from '../types'

export interface HealthBarMotion {
  front: number
  trail: number
  target: number
  at: number
}

export interface HealthBarFrame { readonly front: number; readonly trail: number }

const ratio = (mob: Mob): number => mob.max > 0 && Number.isFinite(mob.hp) && Number.isFinite(mob.max)
  ? Math.max(0, Math.min(1, mob.hp / mob.max)) : 0

/** A WeakMap lives with the renderer: dead mobs never retain history and simulation HP is untouched. */
export function sampleHealthBar(
  mob: Mob, time: number, cache: WeakMap<Mob, HealthBarMotion>, reduceMotion = false,
): HealthBarFrame {
  const target = ratio(mob)
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
