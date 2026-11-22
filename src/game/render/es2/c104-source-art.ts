import type { Ctx2D } from '../ctx'

// Source art was committed to the repository BEFORE its UI/Canvas consumer.
// These large originals are reference atlases; runtime heroes use the verified
// per-cell atlases built by scripts/es2/build_c104_hero_atlases.py.
import abyssalRift from '../../../assets/es2/source/c104/biomes-abyssal-necropolis-celestial-rift-sheet.png?url'
import shadowblade from '../../../assets/es2/source/c104/hero-shadowblade-run-attack-sheet.png?url'
import spiritSummoner from '../../../assets/es2/source/c104/hero-spirit-summoner-run-cast-sheet.png?url'
import crimsonPaladin from '../../../assets/es2/source/c104/hero-crimson-paladin-run-attack-sheet.png?url'
import enemiesA from '../../../assets/es2/source/c104/enemies-phantom-imp-wraith-berserker-sentinel-sheet.png?url'
import enemiesB from '../../../assets/es2/source/c104/enemies-assassin-necromancer-archer-plague-guardian-sheet.png?url'
import bossesA from '../../../assets/es2/source/c104/bosses-abyss-monarch-frost-sovereign-sheet.png?url'
import bossesB from '../../../assets/es2/source/c104/bosses-infernal-titan-eclipse-seraph-sheet.png?url'
import bloodMoonForest from '../../../assets/es2/source/c104/biomes-blood-moon-cathedral-cursed-forest-sheet.png?url'
import uiOrnaments from '../../../assets/es2/source/c104/ui-treasure-rarity-hud-ornaments-sheet.png?url'

export const C104_SOURCES = Object.freeze({
  'biomes-abyssal-necropolis-celestial-rift': abyssalRift,
  'hero-shadowblade-run-attack': shadowblade,
  'hero-spirit-summoner-run-cast': spiritSummoner,
  'hero-crimson-paladin-run-attack': crimsonPaladin,
  'enemies-phantom-imp-wraith-berserker-sentinel': enemiesA,
  'enemies-assassin-necromancer-archer-plague-guardian': enemiesB,
  'bosses-abyss-monarch-frost-sovereign': bossesA,
  'bosses-infernal-titan-eclipse-seraph': bossesB,
  'biomes-blood-moon-cathedral-cursed-forest': bloodMoonForest,
  'ui-treasure-rarity-hud-ornaments': uiOrnaments,
})

export type C104SourceId = keyof typeof C104_SOURCES

/** Every source file is referenced by a real UI surface; no orphaned art. */
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
