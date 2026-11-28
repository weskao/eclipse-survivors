import type { Ctx2D } from './ctx'
import { drawProjectileSprite, type ProjectileArtId, type ProjectileSprites } from './projectile-art'

const TAU = Math.PI * 2
const DIRECTIONS = Array.from({ length: 12 }, (_, i) => ({ x: Math.cos(i * TAU / 12), y: Math.sin(i * TAU / 12) }))

/** Local-space, fixed-count sparks; no particles are allocated in simulation. */
export function drawEnergyTrail(ctx: Ctx2D, radius: number, life: number, color: string, reduced = false): void {
  if (reduced) return
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha *= 0.63
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const phase = ((life * 4 + i * 0.2) % 1 + 1) % 1
    const x = -radius * (1.05 + phase * 2.5)
    const y = (i % 2 ? -1 : 1) * radius * (0.15 + phase * 0.45)
    const size = radius * (0.26 - phase * 0.15)
    ctx.moveTo(x + size * 1.8, y)
    ctx.lineTo(x, y - size)
    ctx.lineTo(x - size * 1.8, y)
    ctx.lineTo(x, y + size)
    ctx.closePath()
  }
  ctx.fill()
  ctx.restore()
}

/** Authored art first; a faceted, direction-readable core survives decode failure. */
export function drawEnergyMissile(ctx: Ctx2D, sprites: Partial<ProjectileSprites> | undefined,
  art: ProjectileArtId, radius: number, life: number, color: string, core: string, reduced = false): void {
  drawEnergyTrail(ctx, radius, life, color, reduced)
  if (drawProjectileSprite(ctx, sprites, art, Math.max(28, radius * 3.2))) return
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(radius * 1.3, 0)
  ctx.bezierCurveTo(radius * 0.4, -radius * 1.1, -radius * 0.4, -radius * 0.8, -radius * 1.3, 0)
  ctx.bezierCurveTo(-radius * 0.4, radius * 0.8, radius * 0.4, radius * 1.1, radius * 1.3, 0)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.moveTo(radius * 0.8, 0); ctx.lineTo(0, -radius * 0.42)
  ctx.lineTo(-radius * 0.6, 0); ctx.lineTo(0, radius * 0.42)
  ctx.closePath(); ctx.fill()
}

/** Inset diamond embers remain inside the original lethal disk or annulus.
 * The authoritative warning outline is still painted by the caller. */
export function drawZoneMotes(ctx: Ctx2D, x: number, y: number, outer: number,
  inner: number, phase: number, color: string, reduced = false): void {
  const thickness = outer - inner
  if (reduced || thickness < 8) return
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha *= 0.68
  const angle = phase * 0.65
  const cs = Math.cos(angle), sn = Math.sin(angle)
  const size = Math.min(3.5, thickness * 0.09)
  ctx.beginPath()
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const d = DIRECTIONS[i]!
    const ux = d.x * cs - d.y * sn, uy = d.y * cs + d.x * sn
    const r = inner + thickness * (i % 2 ? 0.76 : 0.48)
    const px = x + ux * r, py = y + uy * r
    ctx.moveTo(px, py - size * 1.6); ctx.lineTo(px + size, py)
    ctx.lineTo(px, py + size * 1.6); ctx.lineTo(px - size, py); ctx.closePath()
  }
  ctx.fill()
  // Broken, tapered-looking filaments are interior decoration, not new boundaries.
  // They never paint into the safe hole of an annulus.
  ctx.strokeStyle = color
  ctx.globalAlpha *= 0.6
  ctx.lineWidth = Math.min(2.3, thickness * 0.07)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + angle
    ctx.arc(x, y, inner + thickness * 0.63, a, a + 0.38)
    // Start a new subpath so adjacent filaments are never joined by a chord.
    ctx.moveTo(x + Math.cos(a + TAU / 4) * (inner + thickness * 0.63),
      y + Math.sin(a + TAU / 4) * (inner + thickness * 0.63))
  }
  ctx.stroke()
  ctx.restore()
}
