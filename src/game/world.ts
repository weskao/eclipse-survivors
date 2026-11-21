import { TAU } from './constants'
import { hash } from './math'
import type { Point } from './types'

export interface WorldObstacle extends Point { r: number; variant: number }
export interface WorldHazard extends Point { r: number; phase: number }
export type HazardPhase = 'idle' | 'warning' | 'active'

export const biomePalette = [
  { ground: '#344c38', accent: '#d6c28b', glow: '#aee2a4', minimap: '#263b30' },
  { ground: '#1b3543', accent: '#8dcfff', glow: '#a2dcff', minimap: '#1a303f' },
  { ground: '#57778a', accent: '#dcf5ff', glow: '#c8ecff', minimap: '#304e60' },
  { ground: '#392725', accent: '#ff9255', glow: '#ffbb78', minimap: '#392525' },
] as const

const GRID = 290
const HAZARD_GRID = 430
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/** A stable sparse grid; no generated obstacle ever occupies the starting clearing. */
export function nearbyObstacles(scene: number, x: number, y: number, radius: number): WorldObstacle[] {
  const result: WorldObstacle[] = []
  const pad = 100
  for (let i = Math.floor((x - radius - pad) / GRID); i <= Math.ceil((x + radius + pad) / GRID); i++) {
    for (let j = Math.floor((y - radius - pad) / GRID); j <= Math.ceil((y + radius + pad) / GRID); j++) {
      if (hash(i + 17 * scene, j + 41) < 0.43) continue
      const px = (i + 0.5) * GRID + (hash(i + scene * 31, j + 7) - 0.5) * 105
      const py = (j + 0.5) * GRID + (hash(i + 13, j + scene * 43) - 0.5) * 105
      const r = 29 + Math.floor(hash(i + 9, j + scene * 11) * 14)
      if (Math.hypot(px, py) < 205 || Math.hypot(px - x, py - y) > radius + r) continue
      result.push({ x: px, y: py, r, variant: Math.floor(hash(i + 3, j + scene) * 3) })
    }
  }
  return result
}

/** Collision is intentionally only circles, not a second physics system. */
export function resolveObstacleCollision(scene: number, x: number, y: number, radius: number): Point {
  const point = { x, y }
  for (const o of nearbyObstacles(scene, x, y, radius + 90)) {
    const dx = point.x - o.x
    const dy = point.y - o.y
    const d = Math.hypot(dx, dy)
    const min = o.r + radius
    if (d >= min) continue
    const scale = min / Math.max(0.0001, d)
    point.x = o.x + (d ? dx * scale : min)
    point.y = o.y + (d ? dy * scale : 0)
  }
  return point
}

export function nearbyHazards(scene: number, x: number, y: number, radius: number): WorldHazard[] {
  const result: WorldHazard[] = []
  for (let i = Math.floor((x - radius - 100) / HAZARD_GRID); i <= Math.ceil((x + radius + 100) / HAZARD_GRID); i++) {
    for (let j = Math.floor((y - radius - 100) / HAZARD_GRID); j <= Math.ceil((y + radius + 100) / HAZARD_GRID); j++) {
      if (hash(i + 100 + scene * 13, j + 15) < 0.33) continue
      const px = (i + 0.4) * HAZARD_GRID + (hash(i + 29, j + scene) - 0.5) * 120
      const py = (j + 0.45) * HAZARD_GRID + (hash(i + scene * 7, j + 30) - 0.5) * 120
      const r = 38 + hash(i + 4, j + scene * 17) * 18
      if (Math.hypot(px, py) < 210 || Math.hypot(px - x, py - y) > radius + r) continue
      if (nearbyObstacles(scene, px, py, r + 48).some(o => distance(o, { x: px, y: py }) < r + o.r + 20)) continue
      result.push({ x: px, y: py, r, phase: hash(i + scene, j + 59) })
    }
  }
  return result
}

export function hazardPhase(scene: number, hazard: WorldHazard, time: number): HazardPhase {
  if (scene === 0 || scene === 3) return 'active'
  const period = scene === 1 ? 4 : 3.6
  const t = ((time + hazard.phase * period) % period + period) % period
  return t < period * 0.40 ? 'idle' : t < period * 0.75 ? 'warning' : 'active'
}

export function pointIsClear(scene: number, point: Point, radius = 32): boolean {
  return nearbyObstacles(scene, point.x, point.y, radius + 70).every(o => distance(o, point) > radius + o.r)
    && nearbyHazards(scene, point.x, point.y, radius + 70).every(h => distance(h, point) > radius + h.r)
}

export function clearApproach(scene: number, from: Point, to: Point, radius = 23): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len2 = dx * dx + dy * dy
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  for (const o of nearbyObstacles(scene, mid.x, mid.y, Math.sqrt(len2) / 2 + 85)) {
    const t = Math.max(0, Math.min(1, ((o.x - from.x) * dx + (o.y - from.y) * dy) / Math.max(1, len2)))
    if (Math.hypot(o.x - (from.x + t * dx), o.y - (from.y + t * dy)) < o.r + radius) return false
  }
  return true
}

export function radialPoint(origin: Point, angle: number, radius: number): Point {
  return { x: origin.x + Math.cos(angle * TAU) * radius, y: origin.y + Math.sin(angle * TAU) * radius }
}
