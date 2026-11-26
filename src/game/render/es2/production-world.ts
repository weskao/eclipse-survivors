import { BIOME_IDS, type BiomeId } from '../../content/biomes'
import { BOSS_DEFINITIONS, type BossId } from '../../content/bosses/definitions'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import type { Ctx2D } from '../ctx'
import { bossPhaseVisualScale, measureBossPhaseLayouts, type BossPhaseLayout } from './boss-phase-layout'
export { BOSS_BASE_DRAW_PX, bossPhaseVisualScale } from './boss-phase-layout'
import { BOSS_NATIVE_KEYFRAMES, registerBossNativeKeyframe, type NativeBossKeyframe } from './boss-native-keyframes'

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
const bossLayouts = new WeakMap<HTMLImageElement, { src: string; cell: number; inset: number; phases: readonly BossPhaseLayout[] }>()

/** Cache only three small geometry records per decoded atlas; invalidate on source swap. */
export function cacheBossPhaseLayouts(image: HTMLImageElement, rgba: Uint8ClampedArray, inset = 0): void {
  bossLayouts.delete(image)
  const cell = image.naturalHeight
  if (image.naturalWidth !== cell * 3) return
  const phases = measureBossPhaseLayouts(rgba, cell, inset)
  if (phases) bossLayouts.set(image, { src: image.src, cell, inset, phases })
}

export function bossFrameLayout(image: HTMLImageElement, phase: 1 | 2 | 3, sourceInset?: number): BossPhaseLayout | undefined {
  const cached = bossLayouts.get(image)
  const inset = sourceInset ?? (image.naturalHeight === 756 ? bossQaInsets.get(image) ?? 0 : 0)
  return cached && cached.src === image.src && cached.cell === image.naturalHeight && cached.inset === inset
    ? cached.phases[phase - 1] : undefined
}

