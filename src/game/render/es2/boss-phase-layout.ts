/** Art-only geometry; the source cells stay intact and use a single uniform scale. */
export const BOSS_BASE_DRAW_PX = 255
export const BOSS_MAX_BODY_CORRECTION = 2
export function bossPhaseVisualScale(phase: 1 | 2 | 3): number {
  return phase === 3 ? 1.24 : phase === 2 ? 1.12 : 1
}
export const BOSS_MAX_DRAW_PX = BOSS_BASE_DRAW_PX * bossPhaseVisualScale(3) * BOSS_MAX_BODY_CORRECTION
export const BOSS_DRAW_CULL_MARGIN = Math.ceil(BOSS_MAX_DRAW_PX + BOSS_BASE_DRAW_PX / 2 + 24)
export interface BossPhaseLayout {
  readonly scale: number
  readonly x: number
  readonly y: number
  readonly bodyTop: number
}

/** Largest connected solid-alpha region; detached source-sheet fragments must not set body height. */
function bodyBounds(rgba: Uint8ClampedArray, cell: number, phase: number, inset: number) {
  const side = cell - inset * 2, stride = cell * 3
  const mask = new Uint8Array(side * side), queue = new Int32Array(mask.length)
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    if (rgba[((y + inset) * stride + phase * cell + inset + x) * 4 + 3]! >= 128) mask[y * side + x] = 1
  }
  let best: { left: number; right: number; top: number; bottom: number; count: number } | undefined
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue
    let head = 0, tail = 1, left = side, right = 0, top = side, bottom = 0
    queue[0] = start; mask[start] = 0
    while (head < tail) {
      const index = queue[head++]!, x = index % side, y = Math.floor(index / side)
      left = Math.min(left, x); right = Math.max(right, x + 1)
      top = Math.min(top, y); bottom = Math.max(bottom, y + 1)
      for (let ny = Math.max(0, y - 1); ny <= Math.min(side - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(side - 1, x + 1); nx++) {
          const next = ny * side + nx
          if (mask[next]) { mask[next] = 0; queue[tail++] = next }
        }
      }
    }
    if (!best || tail > best.count) best = { left, right, top, bottom, count: tail }
  }
  return best
}

/** Compute once after decode, never inside the render loop. Preserve the P1 draw rect exactly. */
export function measureBossPhaseLayouts(rgba: Uint8ClampedArray, cell: number, inset = 0): readonly BossPhaseLayout[] | undefined {
  if (!Number.isInteger(cell) || !Number.isInteger(inset) || inset < 0 || cell <= inset * 2 || rgba.length !== cell * cell * 12) return undefined
  const side = cell - inset * 2
  const bounds = [0, 1, 2].map(phase => bodyBounds(rgba, cell, phase, inset))
  const first = bounds[0]
  if (!first || bounds.some(b => !b)) return undefined
  const baseHeight = first.bottom - first.top
  const center = (first.left + first.right) / (2 * side) - .5
  const foot = first.bottom / side - 1
  return bounds.map((value, index) => {
    const b = value!
    const correction = Math.min(BOSS_MAX_BODY_CORRECTION, baseHeight / (b.bottom - b.top))
    const scale = bossPhaseVisualScale((index + 1) as 1 | 2 | 3) * correction
    const x = center - (b.left + b.right) / (2 * side) * scale
    const y = foot - b.bottom / side * scale
    return { scale, x: index === 0 ? -.5 : x, y: index === 0 ? -1 : y, bodyTop: foot - (b.bottom - b.top) / side * scale }
  })
}
