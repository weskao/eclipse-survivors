// Visual-effect emitters (original burst / impact / zigzag / pushEcho).
import { rand } from './math'
import type { GameState, ImpactWave, JobId, NumberFx, Point } from './types'

export function burst(s: GameState, x: number, y: number, color: string, n = 7): void {
  for (let i = 0; i < n && s.fx.length < 240; i++) {
    s.fx.push({ x, y, vx: rand(-100, 100), vy: rand(-150, 65), life: rand(0.2, 0.65), max: 0.65, color, r: rand(2, 5) })
  }
}

function enqueueImpact(s: GameState, wave: ImpactWave): void {
  const queue = s.impactWaves
  if (queue.length >= 37) {
    const normal = queue.findIndex(w => w.contact === 'normal')
    if (normal !== -1) queue.splice(normal, 1)
    else if (wave.contact === 'normal') return
    else queue.shift()
  }
  queue.push(wave)
}

export function impact(s: GameState, x: number, y: number, size = 36, color = '#ffd59a', strength = 1): void {
  enqueueImpact(s, { x, y, size, color, life: 0.38, max: 0.38 })
  // Routine hits and crowd AoE must never keep the whole battlefield oscillating.
  if (strength >= 2.5) requestCameraKick(s, strength * 0.6)
}

/** Single-owner local hit cue: independent of damage text, no secondary particle pool. */
export function emitHitImpact(s: GameState, x: number, y: number, radius: number, angle: number, critical: boolean): void {
  const duration = critical ? 0.34 : 0.24
  enqueueImpact(s, { x, y, angle, size: Math.max(44, Math.min(124, radius * (critical ? 2.5 : 1.85))),
    color: critical ? '#ffc577' : '#f4d9b0', life: duration, max: duration, contact: critical ? 'critical' : 'normal' })
}

/** At most one brief camera nudge per 0.6 game-seconds, regardless of hit count. */
export function requestCameraKick(s: GameState, strength: number): void {
  if (s.worldClock - s.lastCameraKickAt < 0.6) return
  s.lastCameraKickAt = s.worldClock
  s.cameraKick = Math.max(s.cameraKick, Math.min(1.6, strength))
}

export function zigzag(s: GameState, x1: number, y1: number, x2: number, y2: number): void {
  const pts: Point[] = [{ x: x1, y: y1 }]
  const n = 7
  for (let j = 1; j < n; j++) {
    const t = j / n
    pts.push({ x: x1 + (x2 - x1) * t + rand(-22, 22), y: y1 + (y2 - y1) * t + rand(-19, 19) })
  }
  pts.push({ x: x2, y: y2 })
  s.lightningFx.push({ pts, life: 0.23, max: 0.23 })
}

export function pushEcho(s: GameState, x: number, y: number, kind: JobId, frame: number, angle = 0): void {
  if (s.motionEchoes.length > 16) s.motionEchoes.shift()
  s.motionEchoes.push({ x, y, kind, frame, angle, life: 0.23, max: 0.23 })
}

/** Bounded damage labels; ordinary hit spam must not evict a readable critical popup. */
export function pushDamageNumber(s: GameState, number: NumberFx): void {
  s.numberFx.push(number)
  if (s.numberFx.length > 80) {
    const regular = s.numberFx.findIndex(hit => !hit.critical)
    s.numberFx.splice(regular === -1 ? 0 : regular, 1)
  }
}
