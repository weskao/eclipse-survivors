import type { SpecializationId } from '../../content/heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'
import type { HeroSheets } from '../hero-sheets'
import { drawPortraitMotion } from './portrait-motion'
import { CHARACTER_FOOT_BOTTOMS } from './character-foot-anchors'
import { HERO_CANDIDATE_ATLASES, HERO_DIAGONAL_RUN_ATLASES } from './hero-candidate-atlas'
import summonerSouthManifest from '../../../assets/es2/production/heroes/spirit-summoner/candidates/south-2026-11-24-mist-repair/manifest.json'
import shadowSouthManifest from '../../../assets/es2/production/heroes/shadowblade/candidates/south-2026-11-24-batch-2/manifest.json'
import paladinSouthManifest from '../../../assets/es2/production/heroes/crimson-paladin/candidates/south-2026-11-24-batch-2/manifest.json'
import shadowblade from '../../../assets/es2/production/heroes/shadowblade-portrait@3x.webp'
import summoner from '../../../assets/es2/production/heroes/spirit-summoner-portrait@3x.webp'
import paladin from '../../../assets/es2/production/heroes/crimson-paladin-portrait@3x.webp'
import shadowAction from '../../../assets/es2/production/heroes/shadowblade-run-attack@3x.webp'
import summonerAction from '../../../assets/es2/production/heroes/spirit-summoner-run-attack@3x.webp'
import paladinAction from '../../../assets/es2/production/heroes/crimson-paladin-run-attack@3x.webp'
import shadowMotion from '../../../assets/es2/production/heroes/shadowblade-8dir-motion@3x.webp'
import summonerMotion from '../../../assets/es2/production/heroes/spirit-summoner-8dir-motion@3x.webp'
import paladinMotion from '../../../assets/es2/production/heroes/crimson-paladin-8dir-motion@3x.webp'
import shadowDirection from '../../../assets/es2/production/heroes/shadowblade/idle-ready@3x.webp'
import shadowRunAttack from '../../../assets/es2/production/heroes/shadowblade/run-attack@3x.webp'
import shadowSpecial from '../../../assets/es2/production/heroes/shadowblade/special@3x.webp'
import summonerDirection from '../../../assets/es2/production/heroes/spirit-summoner/idle-ready@3x.webp'
import summonerRunAttack from '../../../assets/es2/production/heroes/spirit-summoner/run-attack@3x.webp'
import summonerSpecial from '../../../assets/es2/production/heroes/spirit-summoner/special@3x.webp'
import paladinDirection from '../../../assets/es2/production/heroes/crimson-paladin/idle-ready@3x.webp'
import paladinRunAttack from '../../../assets/es2/production/heroes/crimson-paladin/run-attack@3x.webp'
import paladinSpecial from '../../../assets/es2/production/heroes/crimson-paladin/special@3x.webp'
import shadowSouthRun from '../../../assets/es2/production/heroes/shadowblade/candidates/south-2026-11-24-batch-2/run-south-4frames@3x.webp'
import summonerSouthRun from '../../../assets/es2/production/heroes/spirit-summoner/candidates/south-2026-11-24-mist-repair/run-south-4frames@3x.webp'
import paladinSouthRun from '../../../assets/es2/production/heroes/crimson-paladin/candidates/south-2026-11-24-batch-2/run-south-4frames@3x.webp'

/** Full 900×900 3x character illustrations, matching the homepage and HUD. */
export const PRODUCTION_HERO_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade,
  'spirit-summoner': summoner,
  'crimson-paladin': paladin,
})

/** Separate authored 8-frame right-facing motion strip for each existing 8-direction hero. */
export const PRODUCTION_HERO_ACTION_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade: shadowAction,
  'spirit-summoner': summonerAction,
  'crimson-paladin': paladinAction,
})

export const PRODUCTION_HERO_MOTION_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade: shadowMotion,
  'spirit-summoner': summonerMotion,
  'crimson-paladin': paladinMotion,
})

