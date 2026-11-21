// Visual-effect emitters (original burst / impact / zigzag / pushEcho).
import { rand } from './math'
import type { GameState, JobId, Point } from './types'

export function burst(s: GameState, x: number, y: number, color: string, n = 7): void {
  for (let i = 0; i < n && s.fx.length < 240; i++) {
    s.fx.push({ x, y, vx: rand(-100, 100), vy: rand(-150, 65), life: rand(0.2, 0.65), max: 0.65, color, r: rand(2, 5) })
  }
}

export function impact(s: GameState, x: number, y: number, size = 36, color = '#ffd59a', strength = 1): void {
  if (s.impactWaves.length > 36) s.impactWaves.shift()
  s.impactWaves.push({ x, y, size, color, life: 0.38, max: 0.38 })
  s.cameraKick = Math.min(9, s.cameraKick + strength * 1.9)
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
