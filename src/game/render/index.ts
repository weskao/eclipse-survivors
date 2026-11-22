import type { Artwork } from '../art'
import { buildBiomeArt, type BiomeArt } from './biome-art'
import { currentSceneInfo } from '../state'
import type { GameState, Hero, Mob } from '../types'
import { drawCharacter } from './characters'
import { createHeroSheets, type HeroSheets } from './hero-sheets'
import { loadPaintedHeroAtlas, loadPaintedRunAtlas } from './painted-frames'
import { drawBossPhaseIndicator, drawEnemyProjectiles, drawEnemyTelegraphs } from './enemy-attacks'
import type { Ctx2D } from './ctx'
import { drawAmbient, drawWorldMarkers, paintEnvironment } from './environment'
import {
  buildMagicGlow, drawEchoes, drawFx, drawHeroAuras, drawImpactWaves, drawLightning, drawNumbers, drawOrbs, drawShots, drawStars,
  drawSwipes, drawVignette,
} from './effects'
import { drawMiniMap as paintMiniMap } from './minimap'
import { buildProps } from './props'
import { buildSprites, domCanvas, type MakeCanvas } from './sprites'

export type { Ctx2D } from './ctx'

export interface RenderAssets {
  art: Artwork
  sprites: Record<string, HTMLCanvasElement>
  heroSheets: HeroSheets
  paintedFrames: HTMLImageElement
  paintedRunFrames: HTMLImageElement
  props: { tree: HTMLCanvasElement; ruin: HTMLCanvasElement; crystal: HTMLCanvasElement }
  prefersReducedMotion: () => boolean
  cameraShakeEnabled: () => boolean
  biomes: BiomeArt[]
  depthOrder: (Hero | Mob)[]
  magicGlow: HTMLCanvasElement | null
  weatherCache?: { ctx: Ctx2D; width: number; height: number; weather: string; gradient: CanvasGradient }
}

/** Eagerly paint cheap fallback assets once; preference updates are read live. */
export function createRenderAssets(art: Artwork, makeCanvas: MakeCanvas = domCanvas): RenderAssets {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
  return {
    art, sprites: buildSprites(makeCanvas), props: buildProps(makeCanvas),
    heroSheets: createHeroSheets(makeCanvas), paintedFrames: loadPaintedHeroAtlas(), paintedRunFrames: loadPaintedRunAtlas(),
    prefersReducedMotion: () => query?.matches ?? false,
    cameraShakeEnabled: () => true,
    depthOrder: [],
    biomes: buildBiomeArt(makeCanvas),
    magicGlow: buildMagicGlow(makeCanvas),
  }
}

function weatherGrade(ctx: Ctx2D, W: number, H: number, weather: string): CanvasGradient {
  const grade = ctx.createLinearGradient(0, 0, W, H)
  if (weather === 'storm') {
    grade.addColorStop(0, '#6ea5ff26'); grade.addColorStop(0.45, '#12213d14'); grade.addColorStop(1, '#050e1f58')
  } else if (weather === 'snow') {
    grade.addColorStop(0, '#d7f0ff24'); grade.addColorStop(0.45, '#eefaff12'); grade.addColorStop(1, '#0a1d2b34')
  } else if (weather === 'embers') {
    grade.addColorStop(0, '#ffb05d22'); grade.addColorStop(0.45, '#7e22110f'); grade.addColorStop(1, '#2209045e')
  } else {
    grade.addColorStop(0, '#f9ca8230'); grade.addColorStop(0.35, '#bdeab808'); grade.addColorStop(1, '#1229462b')
  }
  return grade
}

/** Original `draw()` minus frame counter and minimap call (engine owns both). */
export function drawFrame(ctx: Ctx2D, s: GameState, dpr: number, assets: RenderAssets): void {
  const { W, H } = s
  const hero = s.hero
  const reduced = assets.prefersReducedMotion()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#27352d'
  ctx.fillRect(0, 0, W, H)
  let ox = W * 0.5 - (hero ? s.cam.x : 0)
  let oy = H * 0.53 - (hero ? s.cam.y : 0)
  if (hero && s.mode === 'play' && s.cameraKick > 0 && !reduced && assets.cameraShakeEnabled()) {
    ox += Math.sin(s.worldClock * 89) * s.cameraKick
    oy += Math.cos(s.worldClock * 73) * s.cameraKick * 0.7
  }
  paintEnvironment(ctx, s, assets.art, assets.props, assets.biomes, ox, oy)
  const scene = currentSceneInfo(s)
  const cached = assets.weatherCache
  if (!cached || cached.ctx !== ctx || cached.width !== W || cached.height !== H || cached.weather !== scene.weather) {
    assets.weatherCache = { ctx, width: W, height: H, weather: scene.weather, gradient: weatherGrade(ctx, W, H, scene.weather) }
  }
  ctx.fillStyle = assets.weatherCache!.gradient
  ctx.fillRect(0, 0, W, H)
  if (!reduced) drawAmbient(ctx, s, ox, oy)
  drawWorldMarkers(ctx, s, ox, oy)
  ctx.save(); ctx.globalAlpha = 0.7; ctx.textAlign = 'center'; ctx.font = '700 14px Georgia'; ctx.fillStyle = '#f4e1ba'
  ctx.fillText(scene.name + ' · ' + scene.label, W / 2, 34)
  ctx.restore()
  if (!hero) {
    const shadow = ctx.createRadialGradient(W / 2, H * 0.49, 55, W / 2, H * 0.49, Math.max(W, H) * 0.76)
    shadow.addColorStop(0, '#090f1207'); shadow.addColorStop(1, '#03070ab8')
    ctx.fillStyle = shadow
    ctx.fillRect(0, 0, W, H)
    return
  }
  drawStars(ctx, s, ox, oy, reduced)
  drawEnemyTelegraphs(ctx, s, ox, oy)
  if (!reduced) drawEchoes(ctx, s, ox, oy)
  const objects = assets.depthOrder
  objects.length = 0
  // Reject offscreen and dead mobs before sorting, not after the sort in drawCharacter.
  // Keep the same conservative bounds as the individual sprite renderer.
  for (const mob of s.mobs) {
    const x = mob.x + ox, y = mob.y + oy
    if (mob.hp > 0 && x >= -180 && x <= W + 180 && y >= -240 && y <= H + 220) objects.push(mob)
  }
  objects.push(hero)
  objects.sort((a, b) => a.y - b.y)
  for (const obj of objects) drawCharacter(ctx, s, assets.art, assets.sprites, obj, ox, oy, reduced, assets.heroSheets, assets.paintedFrames, assets.paintedRunFrames)
  drawHeroAuras(ctx, s, hero, ox, oy, reduced)
  if (!reduced) drawSwipes(ctx, s, ox, oy)
  drawShots(ctx, s, ox, oy, assets.magicGlow)
  drawEnemyProjectiles(ctx, s, ox, oy)
  drawOrbs(ctx, s, hero, ox, oy)
  drawImpactWaves(ctx, s, ox, oy)
  drawLightning(ctx, s, ox, oy, reduced)
  drawFx(ctx, s, ox, oy, reduced)
  drawNumbers(ctx, s, ox, oy)
  drawVignette(ctx, s)
  drawBossPhaseIndicator(ctx, s)
}

export function drawMiniMap(p: Ctx2D, s: GameState, assets: RenderAssets): void {
  paintMiniMap(p, s, assets.art)
}
