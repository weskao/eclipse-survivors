import { t } from '../../i18n'
import type { Artwork } from '../art'
import type { ContentRegistry } from '../content/registry'
import type { VisualPresentationPolicy } from '../content/accessibility/presentation'
import type { BossEncounterController } from '../content/bosses/controller'
import type { FactionBridge } from '../content/enemies/integration'
import { drawBossImpacts, drawBossTelegraphs, preloadBossAttackArt } from '../content/bosses/render'
import { buildBiomeArt, type BiomeArt } from './biome-art'
import { currentSceneInfo } from '../state'
import type { GameState, Hero, Mob } from '../types'
import { drawCharacter } from './characters'
import { preloadEnemyReleaseArt } from './enemy-motion'
import { preloadHitImpactArt } from './hit-impact'
import type { HealthBarMotion, HealthBarTarget } from './health-bars'
import { createHeroSheets, type HeroSheets } from './hero-sheets'
import type { ProductionHeroArtwork } from './es2/production-heroes'
import { preloadHeroSpecialVfx } from './es2/hero-special-vfx'
import { BOSS_BASE_DRAW_PX, type WorldRuntimeImages } from './es2/production-world'
import { drawBossAttackReference } from './es2/boss-motion-reference'
import { selectBossNativeKeyframe, isBossNativeKeyframe } from './es2/boss-native-keyframes'
import { drawLiveFactionArt, drawLiveFactionProjectiles, type FactionArtwork } from './es2/production-factions'
import { drawBossPhaseIndicator, drawEnemyProjectiles, drawEnemyTelegraphs } from './enemy-attacks'
import type { Ctx2D } from './ctx'
import { drawAmbient, drawWorldMarkers, paintEnvironment } from './environment'
import {
  buildGemSprites, buildMagicGlow, createParticleSpriteCache, type ParticleSpriteCache, type GemSprites, drawEchoes, drawFx, drawHeroAuras, drawHeroStatus, drawImpactWaves, drawLightning, drawNumbers, drawOrbs, drawShots, drawStars,
  drawSwipes, drawVignette,
} from './effects'
import { drawMiniMap as paintMiniMap } from './minimap'
import { sharedProjectileSprites } from './projectile-art'
import { sharedHeroAttackArt, type HeroAttackSprites } from './hero-attack-art'
import { buildProps } from './props'
import { buildSprites, domCanvas, type MakeCanvas } from './sprites'
import type { MobTintCache } from './tint-cache'

export type { Ctx2D } from './ctx'

export interface RenderAssets {
  content?: ContentRegistry
  presentation?: () => VisualPresentationPolicy | null
  bosses?: BossEncounterController
  art: Artwork
  sprites: Record<string, HTMLCanvasElement>
  heroSheets: HeroSheets
  productionHeroes?: ProductionHeroArtwork
  productionWorld?: WorldRuntimeImages
  factions?: FactionBridge
  factionArtwork?: FactionArtwork
  props: { tree: HTMLCanvasElement; ruin: HTMLCanvasElement; crystal: HTMLCanvasElement }
  prefersReducedMotion: () => boolean
  cameraShakeEnabled: () => boolean
  biomes: BiomeArt[]
  depthOrder: (Hero | Mob)[]
  heroAttackArt?: HeroAttackSprites
  magicGlow: HTMLCanvasElement | null
  gems: GemSprites
  particles: ParticleSpriteCache
  mobTint: MobTintCache
  healthBars: WeakMap<HealthBarTarget, HealthBarMotion>
  weatherCache?: { ctx: Ctx2D; width: number; height: number; weather: string; gradient: CanvasGradient }
}

