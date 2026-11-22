import type { Ctx2D } from '../../render/ctx'
import type { BossSnapshot, BossTelegraph } from './controller'

const TAU = Math.PI * 2
const SAFE_HALF_ANGLE = Math.PI / 5

/**
 * Optional Canvas 2D renderer. The controller's exact world-space geometry is
 * the single source of truth for both warning shapes and damage collision.
 * ox/oy are the same world-to-canvas offsets used by ContentRegistry.render.
 */
export function drawBossTelegraphs(ctx: Ctx2D, snapshot: BossSnapshot, ox: number, oy: number): void {
  if (!snapshot.id) return
  ctx.save()
  try {
    for (const t of snapshot.telegraphs) drawShape(ctx, t, ox, oy)
    for (const p of snapshot.projectiles) {
      ctx.beginPath()
      ctx.arc(p.x + ox, p.y + oy, p.radius, 0, TAU)
      ctx.fillStyle = p.color
      ctx.globalAlpha = 0.9
      ctx.fill()
    }
  } finally {
    ctx.restore()
  }
}

function drawShape(ctx: Ctx2D, t: BossTelegraph, ox: number, oy: number): void {
  const x = t.x + ox, y = t.y + oy
  ctx.fillStyle = t.color
  ctx.strokeStyle = t.color
  ctx.globalAlpha = t.harmless ? 0.15 : 0.23
  ctx.lineWidth = 3
  ctx.beginPath()
  if (t.shape === 'beam') {
    // A round-cap line's half-width is exactly the collision beam width.
    ctx.lineWidth = t.width * 2
    ctx.lineCap = 'round'
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(t.angle) * t.length, y + Math.sin(t.angle) * t.length)
    ctx.stroke()
    return
  }
  if (t.shape === 'arena') {
    // Paint the DANGEROUS sector, leaving the rotating safe wedge unpainted.
    ctx.moveTo(x, y)
    ctx.arc(x, y, t.radius, t.safeAngle + SAFE_HALF_ANGLE,
      t.safeAngle + TAU - SAFE_HALF_ANGLE)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    return
  }
  ctx.arc(x, y, t.radius, 0, TAU)
  if (t.shape === 'ring' && t.innerRadius > 0) {
    ctx.moveTo(x + t.innerRadius, y)
    ctx.arc(x, y, t.innerRadius, 0, TAU, true)
  }
  ctx.fill()
  ctx.stroke()
}
