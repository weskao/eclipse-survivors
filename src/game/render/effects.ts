import { t as translate } from '../../i18n'
import { BALANCE } from '../config'
import { DASH_COOLDOWN, TAU } from '../constants'
import { easing } from '../math'
import type { GameState, Hero } from '../types'
import type { Ctx2D } from './ctx'
import type { MakeCanvas } from './sprites'
import { softGlow } from './environment'
import { drawProjectileSprite, type ProjectileSprites } from './projectile-art'
import { drawEnergyMissile, drawEnergyTrail, drawZoneMotes } from './energy-art'
import { meleeArtId, type HeroAttackSprites } from './hero-attack-art'
import { drawHitImpact } from './hit-impact'
import { drawHeroHealthBar, sampleHealthBar, shouldShowHealthBar, type HealthBarTarget, type HealthBarMotion } from './health-bars'

const BLAZE_COLORS = ['#ffd8a0', '#ff9e4c', '#ff6b31']
const LIGHTNING_LAYERS = [[9, '#63b7ff', 15], [4, '#b3deff', 10], [1.4, '#ffffff', 3]] as const

// Reuse the full-screen grade between frames, but rebuild it on resize.
const vignetteGradients = new WeakMap<Ctx2D, { W: number; H: number; gradient: CanvasGradient }>()

export interface GemSprites { common: HTMLCanvasElement; rare: HTMLCanvasElement }

/** Two static crystal shapes, cached at 3x. Position and rotation remain dynamic. */
export function buildGemSprites(makeCanvas: MakeCanvas): GemSprites {
  const gem = (rare: boolean): HTMLCanvasElement => {
    const canvas = makeCanvas(96, 96)
    const paint = canvas.getContext('2d')
    if (!paint) return canvas
    paint.scale(3, 3)
    paint.translate(16, 16)
    paint.shadowBlur = 12
    paint.shadowColor = rare ? '#f8bd67' : '#75cfff'
    paint.fillStyle = rare ? '#ffc77c' : '#8ddffe'
    paint.beginPath()
    paint.moveTo(0, -11); paint.lineTo(7, -1); paint.lineTo(0, 10); paint.lineTo(-7, -1); paint.closePath(); paint.fill()
    paint.shadowBlur = 0
    paint.fillStyle = '#ffffffb8'
    paint.beginPath()
    paint.moveTo(0, -9); paint.lineTo(0, 6); paint.lineTo(-3, -1); paint.closePath(); paint.fill()
    return canvas
  }
  return { common: gem(false), rare: gem(true) }
}

/** Rasterize the local-space bolt glow once; drawing the image preserves its position after translate(). */
export function buildMagicGlow(makeCanvas: MakeCanvas): HTMLCanvasElement | null {
  // Paint at 3x resolution; the 56 CSS-pixel bolt stays crisp on high-DPI displays.
  const canvas = makeCanvas(168, 168)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(3, 3)
  const glow = ctx.createRadialGradient(28, 28, 0, 28, 28, 28)
  glow.addColorStop(0, '#f2eaff')
  glow.addColorStop(0.2, '#a6d8ff')
  glow.addColorStop(0.44, '#937af7b9')
  glow.addColorStop(1, '#9170ec00')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(28, 28, 28, 0, TAU)
  ctx.fill()
  return canvas
}