type PoseSheet = 'direction' | 'action' | 'special'
export const PRODUCTION_HERO_POSE_SOURCES: Readonly<Record<SpecializationId, Readonly<Record<PoseSheet, string>>>> = Object.freeze({
  shadowblade: { direction: shadowDirection, action: shadowRunAttack, special: shadowSpecial },
  'spirit-summoner': { direction: summonerDirection, action: summonerRunAttack, special: summonerSpecial },
  'crimson-paladin': { direction: paladinDirection, action: paladinRunAttack, special: paladinSpecial },
})
/** Existing committed four-pose sources; dev-only gameplay QA, never release art. */
export const PRODUCTION_HERO_SOUTH_RUN_SOURCES: Readonly<Record<SpecializationId, string>> = Object.freeze({
  shadowblade: shadowSouthRun,
  'spirit-summoner': summonerSouthRun,
  'crimson-paladin': paladinSouthRun,
})

type AtlasWithAction = HTMLImageElement & { actionStrip?: HTMLImageElement }
type HeroWithMotion = AtlasWithAction & {
  heroId?: SpecializationId
  motionAtlas?: HTMLImageElement
  motionAtlasUrl?: string
  motionAtlasFactory?: () => HTMLImageElement
  poseAtlasSources?: Readonly<Record<PoseSheet, string>>
  poseAtlases?: Partial<Record<PoseSheet, HTMLImageElement>>
  qaSouthRunUrl?: string
  qaSouthRunAtlas?: HTMLImageElement
  qaDiagonalSources?: Partial<Record<1 | 3, { url: string; footBottoms: readonly number[] }>>
  qaDiagonalAtlases?: Partial<Record<1 | 3, HTMLImageElement>>
  qaEastSources?: Partial<Record<'run' | 'attack' | 'special', string>>
  qaEastAtlases?: Partial<Record<'run' | 'attack' | 'special', HTMLImageElement>>
}

export function productionHeroMotionReady(image: HTMLImageElement | undefined): boolean {
  const atlas = (image as HeroWithMotion | undefined)?.motionAtlas
  return !!atlas?.complete && atlas.naturalWidth === 3072 && atlas.naturalHeight === 1920
}

/** Start decoding only for the selected hero. Never allocate or load an atlas per frame. */
function loadHeroMotionOnDemand(image: HeroWithMotion): HTMLImageElement | null {
  if (!image.motionAtlas && image.motionAtlasUrl) {
    const atlas = image.motionAtlasFactory ? image.motionAtlasFactory() : new Image()
    image.motionAtlas = atlas
    atlas.src = image.motionAtlasUrl
  }
  return productionHeroMotionReady(image) ? image.motionAtlas! : null
}
export type ProductionHeroArtwork = Record<SpecializationId, HTMLImageElement>

export function loadProductionHeroes(
  makeImage: () => HTMLImageElement = () => new Image(),
  enableSouthRunQA = import.meta.env.DEV && typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('es2HeroSouthQA') === '1' ||
      new URLSearchParams(window.location.search).get('es2HeroArtQA') === '1'),
): ProductionHeroArtwork {
  const result = {} as ProductionHeroArtwork
  for (const id of Object.keys(PRODUCTION_HERO_SOURCES) as SpecializationId[]) {
    const image = makeImage() as HeroWithMotion
    image.src = PRODUCTION_HERO_SOURCES[id]
    image.heroId = id
    image.poseAtlasSources = PRODUCTION_HERO_POSE_SOURCES[id]
    image.poseAtlases = {}
    image.motionAtlasFactory = makeImage
    if (enableSouthRunQA) {
      image.qaSouthRunUrl = PRODUCTION_HERO_SOUTH_RUN_SOURCES[id]
      image.qaDiagonalSources = {}
      for (const clip of HERO_DIAGONAL_RUN_ATLASES)
        if (clip.hero === id) image.qaDiagonalSources[clip.direction === 'SE' ? 1 : 3] = clip
      image.qaDiagonalAtlases = {}
      const east: Partial<Record<'run' | 'attack' | 'special', string>> = {}
      for (const clip of HERO_CANDIDATE_ATLASES)
        if (clip.hero === id && clip.direction === 'E') east[clip.pose] = clip.url
      image.qaEastSources = east
      image.qaEastAtlases = {}
    }
    result[id] = image
  }
  return result
}

