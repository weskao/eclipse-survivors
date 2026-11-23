import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

/**
 * Source art is a full 900px transparent illustration, not a 128px atlas cell.
 * Preserve its face, costume and built-in equipment; do not apply the original
 * knight/wizard weapon masks to these different character silhouettes.
 */
export function drawPortraitMotion(
  ctx: Ctx2D, image: HTMLImageElement, anim: HeroAnimation, width: number, height: number,
): void {
  const paintedWidth = width * 1.24
  const paintedHeight = height * 1.10
  const reduced = anim.reducedMotion
  const running = !reduced && (anim.pose === 'run' || anim.pose === 'dash')
  const striking = !reduced && (anim.pose === 'attack' || anim.pose === 'cast')
  const phase = running ? ((anim.frame % Math.max(1, anim.count)) + anim.count) / Math.max(1, anim.count)
    : Math.max(0, Math.min(1, anim.phase))
  const stride = running ? Math.sin(phase * Math.PI * 2) : 0
  const impact = striking ? Math.sin(phase * Math.PI) : 0
  const bob = Math.abs(stride) * 1.4 + impact * 0.8
  const rows = running || striking ? 12 : 1

  ctx.save()
  ctx.translate(0, -bob)
  // Keep the ground contact and source silhouette stable while subtly moving
  // the torso and feet. The weapon is baked into this illustration: no duplicate
  // rigid sword/staff is painted over it and no unrelated character appears.
  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5) / rows
    const chest = Math.max(0, 1 - Math.abs(v - 0.44) * 2.6)
    const legs = Math.max(0, (v - 0.63) / 0.37)
    const shift = running ? stride * (chest * 1.0 + legs * 2.3)
      : striking ? impact * chest * 2.2 : 0
    const lift = running ? Math.abs(stride) * legs * 0.6 : 0
    const sy = 900 * row / rows
    const sh = 900 / rows
    const dy = -paintedHeight + 4 + paintedHeight * row / rows - lift
    // Fractional overlap hides tile seams without borrowing a neighboring
    // animation frame. Every sample stays entirely within the SAME 900px image.
    ctx.drawImage(image, 0, sy, 900, sh,
      -paintedWidth / 2 + shift, dy, paintedWidth,
      paintedHeight / rows + (row === rows - 1 ? 0 : 0.4))
  }
  ctx.restore()
}