// Magical gems have faceted highlights and small animated coronae.
export function drawStars(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false, gems?: GemSprites): void {
  const { W, H } = s
  let trailBudget = 48 // Two cached fragments per visible moving gem; bounded independently of the gem cap.
  for (const star of s.stars) {
    const x = star.x + ox
    const y = star.y + oy
    if (x < -25 || x > W + 25 || y < -25 || y > H + 25) continue
    const bob = reducedMotion ? 0 : Math.sin(star.t * 4) * 3
    const sprite = gems && (star.value > 10 ? gems.rare : gems.common)
    if (sprite && s.hero && !reducedMotion && star.attractionSpeed && trailBudget > 0) {
      const dx = s.hero.x - star.x, dy = s.hero.y - star.y
      const distance = Math.hypot(dx, dy)
      if (distance > 0) {
        const nx = dx / distance, ny = dy / distance
        ctx.save()
        const alpha = ctx.globalAlpha
        ctx.globalAlpha = alpha * 0.20
        ctx.drawImage(sprite, x - nx * 27 - 4, y + bob - 7 - ny * 27 - 4, 8, 8)
        ctx.globalAlpha = alpha * 0.45
        ctx.drawImage(sprite, x - nx * 15 - 6, y + bob - 7 - ny * 15 - 6, 12, 12)
        ctx.restore()
        trailBudget--
      }
    }
    ctx.save(); ctx.translate(x, y + bob - 7); if (!reducedMotion) ctx.rotate(Math.sin(star.t * 2) * 0.11)
    if (sprite) {
      ctx.drawImage(sprite, -16, -16, 32, 32)
    } else {
      // Standalone callers retain the procedural renderer without asset setup.
      ctx.shadowBlur = 12; ctx.shadowColor = star.value > 10 ? '#f8bd67' : '#75cfff'; ctx.fillStyle = star.value > 10 ? '#ffc77c' : '#8ddffe'
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, -1); ctx.lineTo(0, 10); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#ffffffb8'
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 6); ctx.lineTo(-3, -1); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
}