/** Exact 448px action-strip indexing, never read from a neighbor cell. */
export function productionHeroActionFrame(anim: HeroAnimation): number {
  if (anim.reducedMotion) return 0
  if (anim.pose === 'run' || anim.pose === 'dash')
    return Math.abs(Math.floor(anim.frame)) % 3
  if (anim.pose === 'attack' || anim.pose === 'cast')
    return 3 + Math.min(4, Math.floor(Math.max(0, Math.min(0.9999, anim.phase)) * 5))
  return 0
}

/** Four-frame QA footage for a selected southern facing; defaults to South for existing callers. */
export function productionHeroSouthRunRect(anim: HeroAnimation, facing: 1 | 2 | 3 = 2): { x: number; y: number; size: 768 } | null {
  const direction = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  if (anim.reducedMotion || direction !== facing || (anim.pose !== 'run' && anim.pose !== 'dash') ||
    !Number.isFinite(anim.frame) || !Number.isFinite(anim.count)) return null
  const count = Math.max(1, anim.count)
  const index = Math.min(3, Math.floor(Math.max(0, anim.frame) * 4 / count) % 4)
  return { x: (index % 2) * 768, y: Math.floor(index / 2) * 768, size: 768 }
}

/** Exactly nine East QA clips: 3 heroes × run/attack/special. Never mirror for West. */
export function productionHeroQAEastRect(anim: HeroAnimation): {
  pose: 'run' | 'attack' | 'special'; rect: { x: number; y: number; size: 704 }
} | null {
  const direction = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  if (anim.reducedMotion || direction !== 0) return null
  const running = anim.pose === 'run' || anim.pose === 'dash'
  if (!running && anim.pose !== 'attack' && anim.pose !== 'cast') return null
  if (running && (!Number.isFinite(anim.frame) || !Number.isFinite(anim.count))) return null
  if (!running && !Number.isFinite(anim.phase)) return null
  const pose = running ? 'run' : anim.special ? 'special' : 'attack'
  const index = running
    ? Math.min(3, Math.floor(Math.max(0, anim.frame) * 4 / Math.max(1, anim.count)) % 4)
    : Math.min(3, Math.floor(Math.max(0, Math.min(0.999999, anim.phase)) * 4))
  return { pose, rect: { x: (index % 2) * 704, y: Math.floor(index / 2) * 704, size: 704 } }
}

/** Legacy 4×96-pixel strips remain supported for existing fallback tests and consumers. */
export function productionHeroFrame(anim: HeroAnimation): number {
  if (anim.reducedMotion) return 0
  switch (anim.pose) {
    case 'attack':
    case 'cast':
      return anim.phase < 0.55 ? 2 : 3
    case 'dash':
      return 1
    case 'run':
      return Math.floor(anim.frame / 2) % 2
    case 'hurt':
    case 'death':
      return 3
    default:
      return 0
  }
}

export interface ProductionHeroSourceRect {
  readonly x: number
  readonly y: number
  readonly width: 128
  readonly height: 128
}

/**
 * Exact per-cell crop, no adjacent frame interpolation or fake left/right flip.
 * Hurt/death/victory intentionally use the already-authored legacy fallback,
 * since their eight-direction artwork is not supplied by this source atlas.
 */
export function productionHeroDirectionRect(anim: HeroAnimation): ProductionHeroSourceRect | null {
  const row = anim.reducedMotion ? 0 :
    anim.pose === 'idle' ? 0 :
      anim.pose === 'run' || anim.pose === 'dash' ? 1 :
        anim.pose === 'attack' ? 2 :
          anim.pose === 'cast' ? 3 : -1
  if (row < 0) return null
  const dir = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  return { x: dir * 128, y: row * 128, width: 128, height: 128 }
}

