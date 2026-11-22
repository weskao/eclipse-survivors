import { TAU } from '../constants'
import type { Ctx2D } from './ctx'
import type { MakeCanvas } from './sprites'

type Drawable = HTMLCanvasElement | HTMLImageElement

/**
 * Keep the heavy CSS filter off the visible Canvas: one filtered bitmap per
 * art source, filter and displayed dimensions. The offscreen raster is 2x the
 * displayed size, matching the game's <=1.5 device-pixel-ratio cap.
 * A WeakMap releases replaced artwork; each source holds at most 8 variants.
 */
export interface MobTintCache {
  makeCanvas: MakeCanvas
  variants: WeakMap<Drawable, Map<string, HTMLCanvasElement>>
}

export function cachedMobTint(
  image: Drawable, filter: string, width: number, height: number, cache?: MobTintCache,
): Drawable {
  if (!cache) return image
  const key = `${width}x${height}:${filter}`
  const saved = cache.variants.get(image)
  const existing = saved?.get(key)
  if (existing) return existing
  const canvas = cache.makeCanvas(Math.ceil(width * 2), Math.ceil(height * 2))
  const paint = canvas.getContext('2d')
  if (!paint || typeof paint.filter !== 'string') return image
  paint.filter = filter
  paint.drawImage(image, 0, 0, canvas.width, canvas.height)
  paint.filter = 'none'
  const variants = saved ?? new Map<string, HTMLCanvasElement>()
  if (!saved) cache.variants.set(image, variants)
  if (variants.size >= 8) {
    const oldest = variants.keys().next()
    if (!oldest.done) variants.delete(oldest.value)
  }
  variants.set(key, canvas)
  return canvas
}

/** Identical stationary mob shadows share a small prepainted 2x bitmap. */
export interface MobShadowCache {
  makeCanvas: MakeCanvas
  shadows: Map<string, HTMLCanvasElement>
}

export function drawCachedMobShadow(
  ctx: Ctx2D, x: number, y: number, width: number, height: number, cache?: MobShadowCache,
): boolean {
  if (!cache) return false
  const key = `${width}x${height}`
  const rx = width * 0.32 * 1.12
  const ry = height * 0.095
  const padding = 3
  const drawWidth = rx * 2 + padding * 2
  const drawHeight = ry * 2 + padding * 2
  let shadow = cache.shadows.get(key)
  if (!shadow) {
    const canvas = cache.makeCanvas(Math.ceil(drawWidth * 2), Math.ceil(drawHeight * 2))
    const paint = canvas.getContext('2d')
    if (!paint) return false
    paint.scale(2, 2)
    paint.fillStyle = '#02070b70'
    paint.beginPath()
    paint.ellipse(rx + padding, ry + padding, rx, ry, 0, 0, TAU)
    paint.fill()
    shadow = canvas
    cache.shadows.set(key, shadow)
  }
  ctx.drawImage(shadow, x + 5 - rx - padding, y + 5 - ry - padding, drawWidth, drawHeight)
  return true
}
