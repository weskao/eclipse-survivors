import type { Ctx2D } from './ctx'
import normalUrl from '../../assets/es2/production/skills/hit-contact.svg?url'
import criticalUrl from '../../assets/es2/production/skills/hit-critical.svg?url'

type Contact = 'normal' | 'heavy' | 'critical'
const textures: Partial<Record<'normal' | 'critical', HTMLImageElement>> = {}
export function preloadHitImpactArt(): void {
  if (typeof Image === 'undefined' || textures.normal) return
  for (const [kind, url] of [['normal', normalUrl], ['critical', criticalUrl]] as const) {
    const image = new Image(); image.decoding = 'async'; image.src = url; textures[kind] = image
  }
}

/** Local +X is the actual hit direction. One baked transparent texture, no rings or full-screen flashes. */
export function drawHitImpact(ctx: Ctx2D, kind: Contact, size: number, progress: number, reduced: boolean, flashing: boolean, image = textures[kind === 'heavy' ? 'normal' : kind]): void {
  const p = Math.max(0, Math.min(1, progress))
  if (p >= 1) return
  const critical = kind === 'critical'
  const heavy = kind === 'heavy'
  const motion = reduced ? 0.35 : p
  const fade = (1 - p) ** 1.65
  ctx.globalAlpha *= Math.min(flashing || reduced ? 0.48 : critical ? 0.86 : heavy ? 0.78 : 0.64, fade)
  const width = size * (0.65 + motion * 0.48)
  const height = width * (critical ? 0.73 : heavy ? 0.82 : 0.58)
  const travel = reduced ? 0 : size * motion * (heavy ? 0.13 : 0.22)
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, -width * 0.38 + travel, -height / 2, width, height)
    return
  }
  // Decode fallback: asymmetric tapered fracture with one fill, never a radial diagram.
  ctx.fillStyle = critical ? '#ffc577' : heavy ? '#eeb78c' : '#f4d9b0'
  ctx.beginPath()
  ctx.moveTo(-width * 0.23 + travel, 0)
  ctx.bezierCurveTo(-width * 0.05 + travel, -height * 0.22, width * 0.1 + travel, -height * 0.07, width * 0.56 + travel, -height * 0.35)
  ctx.lineTo(width * 0.19 + travel, 0)
  ctx.lineTo(width * 0.43 + travel, height * 0.29)
  ctx.bezierCurveTo(width * 0.06 + travel, height * 0.12, -width * 0.08 + travel, height * 0.23, -width * 0.23 + travel, 0)
  ctx.closePath(); ctx.fill()
}