function prepareBossPhaseLayouts(image: HTMLImageElement): void {
  bossLayouts.delete(image)
  const cell = image.naturalHeight
  if (!image.complete || cell < 192 || image.naturalWidth !== cell * 3 || typeof document === 'undefined') return
  // A temporary readback canvas is created only on image decode, not during combat frames.
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth; canvas.height = cell
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(image, 0, 0)
    cacheBossPhaseLayouts(image, ctx.getImageData(0, 0, canvas.width, cell).data,
      cell === 756 ? bossQaInsets.get(image) ?? 0 : 0)
    canvas.width = canvas.height = 0
  } catch { /* Preserve the original phase rendering if pixel readback is unavailable. */ }
}
// Isolated reference atlases are loaded only for an explicit development motion review.
const bossMotionSourceLoaders = import.meta.env.DEV
  ? import.meta.glob('../../../assets/es2/production/bosses/candidates/motion/*-attack-source-reference.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>
  : {}

// Raw uploaded sheets are intentionally isolated in an explicit DEV reference mode.
const bossSheetQaLoaders = import.meta.env.DEV
  ? import.meta.glob('../../../assets/es2/production/bosses/candidates/motion/spritesheets/*-spritesheet-7x4-QA-PENDING.png', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>
  : {}

// Native source candidates are opt-in DEV diagnostics, never release assets.
const bossNativeQaLoaders = import.meta.env.DEV
  ? import.meta.glob('../../../assets/es2/production/bosses/candidates/motion/native-keyframes/batch-*/*/**/*.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>
  : {}

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

/** Player-facing labels for the review gallery; asset IDs remain unchanged for gameplay and QA. */
export const WORLD_UI_LABELS: Record<WorldUiId, string> = {
  'treasure-common': '普通寶箱',
  'treasure-rare': '稀有寶箱',
  'treasure-legendary': '傳說寶箱',
  'treasure-cursed': '詛咒寶箱',
  'rarity-common': '普通品質徽記',
  'rarity-rare': '稀有品質徽記',
  'rarity-legendary': '傳說品質徽記',
  'hud-health': '生命值圖示',
  'hud-xp': '經驗值圖示',
  'hud-cooldown': '冷卻時間圖示',
  'hud-quest': '任務目標圖示',
  'achievement-boss': '首領討伐徽章',
  'achievement-survivor': '生存達人徽章',
  'achievement-evolution': '能力進化徽章',
  'achievement-explorer': '冒險探索徽章',
  'achievement-collector': '收藏家徽章',
  'achievement-flawless': '完美挑戰徽章',
}


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
  bossMotionReference?: { id: BossId; image: HTMLImageElement }
  bossNativeKeyframes?: Partial<Record<NativeBossKeyframe, HTMLImageElement>>
  ground: Record<BiomeId, HTMLImageElement>
  decor: Record<BiomeId, HTMLImageElement>
}

/** Allocate world and common treasure images once on engine mount, never during rAF. */
export function loadWorldRuntimeImages(makeImage: () => HTMLImageElement = () => new Image(), reviewBossId?: BossId, reviewMotion: boolean | 'sheet' | 'native' = false): WorldRuntimeImages {
  const load = (url: string): HTMLImageElement => {
    const image = makeImage()
    image.src = url
    return image
  }
  const loadBoss = (id: BossId): HTMLImageElement => {
    const candidatePath = `../../../assets/es2/production/bosses/candidates/${id}-phases-native3x-QA-PENDING.webp`
    const image = makeImage()
    image.onload = () => prepareBossPhaseLayouts(image)
    image.src = WORLD_ART.bosses[id]
    const loadCandidate = import.meta.env.DEV && reviewMotion !== 'native' && reviewBossId === id ? bossQaLoaders[candidatePath] : undefined
    if (loadCandidate) {
      void loadCandidate().then(url => {
        image.onerror = () => {
          // A failed candidate must restore the actual authored boss atlas, not a blank bitmap.
          image.onerror = null
          bossQaInsets.delete(image)
          image.src = WORLD_ART.bosses[id]
        }
        bossQaInsets.set(image, 16)
        image.src = url
      }).catch(() => {
        // Keep the authored legacy image if an isolated dev-only candidate cannot load.
        bossQaInsets.delete(image)
      })
    }
    return image
  }
  let bossMotionReference: WorldRuntimeImages['bossMotionReference']
  let bossNativeKeyframes: WorldRuntimeImages['bossNativeKeyframes']
  if (import.meta.env.DEV && reviewMotion === 'native' && reviewBossId) {
    for (const key of Object.keys(BOSS_NATIVE_KEYFRAMES) as NativeBossKeyframe[]) {
      const [path] = BOSS_NATIVE_KEYFRAMES[key]
      if (!path.includes(`/${reviewBossId}/`)) continue
      const loadSource = bossNativeQaLoaders['../../../assets/es2/production/bosses/candidates/motion/native-keyframes/' + path]
      if (!loadSource) continue
      const image = makeImage()
      registerBossNativeKeyframe(image, key)
      (bossNativeKeyframes ??= {})[key] = image
      void loadSource().then(url => { image.src = url }).catch(() => { /* static fallback */ })
    }
  } else if (import.meta.env.DEV && reviewMotion && reviewMotion !== 'native' && reviewBossId) {
    const path = '../../../assets/es2/production/bosses/candidates/motion/' + reviewBossId + '-attack-source-reference.webp'
    const sheetPath = '../../../assets/es2/production/bosses/candidates/motion/spritesheets/' + reviewBossId + '-spritesheet-7x4-QA-PENDING.png'
    const loadSource = reviewMotion === 'sheet' ? bossSheetQaLoaders[sheetPath] : bossMotionSourceLoaders[path]
    if (loadSource) {
      const image = makeImage()
      bossMotionReference = { id: reviewBossId, image }
      void loadSource().then(url => { image.src = url }).catch(() => { /* static fallback */ })
    }
  }
  return {
    bossMotionReference,
    bossNativeKeyframes,
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
  const inset = sourceInset ?? (image.naturalHeight === 756 ? bossQaInsets.get(image) ?? 0 : 0)
  const base = Math.min(width, height)
  const layout = bossFrameLayout(image, phase, inset)
  const side = base * (layout?.scale ?? bossPhaseVisualScale(phase))
  const sourceSide = image.naturalHeight - inset * 2
  if (!Number.isFinite(side) || side <= 0 || !Number.isInteger(inset) || inset < 0 || sourceSide <= 0) return false
  ctx.drawImage(
    image, (phase - 1) * image.naturalHeight + inset, inset, sourceSide, sourceSide,
    layout ? base * layout.x : -side / 2, layout ? 4 + base * layout.y : 4 - side, side, side,
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