/**
 * Source artwork is an 8×5 grid of independently isolated 384px cells.
 * Artist's direction columns are W, SW, S, SE, E, NE, N, NW.
 * The three eight-frame motion rows are EAST-facing only; W may mirror
 * those strips, while other octants keep their individually authored
 * direction-specific ready sprite instead of snapping toward the camera.
 */
export function productionHeroMotionRect(anim: HeroAnimation): { x: number; y: number; width: 384; height: 384; mirror: boolean } {
  const direction = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  const directionColumn = (4 - direction + 8) % 8
  const eastOrWest = direction === 0 || direction === 4
  const activity = anim.pose === 'run' || anim.pose === 'dash' ||
    anim.pose === 'attack' || anim.pose === 'cast'
  let row = 0
  let column = directionColumn
  let mirror = false
  if (!anim.reducedMotion && activity) {
    if (eastOrWest) {
      row = anim.pose === 'run' || anim.pose === 'dash' ? 2 : anim.special ? 4 : 3
      const progress = row === 2 ? Math.max(0, Math.floor(anim.frame)) / Math.max(1, anim.count)
        : Math.max(0, Math.min(0.9999, anim.phase))
      column = Math.min(7, Math.floor((progress % 1) * 8))
      mirror = direction === 4
    } else {
      // These six directions have only authored idle and guard images.
      // Do not label the right-facing eight-frame strip as a true eight-way run.
      row = anim.pose === 'run' || anim.pose === 'dash'
        ? Math.floor(anim.frame) % 2 : 1
    }
  }
  return { x: column * 384, y: row * 384, width: 384, height: 384, mirror }
}

function drawHeroMotionAtlas(
  ctx: Ctx2D, atlas: HTMLImageElement, anim: HeroAnimation, width: number, height: number,
): void {
  const rect = productionHeroMotionRect(anim)
  const paintedWidth = width * 1.16
  const paintedHeight = height * 1.05
  ctx.save()
  if (rect.mirror) ctx.scale(-1, 1)
  // Small continuous movement for octants with only two original direction poses.
  if (!anim.reducedMotion && rect.y < 2 * 384 &&
    (anim.pose === 'run' || anim.pose === 'dash' || anim.pose === 'attack' || anim.pose === 'cast')) {
    const cycle = anim.pose === 'run' || anim.pose === 'dash'
      ? anim.frame / Math.max(1, anim.count) : anim.phase
    ctx.translate(0, -Math.sin(cycle * Math.PI) * 1.6)
  }
  ctx.drawImage(atlas, rect.x, rect.y, rect.width, rect.height,
    -paintedWidth / 2, 4 - paintedHeight, paintedWidth, paintedHeight)
  ctx.restore()
}

/**
 * The new split contact sheets have strict integer 448px source cells and
 * transparent 8px gutters per side. Direction order E,SE,S,SW,W,NW,N,NE is
 * arranged 4×2 (row 0/1 idle, row 2/3 guard). Only east has authored
 * 8-frame running/attack/special sequences. West can mirror those frames;
 * other directions hold the correct independent guard silhouette without
 * the old alternating idle/guard flicker or borrowed side-facing images.
 */
export function productionHeroPoseRect(anim: HeroAnimation): {
  sheet: PoseSheet; x: number; y: number; width: 448; height: 448; mirror: boolean
} {
  const direction = Number.isFinite(anim.direction)
    ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
  const sourceColumn = direction
  const directional = (active: boolean) => {
    const cell = sourceColumn + (active ? 8 : 0)
    return { sheet: 'direction' as const, x: (cell % 4) * 448,
      y: Math.floor(cell / 4) * 448, width: 448 as const, height: 448 as const, mirror: false }
  }
  if (anim.reducedMotion || anim.pose === 'idle' ||
    anim.pose === 'hurt' || anim.pose === 'death' || anim.pose === 'victory')
    return directional(false)
  if (direction !== 0 && direction !== 4) return directional(true)
  const running = anim.pose === 'run' || anim.pose === 'dash'
  const frame = running
    ? Math.min(7, Math.floor(Math.max(0, anim.frame) * 8 / Math.max(1, anim.count)))
    : Math.min(7, Math.floor(Math.max(0, Math.min(0.999999, anim.phase)) * 8))
  const sheet: PoseSheet = !running && anim.special ? 'special' : 'action'
  const cell = sheet === 'action' && !running ? frame + 8 : frame
  return { sheet, x: (cell % 4) * 448, y: Math.floor(cell / 4) * 448,
    width: 448, height: 448, mirror: direction === 4 }
}

