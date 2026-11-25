import { ENEMY_DEFINITIONS } from './definitions'
import type { FactionRuntime } from './runtime'
import { drawZoneMotes } from '../../render/energy-art'

/**
 * Read-only Canvas 2D warning overlay for the integration-owned renderer.
 * No gradients, allocations, animation loops, or gameplay mutations.
 */
export function drawFactionTelegraphs(
  ctx: CanvasRenderingContext2D, runtime: FactionRuntime, ox: number, oy: number,
  reduced = false, width = Infinity, height = Infinity,
): void {
  const visible = (x: number, y: number, radius: number) =>
    x + radius >= 0 && y + radius >= 0 && x - radius <= width && y - radius <= height
  ctx.save()
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.7
  for (const enemy of runtime.enemies) {
    if (enemy.hp <= 0 || (enemy.state !== 'windup' && enemy.state !== 'attack')) continue
    ctx.strokeStyle = ENEMY_DEFINITIONS[enemy.kind].telegraphColor
    ctx.beginPath()
    if (enemy.kind === 'crystal-sentinel') {
      // The beam uses the direction locked at windup, never the live hero position.
      ctx.moveTo(enemy.x + ox, enemy.y + oy)
      ctx.lineTo(enemy.x + enemy.facingX * 400 + ox, enemy.y + enemy.facingY * 400 + oy)
    } else if (enemy.kind === 'shadow-assassin') {
      ctx.moveTo(enemy.x + ox, enemy.y + oy)
      ctx.lineTo(enemy.aimX + ox, enemy.aimY + oy)
    } else {
      const radius = enemy.kind === 'fire-imp' ? 82
        : enemy.kind === 'plague-carrier' ? 75
          : enemy.radius + 45
      const aimed = enemy.kind === 'fire-imp' || enemy.kind === 'plague-carrier'
      const x = (aimed ? enemy.aimX : enemy.x) + ox
      const y = (aimed ? enemy.aimY : enemy.y) + oy
      if (!visible(x, y, radius)) continue
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.stroke()
      drawZoneMotes(ctx, x, y, radius, 0, enemy.timer, ENEMY_DEFINITIONS[enemy.kind].telegraphColor, reduced)
      continue
    }
    ctx.stroke()
  }
  // Zones remain visible while armed and after activation until their finite lifetime ends.
  for (const zone of runtime.zones) {
    if (zone.life <= 0 || !visible(zone.x + ox, zone.y + oy, zone.radius)) continue
    ctx.strokeStyle = zone.status === 'freeze' ? '#83defc'
      : zone.status === 'poison' ? '#b4ed64' : '#ff956f'
    ctx.globalAlpha = zone.delay > 0 ? 0.85 : 0.5
    ctx.beginPath()
    ctx.arc(zone.x + ox, zone.y + oy, zone.radius, 0, Math.PI * 2)
    ctx.stroke()
    drawZoneMotes(ctx, zone.x + ox, zone.y + oy, zone.radius, 0, zone.life, String(ctx.strokeStyle), reduced)
  }
  ctx.restore()
}
