import type { Ctx2D } from '../ctx'

// Source art was committed to the repository BEFORE its UI/Canvas consumer.
// These large originals are reference atlases, not certified runtime animation cells.
// DEV-only display WebPs sit beside the immutable PNG masters and never enter dist/.
const sheet = (id: string): string => import.meta.env.DEV
  ? import.meta.env.BASE_URL + `src/assets/es2/source/c104/${id}-sheet.webp` : ''

export const C104_SOURCES = Object.freeze({
  'biomes-abyssal-necropolis-celestial-rift': sheet('biomes-abyssal-necropolis-celestial-rift'),
  'hero-shadowblade-run-attack': sheet('hero-shadowblade-run-attack'),
  'hero-spirit-summoner-run-cast': sheet('hero-spirit-summoner-run-cast'),
  'hero-crimson-paladin-run-attack': sheet('hero-crimson-paladin-run-attack'),
  'enemies-phantom-imp-wraith-berserker-sentinel': sheet('enemies-phantom-imp-wraith-berserker-sentinel'),
  'enemies-assassin-necromancer-archer-plague-guardian': sheet('enemies-assassin-necromancer-archer-plague-guardian'),
  'bosses-abyss-monarch-frost-sovereign': sheet('bosses-abyss-monarch-frost-sovereign'),
  'bosses-infernal-titan-eclipse-seraph': sheet('bosses-infernal-titan-eclipse-seraph'),
  'biomes-blood-moon-cathedral-cursed-forest': sheet('biomes-blood-moon-cathedral-cursed-forest'),
  'ui-treasure-rarity-hud-ornaments': sheet('ui-treasure-rarity-hud-ornaments'),
})

export type C104SourceId = keyof typeof C104_SOURCES

/** Reference sheets belong only to the development art-inspection surface. */
export const C104_SURFACES = {
  heroes: { sources: ['hero-shadowblade-run-attack', 'hero-spirit-summoner-run-cast', 'hero-crimson-paladin-run-attack'] },
  enemies: { sources: ['enemies-phantom-imp-wraith-berserker-sentinel', 'enemies-assassin-necromancer-archer-plague-guardian'] },
  bosses: { sources: ['bosses-abyss-monarch-frost-sovereign', 'bosses-infernal-titan-eclipse-seraph'] },
  biomes: { sources: ['biomes-abyssal-necropolis-celestial-rift', 'biomes-blood-moon-cathedral-cursed-forest'] },
  ui: { sources: ['ui-treasure-rarity-hud-ornaments'] },
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