/** Eagerly paint cheap fallback assets once; preference updates are read live. */
export function createRenderAssets(art: Artwork, makeCanvas: MakeCanvas = domCanvas): RenderAssets {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
  preloadHeroSpecialVfx()
  preloadBossAttackArt()
  preloadEnemyReleaseArt()
  preloadHitImpactArt()
  return {
    art, sprites: buildSprites(makeCanvas), props: buildProps(makeCanvas),
    heroSheets: createHeroSheets(makeCanvas),
    prefersReducedMotion: () => query?.matches ?? false,
    cameraShakeEnabled: () => true,
    depthOrder: [],
    biomes: buildBiomeArt(makeCanvas),
    heroAttackArt: sharedHeroAttackArt(),
    magicGlow: buildMagicGlow(makeCanvas),
    gems: buildGemSprites(makeCanvas),
    particles: createParticleSpriteCache(makeCanvas),
    mobTint: { makeCanvas, variants: new WeakMap() },
    healthBars: new WeakMap(),
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
  const policy = assets.presentation?.()
  const reduced = policy?.reduceMotion ?? assets.prefersReducedMotion()
  const showFullHealthBars = policy?.showFullEnemyHealthBars ?? false
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#27352d'
  ctx.fillRect(0, 0, W, H)
  let ox = W * 0.5 - (hero ? s.cam.x : 0)
  let oy = H * 0.53 - (hero ? s.cam.y : 0)
  if (hero && s.mode === 'play' && s.cameraKick > 0 && !reduced && assets.cameraShakeEnabled()) {
    // Cap even externally-triggered recoil; avoid high-frequency screen oscillation.
    const nudge = Math.min(s.cameraKick, 1.6)
    ox += Math.sin(s.worldClock * 19) * nudge
    oy += Math.cos(s.worldClock * 17) * nudge * 0.55
  }
  paintEnvironment(ctx, s, assets.art, assets.props, assets.biomes, ox, oy, assets.productionWorld)
  const scene = currentSceneInfo(s)
  const cached = assets.weatherCache
  if (!cached || cached.ctx !== ctx || cached.width !== W || cached.height !== H || cached.weather !== scene.weather) {
    assets.weatherCache = { ctx, width: W, height: H, weather: scene.weather, gradient: weatherGrade(ctx, W, H, scene.weather) }
  }
  ctx.fillStyle = assets.weatherCache!.gradient
  ctx.fillRect(0, 0, W, H)
  if (!reduced && (policy?.ambientDensity ?? 1) >= 0.5) drawAmbient(ctx, s, ox, oy)
  drawWorldMarkers(ctx, s, ox, oy, assets.productionWorld)
  // These match the compact title breakpoints in hud.css.
  const compactHud = W <= H ? W <= 700 : W <= 1100 && H <= 520
  if (!hero || !compactHud) {
    ctx.save(); ctx.globalAlpha = 0.7; ctx.textAlign = 'center'; ctx.font = '700 14px Georgia'; ctx.fillStyle = '#f4e1ba'
    ctx.fillText(t(scene.name) + ' · ' + t(scene.label), W / 2, 34)
    ctx.restore()
  }
  if (!hero) {
    const shadow = ctx.createRadialGradient(W / 2, H * 0.49, 55, W / 2, H * 0.49, Math.max(W, H) * 0.76)
    shadow.addColorStop(0, '#090f1207'); shadow.addColorStop(1, '#03070ab8')
    ctx.fillStyle = shadow
    ctx.fillRect(0, 0, W, H)
    return
  }
  drawStars(ctx, s, ox, oy, reduced, assets.gems)
  const projectiles = sharedProjectileSprites()
  drawEnemyTelegraphs(ctx, s, ox, oy, reduced)
  const bossSnapshot = assets.bosses?.snapshot(s)
  if (bossSnapshot) drawBossTelegraphs(ctx, bossSnapshot, ox, oy, reduced, W, H, projectiles, undefined, policy)
  if (!reduced) drawEchoes(ctx, s, ox, oy)
  if (assets.factions && assets.factionArtwork)
    drawLiveFactionArt(ctx, s, assets.factions.runtime, assets.factionArtwork, ox, oy, assets.healthBars, reduced, showFullHealthBars)
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
  const nativeKey = import.meta.env.DEV && bossSnapshot && assets.productionWorld?.bossNativeKeyframes
    ? selectBossNativeKeyframe(bossSnapshot) : null
  const nativeImage = nativeKey ? assets.productionWorld?.bossNativeKeyframes?.[nativeKey] : undefined
  const motionReference = nativeImage && bossSnapshot?.id ? { id: bossSnapshot.id, image: nativeImage } : assets.productionWorld?.bossMotionReference
  for (const obj of objects) {
    const bossImage = bossSnapshot?.id && bossSnapshot.phase && assets.productionWorld?.bosses[bossSnapshot.id]
    const liveBossArt = obj !== hero && 'type' in obj && obj.type === 'boss' && bossImage && bossSnapshot?.phase
      ? { image: bossImage, phase: bossSnapshot.phase,
          motion: motionReference && motionReference.id === bossSnapshot.id ? { image: motionReference.image, snapshot: bossSnapshot } : undefined }
      : undefined
    drawCharacter(ctx, s, assets.art, assets.sprites, obj, ox, oy, reduced, assets.heroSheets, assets.mobTint, assets.productionHeroes, liveBossArt, assets.healthBars, showFullHealthBars)
  }
  // Dead mobs are excluded from depthOrder. Only explicit DEV review may paint a death reference.
  const deathReference = motionReference
  const death = bossSnapshot?.bodyMotion
  if (import.meta.env.DEV && bossSnapshot && deathReference && death?.pose === 'death' && bossSnapshot.id === deathReference.id
      && (isBossNativeKeyframe(deathReference.image) || (deathReference.image.naturalWidth === 948 && deathReference.image.naturalHeight === 1659))
      && !objects.some(obj => 'type' in obj && obj.type === 'boss')) {
    ctx.save()
    ctx.translate(death.x + ox, death.y + oy)
    drawBossAttackReference(ctx, deathReference.image, bossSnapshot, BOSS_BASE_DRAW_PX, reduced)
    ctx.restore()
  }
  drawHeroAuras(ctx, s, hero, ox, oy, reduced, assets.heroAttackArt)
  drawHeroStatus(ctx, s, hero, ox, oy, reduced)
  drawSwipes(ctx, s, ox, oy, assets.heroAttackArt, reduced)
  drawShots(ctx, s, ox, oy, assets.magicGlow, projectiles, reduced, assets.heroAttackArt)
  drawEnemyProjectiles(ctx, s, ox, oy, projectiles, reduced)
  if (assets.factions) drawLiveFactionProjectiles(ctx, s, assets.factions.runtime, ox, oy, projectiles, reduced)
  drawOrbs(ctx, s, hero, ox, oy, projectiles)
  drawImpactWaves(ctx, s, ox, oy, reduced, policy?.reduceFlashing ?? false, policy?.vfxOpacity ?? 1)
  drawLightning(ctx, s, ox, oy, reduced)
  drawFx(ctx, s, ox, oy, reduced, assets.particles, projectiles)
  if (bossSnapshot) drawBossImpacts(ctx, bossSnapshot, ox, oy, reduced, W, H, undefined, policy)
  assets.content?.render(ctx, s, ox, oy)
  if (policy?.showDamageNumbers !== false) drawNumbers(ctx, s, ox, oy, reduced)
  drawVignette(ctx, s)
  drawBossPhaseIndicator(ctx, s)
}

export function drawMiniMap(p: Ctx2D, s: GameState, assets: RenderAssets): void {
  paintMiniMap(p, s, assets.art)
}
