import type { GameState, Mob } from '../../../game/types'

export interface BossPointerPosition {
  readonly left: number
  readonly top: number
  readonly angle: number
  /** Game-world distance in world coordinate units; never label these as meters. */
  readonly distance: number
}
export interface BossPointer extends BossPointerPosition {
  readonly artSrc: string
  readonly atlas: boolean
}

/** Uses the same world-to-screen transform as drawFrame; no timers or simulation mutation. */
export function locateOffscreenBoss(
  state: Pick<GameState, 'hero' | 'cam' | 'W' | 'H'>, boss: Mob | null,
): BossPointerPosition | null {
  const { W, H, hero, cam } = state
  if (!boss || boss.hp <= 0 || !hero || W <= 0 || H <= 0 ||
      !Number.isFinite(boss.x) || !Number.isFinite(boss.y)) return null

  const x = boss.x + W * 0.5 - cam.x
  const y = boss.y + H * 0.53 - cam.y
  // The actual boss art is 236 × 246 and is foot-anchored at (x, y).
  if (x >= -118 && x <= W + 118 && y >= 0 && y <= H + 246) return null

  const cx = W / 2, cy = H / 2
  const dx = x - cx, dy = y - cy
  const left = Math.min(76, W * 0.23)
  const right = W - left
  const portrait = H > W
  const top = portrait ? Math.min(H * .42, Math.max(190, H * .33))
    : Math.min(H * .42, Math.max(95, H * .32))
  const bottom = Math.max(top + 1, H - (portrait ? Math.max(130, H * .18) : Math.max(85, H * .27)))
  const scaleX = dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity
  const scaleY = dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity
  const factor = Math.max(0, Math.min(1, scaleX, scaleY))
  return {
    left: Math.round(Math.max(left, Math.min(right, cx + dx * factor))),
    top: Math.round(Math.max(top, Math.min(bottom, cy + dy * factor))),
    angle: Math.round(Math.atan2(boss.y - hero.y, boss.x - hero.x) * 180 / Math.PI),
    distance: Math.round(Math.hypot(boss.x - hero.x, boss.y - hero.y)),
  }
}
