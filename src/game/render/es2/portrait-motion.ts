import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'
import { drawGaitBody, sampleGait } from '../gait'

/** Figure height inside the painted 900px portrait (its top padding is empty). */
const PORTRAIT_FIGURE = 0.92

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
  // Run/dash: the shared human gait articulates the legs under one rigid torso,
  // which keeps the built-in weapon intact.
  const gait = sampleGait(anim, false)
  if (gait) {
    drawGaitBody(ctx, image, 0, 0, 900, 900, -paintedWidth / 2, 4 - paintedHeight, paintedWidth, paintedHeight,
      4, paintedHeight * PORTRAIT_FIGURE, gait)
    return
  }
  const striking = !anim.reducedMotion && (anim.pose === 'attack' || anim.pose === 'cast')
  const impact = striking ? Math.sin(Math.max(0, Math.min(1, anim.phase)) * Math.PI) : 0
  const rows = striking ? 12 : 1

  ctx.save()
  ctx.translate(0, -impact * 0.8)
  // Keep the ground contact and source silhouette stable while subtly moving
  // the torso. The weapon is baked into this illustration: no duplicate
  // rigid sword/staff is painted over it and no unrelated character appears.
  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5) / rows
    const chest = Math.max(0, 1 - Math.abs(v - 0.44) * 2.6)
    const shift = impact * chest * 2.2
    const sy = 900 * row / rows
    const sh = 900 / rows
    const dy = -paintedHeight + 4 + paintedHeight * row / rows
    // Fractional overlap hides tile seams without borrowing a neighboring
    // animation frame. Every sample stays entirely within the SAME 900px image.
    ctx.drawImage(image, 0, sy, 900, sh,
      -paintedWidth / 2 + shift, dy, paintedWidth,
      paintedHeight / rows + (row === rows - 1 ? 0 : 0.4))
  }
  ctx.restore()
}
