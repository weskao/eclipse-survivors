/** Render-only broad-phase. Never filter a simulation actor list with this helper. */
export interface Viewport {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

/** Conservative inclusive circle-vs-viewport test; caller chooses VFX/telegraph overscan. */
export function isInDrawRange(
  worldX: number,
  worldY: number,
  radius: number,
  view: Viewport,
  overscan = 0,
): boolean {
  const reach = Math.max(0, radius) + Math.max(0, overscan)
  const x = worldX + view.offsetX
  const y = worldY + view.offsetY
  return x + reach >= 0 && x - reach <= view.width
    && y + reach >= 0 && y - reach <= view.height
}