function readyPoseAtlas(atlas: HTMLImageElement | undefined, sheet: PoseSheet): atlas is HTMLImageElement {
  return !!atlas?.complete && atlas.naturalWidth === 1792 &&
    atlas.naturalHeight === (sheet === 'special' ? 896 : 1792)
}

/** The split-sheet pipeline owns its facing, including while the first image decodes. */
export function productionHeroUsesPoseSheets(image: HTMLImageElement | undefined): boolean {
  return !!(image as HeroWithMotion | undefined)?.poseAtlasSources
}

/** True only after a matching, correctly-sized directional pose has decoded.
 * Until then the homepage portrait remains the fallback and may need mirroring.
 */
export function productionHeroPoseReady(image: HTMLImageElement | undefined, anim: HeroAnimation): boolean {
  const hero = image as HeroWithMotion | undefined
  if (!hero?.poseAtlases) return false
  const rect = productionHeroPoseRect(anim)
  return readyPoseAtlas(hero.poseAtlases[rect.sheet], rect.sheet) ||
    (rect.sheet !== 'direction' && readyPoseAtlas(hero.poseAtlases.direction, 'direction'))
}

/** Lazy-load only the selected hero's needed sheet. No per-frame Image allocation. */
function loadHeroPoseOnDemand(hero: HeroWithMotion, sheet: PoseSheet): HTMLImageElement | null {
  if (!hero.poseAtlases) hero.poseAtlases = {}
  let atlas = hero.poseAtlases[sheet]
  if (!atlas && hero.poseAtlasSources) {
    atlas = hero.motionAtlasFactory ? hero.motionAtlasFactory() : new Image()
    hero.poseAtlases[sheet] = atlas
    atlas.src = hero.poseAtlasSources[sheet]
  }
  return readyPoseAtlas(atlas, sheet) ? atlas : null
}

const SOUTH_QA_FOOT_BOTTOMS: Partial<Record<SpecializationId, readonly number[]>> = {
  shadowblade: shadowSouthManifest.footBottoms,
  'spirit-summoner': summonerSouthManifest.footBottoms,
  'crimson-paladin': paladinSouthManifest.footBottoms,
}

type PoseRect = ReturnType<typeof productionHeroPoseRect>
type SmoothFrame = { type: 'atlas'; atlas: HTMLImageElement; rect: PoseRect; anchor: number }
  | { type: 'candidate'; atlas: HTMLImageElement; rect: { x: number; y: number; size: 704 | 768 }; anchor?: number }
  | { type: 'portrait'; atlas: HTMLImageElement; anim: HeroAnimation }

interface PoseTransition {
  current: SmoothFrame
  prior?: SmoothFrame
  pose: HeroAnimation['pose']
  direction: number
  startedAt: number
  duration: number
  lastAt: number
}

/** Weak keys are the selected hero's decoded portrait; no unbounded run history. */
const poseTransitions = new WeakMap<HTMLImageElement, PoseTransition>()

/** Measured opaque-bottom pixel for this exact frame. No per-frame image scanning. */
export function productionHeroFrameAnchor(image: HTMLImageElement, rect: PoseRect): number {
  const id = (image as HeroWithMotion).heroId
  const offsets = id ? CHARACTER_FOOT_BOTTOMS[id]?.[rect.sheet] : undefined
  const index = (rect.y / 448) * 4 + rect.x / 448
  return offsets?.[index] ?? 448
}