// Speed trail traces on the ground; no ghost bodies or duplicate limbs.
export function drawEchoes(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  for (const g of s.motionEchoes) {
    ctx.save(); ctx.globalAlpha = Math.max(0, g.life / g.max) * 0.27
    ctx.strokeStyle = '#d3eaf1'; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.ellipse(g.x + ox, g.y + oy, 26, 7, 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }
}

/** Blaze ring, shield aura and level-up burst around the hero. */
export function drawHeroAuras(ctx: Ctx2D, s: GameState, hero: Hero, ox: number, oy: number, reducedMotion = false, art?: HeroAttackSprites): void {
  const q = reducedMotion ? 0 : s.worldClock
  const aura = (id: 'blaze-aura' | 'shield-aura' | 'sanctuary-aura', x: number, y: number, w: number, h: number, alpha: number): boolean => {
    const image = art?.[id]
    if (!image?.complete || image.naturalWidth <= 0) return false
    ctx.save(); ctx.globalAlpha = alpha
    ctx.drawImage(image, x - w / 2, y - h / 2, w, h); ctx.restore()
    return true
  }
  const blaze = hero.skills.blaze
  if (blaze && !aura('blaze-aura', hero.x + ox, hero.y + oy - 18, 100 + blaze * 12 + (blaze >= 5 ? 36 : 0), 56 + blaze * 6 + (blaze >= 5 ? 18 : 0), 0.66 + Math.sin(q * 3) * 0.1)) {
    ctx.save(); ctx.translate(hero.x + ox, hero.y + oy); ctx.globalAlpha = 0.55
    for (let k = 0; k < 3 + blaze; k++) {
      const a = q * 3 + k * TAU / (3 + blaze)
      const r = 38 + blaze * 5 + (blaze >= 5 ? BALANCE.skills.area.blaze.maxRankRangeBonus : 0) + Math.sin(q * 5 + k) * 6
      ctx.fillStyle = BLAZE_COLORS[k % 3]!
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.55 - 18, 9, 5, a, 0, TAU); ctx.fill()
    }
    ctx.restore()
  }
  const shield = hero.skills.shield
  if (hero.evolutions['guardian-sanctuary'] && !aura('sanctuary-aura', hero.x + ox, hero.y + oy - 13, 225, 94, 0.66)) {
    ctx.save()
    ctx.globalAlpha = 0.32 + 0.1 * Math.sin(q * 3)
    ctx.strokeStyle = '#8dffdf'
    ctx.shadowColor = '#84ffe1'
    ctx.shadowBlur = 18
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(hero.x + ox, hero.y + oy - 13, 94, 39, 0, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }
  if (shield && !aura('shield-aura', hero.x + ox, hero.y + oy - 14, 150 + shield * 9, 59 + shield * 5, 0.48 + Math.sin(q * 3) * 0.07)) {
    ctx.save(); ctx.globalAlpha = 0.24 + 0.09 * Math.sin(q * 4); ctx.strokeStyle = '#9fd4ff'; ctx.lineWidth = 2.6
    ctx.beginPath(); ctx.ellipse(hero.x + ox, hero.y + oy - 14, 62 + shield * 4, 24 + shield * 2, 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }
  if (hero.levelAnim > 0) {
    const t = hero.levelAnim
    ctx.save(); ctx.globalAlpha = t * 0.9
    softGlow(ctx, hero.x + ox, hero.y + oy - 30, 120, '#fff2b4', t * 0.45)
    ctx.strokeStyle = '#ffe3a2'; ctx.lineWidth = 4
    const radius = 45 + (1 - t) * 24
    ctx.beginPath(); ctx.arc(hero.x + ox, hero.y + oy - 24, radius, 0, TAU); ctx.stroke()
    drawZoneMotes(ctx, hero.x + ox, hero.y + oy - 24, radius, 0, 1 - t, '#fff5d5', reducedMotion)
    ctx.restore()
    ctx.save(); ctx.globalAlpha = t; ctx.textAlign = 'center'; ctx.font = '900 28px system-ui'
    ctx.fillStyle = '#fff5d5'; ctx.strokeStyle = '#5c4722'; ctx.lineWidth = 5
    ctx.strokeText(translate('LEVEL UP!'), hero.x + ox, hero.y - 88 + oy); ctx.fillText(translate('LEVEL UP!'), hero.x + ox, hero.y - 88 + oy)
    ctx.restore()
  }
}

const DASH_READY_FLASH = 0.28
const STATUS_BAR_WIDTH = 56

/** Foot-level dash and health readouts; a healthy hero with dash ready draws nothing. */
export function drawHeroStatus(ctx: Ctx2D, s: GameState, hero: Hero, ox: number, oy: number, reducedMotion = false, healthBars?: WeakMap<HealthBarTarget, HealthBarMotion>, reduceFlashing = false): void {
  if (s.mode === 'menu' || s.mode === 'result' || hero.hp <= 0) return
  const x = hero.x + ox
  const y = hero.y + oy
  const cd = hero.dashCd
  // dashCd keeps falling below zero, and a real recovery needs one full cooldown of run time.
  const recovered = cd <= 0 && cd > -DASH_READY_FLASH && s.time >= DASH_COOLDOWN
  if (cd > 0 || recovered) {
    const start = -Math.PI / 2
    ctx.save()
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    if (cd > 0) {
      ctx.globalAlpha = 0.45
      ctx.strokeStyle = '#07141c'
      ctx.beginPath(); ctx.ellipse(x, y + 2, 44, 15, 0, 0, TAU); ctx.stroke()
      ctx.globalAlpha = 0.95
    } else {
      ctx.globalAlpha = reducedMotion ? 0.9 : 1 + cd / DASH_READY_FLASH
    }
    ctx.strokeStyle = recovered ? '#f4feff' : '#8fe6ff'
    ctx.beginPath()
    ctx.ellipse(x, y + 2, 44, 15, 0, start, start + TAU * (cd > 0 ? 1 - cd / DASH_COOLDOWN : 1))
    ctx.stroke()
    ctx.restore()
  }
  const motion = sampleHealthBar(hero, s.worldClock, healthBars, reducedMotion)
  if (shouldShowHealthBar(motion))
    drawHeroHealthBar(ctx, motion, x, y + 22, STATUS_BAR_WIDTH, reduceFlashing)
}

// Weapon ribbons: radial gold-to-ivory gradients with trailing sparkle and wave afterglow.
export function drawSwipes(ctx: Ctx2D, s: GameState, ox: number, oy: number, sprites?: HeroAttackSprites, reduced = false): void {
  const id = meleeArtId(s.heroId)
  const image = sprites?.[id]
  const color = id === 'shadowblade' ? '#cba7f6' : id === 'crimson-paladin' ? '#ff7890' : '#f8bb66'
  for (const sw of s.swipes) {
    if (sw.life <= 0 || sw.max <= 0) continue
    const t = 1 - sw.life / sw.max
    const x = sw.x + ox, y = sw.y + oy
    const r = sw.r + easing(reduced ? 0.45 : t) * 32
    const margin = r * 1.3
    if (x < -margin || x > s.W + margin || y < -margin || y > s.H + margin) continue
    ctx.save()
    ctx.translate(x, y)
    // A weighted knight follow-through, paired shadow cuts and deliberate paladin sweep.
    const sweep = reduced ? 0 : (t - 0.5) * (id === 'shadowblade' ? 0.32 : id === 'crimson-paladin' ? 0.48 : 0.68)
    ctx.rotate(sw.a + sweep)
    ctx.globalAlpha = Math.pow(1 - t, 0.75) * (reduced ? 0.7 : 1)
    if (image?.complete && image.naturalWidth > 0) {
      // One textured draw replaces repeated arcs, shadow blur and five separate sparks.
      const size = r * 2.25
      ctx.drawImage(image, -size / 2, -size / 2, size, size)
    } else {
      // Tapered crescent fallback, never an opaque round-ended debug line.
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(0, 0, r, -1.02, 1.2)
      ctx.arc(0, 0, r * 0.79, 1.2, -1.02, true)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
}

// Fast arrows leave stretched trails. Arcane bolts cast a soft violet halo.
export function drawShots(ctx: Ctx2D, s: GameState, ox: number, oy: number, magicGlow?: HTMLCanvasElement | null, projectiles?: Partial<ProjectileSprites>, reduced = false, heroArt?: HeroAttackSprites): void {
  const { W, H } = s
  for (const b of s.shots) {
    const x = b.x + ox
    const y = b.y + oy
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue
    const a = Math.atan2(b.vy, b.vx)
    // Motion history is drawn in world space to avoid faking a longer shaft.
    const prevX = (b.prevX ?? b.x) + ox
    const prevY = (b.prevY ?? b.y) + oy
    const history = Math.hypot(x - prevX, y - prevY)
    // Never stretch a trail all the way back to the firing hand on a laggy tick.
    // This is a short moving tracer, not a second bow/arrow or magical residue.
    const extent = Math.min(1, 14 / Math.max(1, history))
    const tx = x - (x - prevX) * extent
    const ty = y - (y - prevY) * extent
    const readyMagic = s.heroId === 'spirit-summoner' ? heroArt?.['spirit-summoner'] : projectiles?.['arcane-bolt']
    const historicalTrail = history > 2 && !reduced && (b.kind === 'arrow' || !readyMagic?.complete || !readyMagic.naturalWidth)
    if (historicalTrail) {
      ctx.save()
      ctx.globalAlpha = b.kind === 'arrow' ? 0.34 : 0.55
      ctx.strokeStyle = b.kind === 'arrow' ? '#f6d6a4' : '#a9a1ff'
      ctx.lineWidth = b.kind === 'arrow' ? 1.6 : 3
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke()
      // A short taper keeps the trail visible without extra particle objects.
      ctx.globalAlpha *= 0.45
      ctx.beginPath(); ctx.moveTo(tx - (x - tx) * 0.35, ty - (y - ty) * 0.35); ctx.lineTo(tx, ty); ctx.stroke()
      ctx.restore()
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(a)
    if (b.kind === 'arrow') {
      if (!drawProjectileSprite(ctx, projectiles, 'ranger-arrow', 60)) {
      ctx.shadowBlur = 13; ctx.shadowColor = '#ffc474'; ctx.strokeStyle = '#ffeac2'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(-29, 0); ctx.lineTo(10, 0); ctx.stroke()
      ctx.fillStyle = '#fff3d5'
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(1, -5); ctx.lineTo(3, 0); ctx.lineTo(1, 5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#ddac77'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-11, 0); ctx.lineTo(-15, 4); ctx.stroke()
      }
    } else {
      const spirit = s.heroId === 'spirit-summoner'
      if (!historicalTrail) drawEnergyTrail(ctx, b.r, b.life, spirit ? '#a7efdc' : '#c3adff', reduced)
      const spiritImage = spirit ? heroArt?.['spirit-summoner'] : undefined
      if (spiritImage?.complete && spiritImage.naturalWidth > 0) {
        ctx.drawImage(spiritImage, -30, -30, 60, 60)
      } else if (spirit || !drawProjectileSprite(ctx, projectiles, 'arcane-bolt', 60)) {
        // Keep the cached halo, but replace the old dot-and-line fallback with a faceted core.
        if (magicGlow) ctx.drawImage(magicGlow, -28, -28, 56, 56)
        drawEnergyMissile(ctx, undefined, 'arcane-bolt', b.r, b.life, spirit ? '#79cfc0' : '#a88af0', spirit ? '#e6fff4' : '#f2eaff', true)
      }
    }
    ctx.restore()
  }
}

export function drawOrbs(ctx: Ctx2D, s: GameState, hero: Hero, ox: number, oy: number, projectiles?: Partial<ProjectileSprites>): void {
  const orb = hero.skills.orb
  if (!orb) return
  const q = s.worldClock
  const evolved = !!hero.evolutions['blade-tempest']
  const n = Math.min(orb + 1 + (orb >= 5 ? BALANCE.skills.area.orb.maxRankBonusBlades : 0) + (evolved ? 2 : 0), BALANCE.skills.area.orb.maxBlades)
  for (let k = 0; k < n; k++) {
    const a = q * 2.7 + k * TAU / n
    const x = hero.x + ox + Math.cos(a) * 71
    const y = hero.y + oy + Math.sin(a) * 71
    ctx.save(); ctx.translate(x, y); ctx.rotate(q * 3)
    if (!drawProjectileSprite(ctx, projectiles, evolved ? 'ricochet-blade' : 'gravity-core', evolved ? 42 : 38)) {
      ctx.shadowColor = evolved ? '#f3baff' : '#a6eaff'; ctx.shadowBlur = evolved ? 23 : 15; ctx.strokeStyle = evolved ? '#fff0f9' : '#e1f3ff'; ctx.lineWidth = evolved ? 3.5 : 2.5
      ctx.strokeRect(-8, -8, 16, 16)
    }
    ctx.restore()
  }
}

// Expanding contact rings / shock waves.
export function drawImpactWaves(ctx: Ctx2D, s: GameState, ox: number, oy: number, reduced = false, flashing = false, opacity = 1): void {
  if (opacity <= 0) return
  for (const z of s.impactWaves) {
    const t = 1 - z.life / z.max
    const x = z.x + ox
    const y = z.y + oy
    const reach = z.size + 15
    if (z.life <= 0 || x < -reach || x > s.W + reach || y < -reach || y > s.H + reach) continue
    if (z.contact) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(z.angle ?? 0)
      ctx.globalAlpha *= opacity
      const dedicated = drawHitImpact(ctx, z.contact, z.size, t, reduced, flashing, undefined, z.kind)
      // Only the legacy fallback needs a color accent. Uploaded 3x variants own the whole hit.
      if (z.kind && !reduced && !flashing && !dedicated) {
        ctx.globalAlpha *= .6 * (1-t)
        ctx.strokeStyle = z.color; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(z.size * .45,0); ctx.stroke()
      }
      ctx.restore()
      continue
    }
    ctx.save(); ctx.globalAlpha = Math.pow(1 - t, 1.7) * 0.85 * opacity * (flashing ? 0.65 : 1); ctx.strokeStyle = z.color; ctx.lineWidth = (1 - t) * 4.6
    ctx.shadowColor = z.color; ctx.shadowBlur = reduced || flashing ? 0 : 9
    ctx.beginPath(); ctx.ellipse(x, y, 9 + z.size * easing(t), 4 + z.size * 0.36 * easing(t), 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }
}

// Branching lightning, layered core + glow, short lived to avoid clutter.
export function drawLightning(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false): void {
  for (const l of s.lightningFx) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of l.pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y) }
    if (maxX + ox < -20 || minX + ox > s.W + 20 || maxY + oy < -20 || minY + oy > s.H + 20) continue
    ctx.save(); ctx.globalAlpha = l.life / l.max
    for (let i = reducedMotion ? 2 : 0; i < LIGHTNING_LAYERS.length; i++) {
      const [w, col, blur] = LIGHTNING_LAYERS[i]!;
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = reducedMotion ? 0 : blur
      ctx.beginPath()
      l.pts.forEach((p, i) => (i ? ctx.lineTo(p.x + ox, p.y + oy) : ctx.moveTo(p.x + ox, p.y + oy)))
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** Reuse detailed 3x particle glows instead of doing a blurred Canvas fill per hit. */
export interface ParticleSpriteCache {
  makeCanvas: MakeCanvas
  sprites: Map<string, HTMLCanvasElement | null>
}

export function createParticleSpriteCache(makeCanvas: MakeCanvas): ParticleSpriteCache {
  return { makeCanvas, sprites: new Map() }
}

function particleSprite(cache: ParticleSpriteCache, color: string, radius: number): HTMLCanvasElement | null {
  // Quantize only cosmetic pixels, never gameplay hit radius. Fixed dimensions
  // allow the same low-cost drawImage path regardless of individual spark size.
  const r = Math.max(1, Math.min(15, Math.round(radius * 2) / 2))
  const key = color + ':' + r
  const cached = cache.sprites.get(key)
  if (cached !== undefined) return cached
  // A finite cache cannot accumulate unbounded variations in Endless mode.
  if (cache.sprites.size >= 64) cache.sprites.clear()
  const canvas = cache.makeCanvas(120, 120)
  const paint = canvas.getContext('2d')
  if (!paint) { cache.sprites.set(key, null); return null }
  paint.scale(3, 3)
  paint.shadowColor = color
  paint.shadowBlur = 21 // Seven CSS px after 3x rasterization.
  paint.fillStyle = color
  paint.beginPath()
  paint.arc(20, 20, r, 0, TAU)
  paint.fill()
  cache.sprites.set(key, canvas)
  return canvas
}

// Subpixel glowing debris, capped pool and reusable shape geometry.
export function drawFx(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false, cache?: ParticleSpriteCache, projectiles?: Partial<ProjectileSprites>): void {
  const { W, H } = s
  let painted = 0
  for (const f of s.fx) {
    if (reducedMotion && (f.type === 'footstep' || f.type === 'ember' || f.type === 'spark' || !f.type)) continue
    if (reducedMotion && painted++ >= 40) break
    const x = f.x + ox
    const y = f.y + oy
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue
    // Only cosmetic circular debris is cached; meteors, vortexes and ice keep
    // their authored, time-dependent silhouettes and existing animation.
    if (cache && !reducedMotion && f.r >= 1 && f.r <= 10 && (!f.type || f.type === 'spark' || f.type === 'ember' || f.type === 'footstep')) {
      const sprite = particleSprite(cache, f.color, f.r)
      if (sprite) {
        const previousAlpha = ctx.globalAlpha
        ctx.globalAlpha = previousAlpha * Math.max(0, f.life / f.max)
        ctx.drawImage(sprite, x - 20, y - 20, 40, 40)
        ctx.globalAlpha = previousAlpha
        continue
      }
    }
    ctx.save(); ctx.globalAlpha = Math.max(0, f.life / f.max)
    if (f.type === 'meteor') {
      const t = 1 - f.life / f.max
      ctx.strokeStyle = '#ffd6a7'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(x - 18 - t * 22, y - 42 - t * 90); ctx.lineTo(x, y); ctx.stroke()
      const radius = 12 + 12 * (1 - t)
      ctx.translate(x, y)
      if (!drawProjectileSprite(ctx, projectiles, 'enemy-ember', radius * 2)) {
        ctx.fillStyle = '#ffb065'; ctx.shadowColor = '#ffb065'; ctx.shadowBlur = 16
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill()
      }
    } else if (f.type === 'vortex') {
      const radius = 8 + Math.sin(f.life * 9) * 6
      ctx.translate(x, y)
      if (!drawProjectileSprite(ctx, projectiles, 'gravity-core', radius * 2)) {
        ctx.strokeStyle = f.color; ctx.lineWidth = 2.2; ctx.shadowColor = f.color; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke()
      }
    } else if (f.type === 'ice') {
      ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = reducedMotion ? 0 : 10
      ctx.beginPath(); ctx.moveTo(x, y - f.r); ctx.lineTo(x + f.r * 0.55, y + f.r); ctx.lineTo(x - f.r * 0.55, y + f.r); ctx.closePath(); ctx.fill()
    } else {
      ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = reducedMotion ? 0 : 7
      ctx.beginPath(); ctx.arc(x, y, f.r, 0, TAU); ctx.fill()
    }
    ctx.restore()
  }
}

export function drawNumbers(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false): void {
  // Three bounded passes: normal, important outgoing, incoming. No sort or temporary list.
  for (let tier = 0; tier < 3; tier++) {
    let budget = tier === 0 ? 32 : tier === 1 ? 12 : 4
    for (let i = s.numberFx.length - 1; i >= 0 && budget > 0; i--) {
      const z = s.numberFx[i]!
      if ((z.received ? 2 : z.critical || z.boss || z.kind === 'heal' || z.kind === 'evolved' || z.kind === 'hero' ? 1 : 0) !== tier) continue
      const x = z.x + ox, y = z.y + oy
    if (x < -80 || x > s.W + 80 || y < -80 || y > s.H + 80) continue
    budget--
    const critical = z.critical === true
    const received = z.received === true
    const severity = received ? z.severity : undefined
    const life = critical || severity ? 0.82 : received ? 0.7 : 0.62
    const progress = Math.max(0, Math.min(1, 1 - z.life / life))
    const opacity = Math.max(0, Math.min(1, z.life / (critical ? 0.28 : 0.4)))
    // A local pop makes confirmed crits readable without another full-screen reaction.
    const pop = reducedMotion ? 1 : 1 + Math.max(0, 1 - progress / 0.18) * (severity === 'extreme' ? .5 : severity ? .38 : .3)
    const px = Math.max(48, Math.min(s.W - 48, x))
    const py = Math.max(54, Math.min(s.H - 16, y))
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.textAlign = 'center'
    ctx.lineJoin = 'round'
    ctx.translate(px, py)
    if (pop !== 1) ctx.scale(pop, pop)
    ctx.lineWidth = critical ? 6 : received ? 5 : 4
    ctx.strokeStyle = critical ? '#321525' : received ? '#44121c' : '#151019e8'
    if (critical || severity) {
      const caption = translate(severity === 'extreme' ? (critical ? '極重暴擊!' : '極重擊!') : critical ? '暴擊!' : '重擊!')
      ctx.font = '900 12px system-ui'
      ctx.strokeText(caption, 0, -29)
      ctx.fillStyle = '#fff4bf'
      ctx.fillText(caption, 0, -29)
    }
    ctx.font = `900 ${severity === 'extreme' ? 33 : severity ? 28 : critical ? (z.boss ? 34 : 28) : received ? 22 : (z.boss || z.kind ? 21 : 16)}px system-ui`
    const label = received ? `−${z.value}` : z.kind === 'heal' ? `+${z.value}` : String(z.value)
    ctx.strokeText(label, 0, 0)
    ctx.fillStyle = severity ? '#ffd29b' : received ? '#ff737b' : critical ? '#ffba45' : z.kind === 'heal' ? '#9be9b6' : z.kind === 'elemental' ? '#9ae7ff' : z.kind === 'evolved' ? '#c6a0ff' : z.kind === 'hero' ? '#ffe49b' : z.boss || z.kind === 'heavy' ? '#ffca7c' : '#fff1d0'
    ctx.fillText(label, 0, 0)
    ctx.restore()
    }
  }
}

// Screen-space finishing: one-pass warm tint, vignette and high-contrast center.
export function drawVignette(ctx: Ctx2D, s: GameState): void {
  const { W, H } = s
  let cached = vignetteGradients.get(ctx)
  if (!cached || cached.W !== W || cached.H !== H) {
    const gradient = ctx.createRadialGradient(W * 0.52, H * 0.49, Math.min(W, H) * 0.19, W * 0.52, H * 0.49, Math.max(W, H) * 0.86)
    gradient.addColorStop(0, '#04070900'); gradient.addColorStop(0.7, '#0e112010'); gradient.addColorStop(1, '#06071596')
    cached = { W, H, gradient }
    vignetteGradients.set(ctx, cached)
  }
  ctx.fillStyle = cached.gradient
  ctx.fillRect(0, 0, W, H)
}
