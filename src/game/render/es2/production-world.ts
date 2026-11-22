import { BIOME_IDS, type BiomeId } from '../../content/biomes'
import { BOSS_DEFINITIONS, type BossId } from '../../content/bosses/definitions'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import type { Ctx2D } from '../ctx'

/** Vite resolves all URLs at build time. The browser only fetches a bitmap when it is used. */
const urls = import.meta.glob('../../../assets/es2/production/{enemies,bosses,biomes,ui}/*.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

const src = (category: 'enemies' | 'bosses' | 'biomes' | 'ui', name: string): string => {
  const path = `../../../assets/es2/production/${category}/${name}@3x.webp`
  const url = urls[path]
  if (!url) throw new Error('Missing authored world art: ' + path)
  return url
}

/** These images are review-state assets, not gameplay data or hitbox definitions. */
export const WORLD_UI_IDS = [
  'treasure-common', 'treasure-rare', 'treasure-legendary', 'treasure-cursed',
  'rarity-common', 'rarity-rare', 'rarity-legendary',
  'hud-health', 'hud-xp', 'hud-cooldown', 'hud-quest',
  'achievement-boss', 'achievement-survivor', 'achievement-evolution',
  'achievement-explorer', 'achievement-collector', 'achievement-flawless',
] as const
export type WorldUiId = typeof WORLD_UI_IDS[number]

export const WORLD_ART = Object.freeze({
  enemies: Object.fromEntries((Object.keys(ENEMY_DEFINITIONS) as FactionKind[]).map(id => [
    id, { body: src('enemies', id + '-body'), telegraph: src('enemies', id + '-telegraph') },
  ])) as Record<FactionKind, { body: string; telegraph: string }>,
  bosses: Object.fromEntries((Object.keys(BOSS_DEFINITIONS) as BossId[]).map(id => [
    id, src('bosses', id + '-phases'),
  ])) as Record<BossId, string>,
  biomes: Object.fromEntries(BIOME_IDS.map(id => [
    id, { ground: src('biomes', id + '-ground'), decor: src('biomes', id + '-decor') },
  ])) as Record<BiomeId, { ground: string; decor: string }>,
  ui: Object.fromEntries(WORLD_UI_IDS.map(id => [id, src('ui', id)])) as Record<WorldUiId, string>,
})

export interface WorldRuntimeImages {
  bosses: Record<BossId, HTMLImageElement>
  ground: Record<BiomeId, HTMLImageElement>
  decor: Record<BiomeId, HTMLImageElement>
}

/** Allocate the twelve scene and boss images once on engine mount, never during rAF. */
export function loadWorldRuntimeImages(makeImage: () => HTMLImageElement = () => new Image()): WorldRuntimeImages {
  const load = (url: string): HTMLImageElement => {
    const image = makeImage()
    image.src = url
    return image
  }
  return {
    bosses: Object.fromEntries((Object.keys(WORLD_ART.bosses) as BossId[]).map(id =>
      [id, load(WORLD_ART.bosses[id])])) as Record<BossId, HTMLImageElement>,
    ground: Object.fromEntries(BIOME_IDS.map(id =>
      [id, load(WORLD_ART.biomes[id].ground)])) as Record<BiomeId, HTMLImageElement>,
    decor: Object.fromEntries(BIOME_IDS.map(id =>
      [id, load(WORLD_ART.biomes[id].decor)])) as Record<BiomeId, HTMLImageElement>,
  }
}

export function drawProductionBossFrame(
  ctx: Ctx2D, image: HTMLImageElement, phase: 1 | 2 | 3, width: number, height: number,
): boolean {
  if (!image.complete || image.naturalWidth !== 576 || image.naturalHeight !== 192 || phase < 1 || phase > 3) return false
  ctx.drawImage(image, (phase - 1) * 192, 0, 192, 192, -width / 2, -height + 4, width, height)
  return true
}

export function drawProductionEnemyFrame(
  ctx: Ctx2D, image: HTMLImageElement, frame: number, width: number, height: number,
): boolean {
  if (!image.complete || image.naturalWidth !== 576 || image.naturalHeight !== 96 || !Number.isFinite(frame)) return false
  const slot = Math.max(0, Math.min(5, Math.floor(frame)))
  ctx.drawImage(image, slot * 96, 0, 96, 96, -width / 2, -height + 4, width, height)
  return true
}
