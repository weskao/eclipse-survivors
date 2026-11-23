import { BIOME_IDS, type BiomeId } from '../../content/biomes'
import { BOSS_DEFINITIONS, type BossId } from '../../content/bosses/definitions'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import type { Ctx2D } from '../ctx'

/** Vite resolves all URLs at build time. The browser only fetches a bitmap when it is used. */
const urls = import.meta.glob('../../../assets/es2/production/{enemies,bosses,biomes,ui}/*.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

/** Preview assets stay out of production; visual QA and explicit opt-in are required. */
const bossQaLoaders = import.meta.env.DEV
  ? import.meta.glob('../../../assets/es2/production/bosses/candidates/*-QA-PENDING.webp', {
    query: '?url', import: 'default',
  }) as Record<string, () => Promise<string>>
  : {}
const bossQaInsets = new WeakMap<HTMLImageElement, number>()

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
    id, { ground: src('biomes', id + '-ground'), decor: src('biomes', id + '-decor'), scene: src('biomes', id + '-scene') },
  ])) as Record<BiomeId, { ground: string; decor: string; scene: string }>,
  ui: Object.fromEntries(WORLD_UI_IDS.map(id => [id, src('ui', id)])) as Record<WorldUiId, string>,
})

export interface WorldRuntimeImages {
  /** Reuse authored treasure art in live world events. */
  chest: HTMLImageElement
  bosses: Record<BossId, HTMLImageElement>
  ground: Record<BiomeId, HTMLImageElement>
  decor: Record<BiomeId, HTMLImageElement>
}

/** Allocate world and common treasure images once on engine mount, never during rAF. */
export function loadWorldRuntimeImages(makeImage: () => HTMLImageElement = () => new Image(), reviewBossId?: BossId): WorldRuntimeImages {
  const load = (url: string): HTMLImageElement => {
    const image = makeImage()
    image.src = url
    return image
  }
  const loadBoss = (id: BossId): HTMLImageElement => {
    const candidatePath = `../../../assets/es2/production/bosses/candidates/${id}-phases-native3x-QA-PENDING.webp`
    const image = load(WORLD_ART.bosses[id])
    const loadCandidate = import.meta.env.DEV && reviewBossId === id ? bossQaLoaders[candidatePath] : undefined
    if (loadCandidate) {
      void loadCandidate().then(url => {
        bossQaInsets.set(image, 16)
        image.src = url
      }).catch(() => {
        // Keep the authored legacy image if an isolated dev-only candidate cannot load.
        bossQaInsets.delete(image)
      })
    }
    return image
  }
  return {
    chest: load(WORLD_ART.ui['treasure-common']),
    bosses: Object.fromEntries((Object.keys(WORLD_ART.bosses) as BossId[]).map(id =>
      [id, loadBoss(id)])) as Record<BossId, HTMLImageElement>,
    ground: Object.fromEntries(BIOME_IDS.map(id =>
      [id, load(WORLD_ART.biomes[id].ground)])) as Record<BiomeId, HTMLImageElement>,
    decor: Object.fromEntries(BIOME_IDS.map(id =>
      [id, load(WORLD_ART.biomes[id].decor)])) as Record<BiomeId, HTMLImageElement>,
  }
}

export function drawProductionBossFrame(
  ctx: Ctx2D, image: HTMLImageElement, phase: 1 | 2 | 3, width: number, height: number,
  sourceInset?: number,
): boolean {
  if (!image.complete || image.naturalHeight < 192 || image.naturalWidth !== image.naturalHeight * 3 || !Number.isInteger(phase) || phase < 1 || phase > 3) return false
  const inset = sourceInset ?? bossQaInsets.get(image) ?? 0
  const side = Math.min(width, height)
  const sourceSide = image.naturalHeight - inset * 2
  if (!Number.isFinite(side) || side <= 0 || !Number.isInteger(inset) || inset < 0 || sourceSide <= 0) return false
  ctx.drawImage(
    image, (phase - 1) * image.naturalHeight + inset, inset, sourceSide, sourceSide,
    -side / 2, -side + 4, side, side,
  )
  return true
}

export function drawProductionEnemyFrame(
  ctx: Ctx2D, image: HTMLImageElement, frame: number, width: number, height: number,
): boolean {
  if (!image.complete || image.naturalHeight < 96 || image.naturalWidth !== image.naturalHeight * 6 || !Number.isFinite(frame)) return false
  const slot = Math.max(0, Math.min(5, Math.floor(frame)))
  const side = Math.min(width, height)
  if (!Number.isFinite(side) || side <= 0) return false
  const sourceSide = image.naturalHeight
  ctx.drawImage(image, slot * sourceSide, 0, sourceSide, sourceSide, -side / 2, -side + 4, side, side)
  return true
}