function drawHeroPoseAtlas(
  ctx: Ctx2D, atlas: HTMLImageElement, rect: PoseRect,
  width: number, height: number, footBottom = 448,
): void {
  const paintedWidth = Math.min(width * 1.16, 147)
  const paintedHeight = Math.min(height * 1.05, 147)
  ctx.save()
  if (rect.mirror) ctx.scale(-1, 1)
  // Every sheet has different transparent padding. Use the real body foot
  // instead of the full 448px cell bottom, or each pose snaps vertically.
  // The authored 448px cells have 8px transparent gutters. Exclude them
  // from Canvas source sampling so bilinear filtering cannot borrow pixels
  // from the adjacent direction/pose; preserve the exact original footprint
  // and world-space opaque-foot anchor.
  const gutter = 8
  const content = 448 - 2 * gutter
  const scaleX = paintedWidth / 448
  const scaleY = paintedHeight / 448
  ctx.drawImage(atlas, rect.x + gutter, rect.y + gutter, content, content,
    -paintedWidth / 2 + gutter * scaleX,
    4 - footBottom * scaleY + gutter * scaleY,
    content * scaleX, content * scaleY)
  ctx.restore()
}

function drawSmoothFrame(ctx: Ctx2D, frame: SmoothFrame, width: number, height: number): void {
  if (frame.type === 'atlas') drawHeroPoseAtlas(ctx, frame.atlas, frame.rect, width, height, frame.anchor)
  else if (frame.type === 'candidate') {
    // Original 627px source frame is padded (never resampled) to 704px or 768px.
    // Maintain a 147px visible silhouette; this is dev QA, not signed-off art.
    const cell = frame.rect.size
    const paintedWidth = Math.min(width * 1.16, 147) * cell / 627
    const paintedHeight = Math.min(height * 1.05, 147) * cell / 627
    const footBottom = frame.anchor ?? (cell - 627) / 2 + 600
    ctx.save()
    ctx.drawImage(frame.atlas, frame.rect.x, frame.rect.y, cell, cell,
      -paintedWidth / 2, 4 - paintedHeight * footBottom / cell, paintedWidth, paintedHeight)
    ctx.restore()
  } else {
    // Canonical portraits only face right. During a pending west-facing sheet,
    // mirror the portrait here, not in the outer scene, so the blend does not
    // flip the same hero twice when the directional WebP finishes loading.
    ctx.save()
    if (frame.anim.direction > 2 && frame.anim.direction < 6) ctx.scale(-1, 1)
    drawPortraitMotion(ctx, frame.atlas, frame.anim, width, height)
    ctx.restore()
  }
}

/** 45ms between adjacent frames; 120ms for a different pose/heading/source.
 * Alpha is restored even with test contexts without a real Canvas state stack.
 */
function drawSmoothedHero(
  ctx: Ctx2D, portrait: HTMLImageElement, frame: SmoothFrame, anim: HeroAnimation,
  width: number, height: number, timeSeconds: number | undefined,
): void {
  if (anim.reducedMotion || timeSeconds === undefined || !Number.isFinite(timeSeconds)) {
    poseTransitions.delete(portrait)
    drawSmoothFrame(ctx, frame, width, height)
    return
  }
  const previous = poseTransitions.get(portrait)
  if (!previous || timeSeconds < previous.lastAt || timeSeconds - previous.lastAt > 0.5) {
    poseTransitions.set(portrait, { current: frame, pose: anim.pose, direction: anim.direction,
      lastAt: timeSeconds, startedAt: timeSeconds, duration: 0 })
    drawSmoothFrame(ctx, frame, width, height)
    return
  }
  const a = previous.current, b = frame
  const changed = a.type !== b.type || a.atlas !== b.atlas || (
    a.type === 'atlas' && b.type === 'atlas' &&
    (a.rect.x !== b.rect.x || a.rect.y !== b.rect.y || a.rect.mirror !== b.rect.mirror)) || (
    a.type === 'candidate' && b.type === 'candidate' &&
    (a.rect.x !== b.rect.x || a.rect.y !== b.rect.y))
  if (changed) {
    const poseOrDirection = previous.pose !== anim.pose || previous.direction !== anim.direction
      || a.type !== b.type || (a.type === 'atlas' && b.type === 'atlas' && a.rect.sheet !== b.rect.sheet)
    // For frame-by-frame movement use a short overlap. New directional silhouettes
    // receive more easing but never change the hero's world position/hitbox.
    previous.prior = a
    previous.current = b
    previous.startedAt = timeSeconds - Math.min(Math.max(0, timeSeconds - previous.lastAt), 0.012)
    previous.duration = poseOrDirection ? 0.12 : 0.045
  } else previous.current = b
  previous.pose = anim.pose
  previous.direction = anim.direction
  previous.lastAt = timeSeconds
  if (!previous.prior || previous.duration === 0) {
    drawSmoothFrame(ctx, b, width, height)
    return
  }
  const mix = Math.max(0, Math.min(1, (timeSeconds - previous.startedAt) / previous.duration))
  if (mix >= 1) {
    previous.prior = undefined
    drawSmoothFrame(ctx, b, width, height)
    return
  }
  const originalAlpha = ctx.globalAlpha
  ctx.globalAlpha = originalAlpha * (1 - mix)
  drawSmoothFrame(ctx, previous.prior, width, height)
  ctx.globalAlpha = originalAlpha * mix
  drawSmoothFrame(ctx, b, width, height)
  ctx.globalAlpha = originalAlpha
}

