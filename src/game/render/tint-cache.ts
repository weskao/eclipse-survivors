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
