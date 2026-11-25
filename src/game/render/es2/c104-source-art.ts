import type { Ctx2D } from '../ctx'

// Source art was committed to the repository BEFORE its UI/Canvas consumer.
// These large originals are reference atlases, not certified runtime animation cells.
// Render only as complete, opt-in art sheets until individual cells pass alpha QA.
const imgs1 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs1.webp' : ''
const imgs2 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs2.webp' : ''
const imgs3 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs3.webp' : ''
const imgs4 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs4.webp' : ''
const imgs5 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs5.webp' : ''
const imgs6 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs6.webp' : ''
const imgs7 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs7.webp' : ''
const imgs8 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs8.webp' : ''
const imgs9 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs9.webp' : ''
const imgs10 = import.meta.env.DEV ? import.meta.env.BASE_URL + 'assets/images/imgs10.webp' : ''

export const C104_SOURCES = Object.freeze({
  imgs1, imgs2, imgs3, imgs4, imgs5, imgs6, imgs7, imgs8, imgs9, imgs10,
})

export type C104SourceId = keyof typeof C104_SOURCES

/** Reference sheets belong only to the development art-inspection surface. */
export const C104_SURFACES = {
  heroes: { sources: ['imgs2', 'imgs3', 'imgs4'] },
  enemies: { sources: ['imgs5', 'imgs6'] },
  bosses: { sources: ['imgs7', 'imgs8'] },
  biomes: { sources: ['imgs1', 'imgs9'] },
  ui: { sources: ['imgs10'] },
} as const satisfies Record<string, { sources: readonly C104SourceId[] }>

export interface C104Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const within = (r: C104Rect, parent: C104Rect): boolean =>
  r.x >= parent.x && r.y >= parent.y &&
  r.x + r.width <= parent.x + parent.width &&
  r.y + r.height <= parent.y + parent.height

/** Draw only an explicitly approved source rect; never infer a grid. */
export function cropC104Cell(
  ctx: Ctx2D, sheet: HTMLImageElement, cell: C104Rect,
  dx: number, dy: number, dw: number, dh: number, owned: C104Rect,
): boolean {
  const nums = [cell.x, cell.y, cell.width, cell.height, owned.x, owned.y,
    owned.width, owned.height, dx, dy, dw, dh]
  if (!nums.every(Number.isFinite) ||
    cell.width <= 0 || cell.height <= 0 || owned.width <= 0 || owned.height <= 0 ||
    dw <= 0 || dh <= 0 || !sheet.complete || sheet.naturalWidth <= 0 || sheet.naturalHeight <= 0) return false
  if (!within(cell, owned) ||
    !within(owned, { x: 0, y: 0, width: sheet.naturalWidth, height: sheet.naturalHeight })) return false
  ctx.drawImage(sheet, cell.x, cell.y, cell.width, cell.height, dx, dy, dw, dh)
  return true
}