export function drawProductionHeroFrame(
  ctx: Ctx2D, image: HTMLImageElement, anim: HeroAnimation, width: number, height: number,
  heroSheets?: HeroSheets, frameTimeSeconds?: number,
): boolean {
  if (!image.complete) return false
  // Like the original three heroes, compose animation from a single sharp
  // illustration instead of enlarging a tiny 128px figure. The generated
  // 3x Canvas cache is bounded and reused across frames.
  if (image.naturalWidth === 900 && image.naturalHeight === 900) {
    const hero = image as HeroWithMotion
    const eastQA = hero.qaEastSources ? productionHeroQAEastRect(anim) : null
    if (eastQA && hero.qaEastSources?.[eastQA.pose]) {
      const atlases = hero.qaEastAtlases ?? (hero.qaEastAtlases = {})
      let atlas = atlases[eastQA.pose]
      if (!atlas) {
        atlas = hero.motionAtlasFactory ? hero.motionAtlasFactory() : new Image()
        atlases[eastQA.pose] = atlas
        atlas.src = hero.qaEastSources[eastQA.pose]!
      }
      if (atlas.complete && atlas.naturalWidth === 1408 && atlas.naturalHeight === 1408) {
        drawSmoothedHero(ctx, image, { type: 'candidate', atlas, rect: eastQA.rect },
          anim, width, height, frameTimeSeconds)
        return true
      }
    }
    const facing = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
    const diagonal = facing === 1 || facing === 3 ? facing : undefined
    const clip = diagonal === undefined ? undefined : hero.qaDiagonalSources?.[diagonal]
    const qaRect = clip && diagonal !== undefined ? productionHeroSouthRunRect(anim, diagonal)
      : hero.qaSouthRunUrl ? productionHeroSouthRunRect(anim) : null
    if (qaRect) {
      const diagonalCache = clip && diagonal !== undefined ? (hero.qaDiagonalAtlases ??= {}) : undefined
      let qaAtlas = diagonalCache && diagonal !== undefined ? diagonalCache[diagonal] : hero.qaSouthRunAtlas
      if (!qaAtlas) {
        qaAtlas = hero.motionAtlasFactory ? hero.motionAtlasFactory() : new Image()
        if (diagonalCache && diagonal !== undefined) diagonalCache[diagonal] = qaAtlas
        else hero.qaSouthRunAtlas = qaAtlas
        qaAtlas.src = clip?.url ?? hero.qaSouthRunUrl!
      }
      if (qaAtlas.complete && qaAtlas.naturalWidth === 1536 && qaAtlas.naturalHeight === 1536) {
        const index = qaRect.x / qaRect.size + 2 * qaRect.y / qaRect.size
        const anchor = clip?.footBottoms[index] ?? (hero.heroId ? SOUTH_QA_FOOT_BOTTOMS[hero.heroId]?.[index] : undefined)
        drawSmoothedHero(ctx, image, { type: 'candidate', atlas: qaAtlas, rect: qaRect, anchor },
          anim, width, height, frameTimeSeconds)
        return true
      }
    }
    if (hero.poseAtlasSources || hero.poseAtlases) {
      const rect = productionHeroPoseRect(anim)
      const sheet = loadHeroPoseOnDemand(hero, rect.sheet)
      if (sheet) {
        drawSmoothedHero(ctx, image, { type: 'atlas', atlas: sheet, rect,
          anchor: productionHeroFrameAnchor(image, rect) }, anim, width, height, frameTimeSeconds)
        return true
      }
      // If an action sheet is still decoding, hold the same character's
      // directional guard instead of snapping to a generic unrelated pose.
      if (rect.sheet !== 'direction') {
        const ready = loadHeroPoseOnDemand(hero, 'direction')
        if (ready) {
          const direction = Number.isFinite(anim.direction)
            ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
          const cell = direction + 8
          const held: PoseRect = { sheet: 'direction', x: (cell % 4) * 448,
            y: Math.floor(cell / 4) * 448,
            width: 448, height: 448, mirror: false }
          drawSmoothedHero(ctx, image, { type: 'atlas', atlas: ready, rect: held,
            anchor: productionHeroFrameAnchor(image, held) }, anim, width, height, frameTimeSeconds)
          return true
        }
      }
      // Decode fallback can blend into the first real frame. Keep its identity.
      if (frameTimeSeconds !== undefined) {
        drawSmoothedHero(ctx, image, { type: 'portrait', atlas: image, anim },
          anim, width, height, frameTimeSeconds)
      } else if (!heroSheets?.drawSpecialization(ctx, image, anim, width, height)) {
        drawPortraitMotion(ctx, image, anim, width, height)
      }
      return true
    }
    const motion = loadHeroMotionOnDemand(hero)
    if (motion) {
      drawHeroMotionAtlas(ctx, motion, anim, width, height)
      return true
    }
    if (heroSheets?.drawSpecialization(ctx, image, anim, width, height)) return true
    drawPortraitMotion(ctx, image, anim, width, height)
    return true
  }
  if (image.naturalWidth === 1024 && image.naturalHeight === 512) {
    // Keep the legacy authored eight directions for every view except E, where
    // an independently illustrated, high-detail 8-frame run/attack sequence
    // can be shown. The new strip is single-direction: never pretend it is 8-way.
    const action = (image as AtlasWithAction).actionStrip
    const octant = Number.isFinite(anim.direction) ? ((Math.round(anim.direction) % 8) + 8) % 8 : 0
    const acting = anim.pose === 'run' || anim.pose === 'dash' || anim.pose === 'attack' || anim.pose === 'cast'
    if (!anim.reducedMotion && octant === 0 && acting
      && action?.complete && action.naturalWidth === 3584 && action.naturalHeight === 448) {
      const frame = productionHeroActionFrame(anim)
      const paintedWidth = width * 1.3
      const paintedHeight = height * 1.25
      ctx.drawImage(action, frame * 448, 0, 448, 448,
        -paintedWidth / 2, 4 - paintedHeight, paintedWidth, paintedHeight)
      return true
    }
    const r = productionHeroDirectionRect(anim)
    if (!r) return false
    // The authored body occupies only the middle ~50px of each 128px cell.
    // Normalize that visible silhouette to the original three heroes' scale,
    // with the authored feet (~70% down the cell) on the unchanged ground point.
    // This changes artwork only, never collision, hitboxes or actor geometry.
    const scale = 2.5
    const paintedWidth = width * scale
    const paintedHeight = height * scale
    ctx.drawImage(image, r.x, r.y, r.width, r.height,
      -paintedWidth / 2, 4 - paintedHeight * 0.7, paintedWidth, paintedHeight)
    return true
  }
  if (image.naturalWidth !== 384 || image.naturalHeight !== 96) return false
  ctx.drawImage(image, productionHeroFrame(anim) * 96, 0, 96, 96,
    -width / 2, -height + 4, width, height)
  return true
}
