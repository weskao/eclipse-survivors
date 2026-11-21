import type { Artwork } from '../art'
import { currentSceneInfo } from '../state'
import type { GameState, Hero, Mob } from '../types'
import { drawCharacter } from './characters'
import type { Ctx2D } from './ctx'
import { drawAmbient, paintEnvironment } from './environment'
import {
  drawEchoes, drawFx, drawHeroAuras, drawImpactWaves, drawLightning, drawNumbers, drawOrbs, drawShots, drawStars,
  drawSwipes, drawVignette,
} from './effects'
import { drawMiniMap as paintMiniMap } from './minimap'
import { buildProps } from './props'
import { buildSprites, domCanvas, type MakeCanvas } from './sprites'

export type { Ctx2D } from './ctx'

export interface RenderAssets {
  art: Artwork
  sprites: Record<string, HTMLCanvasElement>
  props: { tree: HTMLCanvasElement; ruin: HTMLCanvasElement; crystal: HTMLCanvasElement }
  /** Reused every frame instead of allocating per-mob sorting wrappers. */
  depthOrder: (Hero | Mob)[]
  weatherCache?: { ctx: Ctx2D; width: number; height: number; weather: string; gradient: CanvasGradient }
}

/** Eager, like the original startup: fallback sprites and cached props are painted once. */
export function createRenderAssets(art: Artwork, makeCanvas: MakeCanvas = domCanvas): RenderAssets {
  return { art, sprites: buildSprites(makeCanvas), props: buildProps(makeCanvas), depthOrder: [] }
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

/** Original `draw()` minus the frame counter and the minimap call (the engine owns both). */
export function drawFrame(ctx: Ctx2D, s: GameState, dpr: number, assets: RenderAssets): void {
  const { W, H } = s
  const hero = s.hero
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#27352d'
  ctx.fillRect(0, 0, W, H)
  let ox = W * 0.5 - (hero ? s.cam.x : 0)
  let oy = H * 0.53 - (hero ? s.cam.y : 0)
  if (hero && s.cameraKick > 0) {
    ox += Math.sin(s.worldClock * 89) * s.cameraKick
    oy += Math.cos(s.worldClock * 73) * s.cameraKick * 0.7
  }
  paintEnvironment(ctx, s, assets.art, assets.props, ox, oy)
  const scene = currentSceneInfo(s)
  const cached = assets.weatherCache
  if (!cached || cached.ctx !== ctx || cached.width !== W || cached.height !== H || cached.weather !== scene.weather) {
    assets.weatherCache = { ctx, width: W, height: H, weather: scene.weather, gradient: weatherGrade(ctx, W, H, scene.weather) }
  }
  ctx.fillStyle = assets.weatherCache!.gradient
  ctx.fillRect(0, 0, W, H)
  drawAmbient(ctx, s, ox, oy)
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
  drawStars(ctx, s, ox, oy)
  drawEchoes(ctx, s, ox, oy)
  const objects = assets.depthOrder
  objects.length = 0
  for (const mob of s.mobs) objects.push(mob)
  objects.push(hero)
  objects.sort((a, b) => a.y - b.y)
  for (const obj of objects) drawCharacter(ctx, s, assets.art, assets.sprites, obj, ox, oy)
  drawHeroAuras(ctx, s, hero, ox, oy)
  drawSwipes(ctx, s, ox, oy)
  drawShots(ctx, s, ox, oy)
  drawOrbs(ctx, s, hero, ox, oy)
  drawImpactWaves(ctx, s, ox, oy)
  drawLightning(ctx, s, ox, oy)
  drawFx(ctx, s, ox, oy)
  drawNumbers(ctx, s, ox, oy)
  drawVignette(ctx, s)
}

export function drawMiniMap(p: Ctx2D, s: GameState, assets: RenderAssets): void {
  paintMiniMap(p, s, assets.art)
}
