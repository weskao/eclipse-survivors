import { t as translate } from '../../i18n'
import { DASH_COOLDOWN, LOW_HP_PCT, TAU } from '../constants'
import { easing } from '../math'
import type { GameState, Hero } from '../types'
import type { Ctx2D } from './ctx'
import type { MakeCanvas } from './sprites'
import { softGlow } from './environment'
import { drawProjectileSprite, type ProjectileSprites } from './projectile-art'
import { drawEnergyTrail, drawZoneMotes } from './energy-art'

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
  for (const star of s.stars) {
    const x = star.x + ox
    const y = star.y + oy
    if (x < -25 || x > W + 25 || y < -25 || y > H + 25) continue
    const bob = reducedMotion ? 0 : Math.sin(star.t * 4) * 3
    ctx.save(); ctx.translate(x, y + bob - 7); if (!reducedMotion) ctx.rotate(Math.sin(star.t * 2) * 0.11)
    if (gems) {
      ctx.drawImage(star.value > 10 ? gems.rare : gems.common, -16, -16, 32, 32)
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
export function drawHeroAuras(ctx: Ctx2D, s: GameState, hero: Hero, ox: number, oy: number, reducedMotion = false): void {
  const q = reducedMotion ? 0 : s.worldClock
  const blaze = hero.skills.blaze
  if (blaze) {
    ctx.save(); ctx.translate(hero.x + ox, hero.y + oy); ctx.globalAlpha = 0.55
    for (let k = 0; k < 3 + blaze; k++) {
      const a = q * 3 + k * TAU / (3 + blaze)
      const r = 38 + blaze * 5 + Math.sin(q * 5 + k) * 6
      ctx.fillStyle = BLAZE_COLORS[k % 3]!
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.55 - 18, 9, 5, a, 0, TAU); ctx.fill()
    }
    ctx.restore()
  }
  const shield = hero.skills.shield
  if (hero.evolutions['guardian-sanctuary']) {
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
  if (shield) {
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
export function drawHeroStatus(ctx: Ctx2D, s: GameState, hero: Hero, ox: number, oy: number, reducedMotion = false): void {
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
  if (hero.hp < hero.max) {
    const pct = hero.hp / hero.max * 100
    const critical = pct <= LOW_HP_PCT
    const left = x - STATUS_BAR_WIDTH / 2
    const top = y + 22
    ctx.save()
    ctx.fillStyle = '#070c11d9'
    ctx.fillRect(left, top, STATUS_BAR_WIDTH, 6)
    ctx.fillStyle = critical ? '#ff4250' : '#d65854'
    ctx.fillRect(left, top, STATUS_BAR_WIDTH * pct / 100, 6)
    if (critical) {
      // Outline keeps the critical state readable without relying on hue alone.
      ctx.strokeStyle = '#ffe3d3'
      ctx.lineWidth = 1
      ctx.strokeRect(left, top, STATUS_BAR_WIDTH, 6)
    }
    ctx.restore()
  }
}

// Weapon ribbons: radial gold-to-ivory gradients with trailing sparkle and wave afterglow.
export function drawSwipes(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  const ribbon = ['#fff4d1', '#f8bb66', '#ff9549']
  const widths = [7, 4, 1.4]
  for (const sw of s.swipes) {
    const t = 1 - sw.life / sw.max
    const x = sw.x + ox
    const y = sw.y + oy
    const r = sw.r + easing(t) * 32
    ctx.save(); ctx.globalAlpha = Math.pow(1 - t, 0.75); ctx.lineCap = 'round'; ctx.shadowBlur = 13; ctx.shadowColor = '#ffc56c'
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = ribbon[k]!; ctx.lineWidth = widths[k]! * (1 - t * 0.55)
      ctx.beginPath(); ctx.arc(x, y, r - k * 5, sw.a - 1.02 - t * 0.23, sw.a + 1.2 + t * 0.18); ctx.stroke()
    }
    for (let j = 0; j < 5; j++) {
      const a = sw.a - 1 + t * 2 + j * 0.11
      ctx.fillStyle = '#ffefc8'
      ctx.fillRect(x + Math.cos(a) * (r + 5 + j * 2), y + Math.sin(a) * (r + 5 + j * 2), 2.5, 2.5)
    }
    ctx.restore()
  }
}

// Fast arrows leave stretched trails. Arcane bolts cast a soft violet halo.
export function drawShots(ctx: Ctx2D, s: GameState, ox: number, oy: number, magicGlow?: HTMLCanvasElement | null, projectiles?: Partial<ProjectileSprites>, reduced = false): void {
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
    if (history > 2) {
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
      drawEnergyTrail(ctx, b.r, b.life, '#c3adff', reduced)
      if (!drawProjectileSprite(ctx, projectiles, 'arcane-bolt', 60)) {
      if (magicGlow) {
        ctx.drawImage(magicGlow, -28, -28, 56, 56)
      } else {
        // Preserve standalone renderer behavior when no prepainted asset is supplied.
        const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 28)
        gl.addColorStop(0, '#f2eaff'); gl.addColorStop(0.2, '#a6d8ff'); gl.addColorStop(0.44, '#937af7b9'); gl.addColorStop(1, '#9170ec00')
        ctx.fillStyle = gl
        ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill()
      }
      ctx.strokeStyle = '#d6baff80'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(0, 0); ctx.stroke()
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
  const n = Math.min(orb + 1 + (evolved ? 2 : 0), 8)
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
export function drawImpactWaves(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  for (const z of s.impactWaves) {
    const t = 1 - z.life / z.max
    const x = z.x + ox
    const y = z.y + oy
    const reach = z.size + 15
    if (x < -reach || x > s.W + reach || y < -reach || y > s.H + reach) continue
    ctx.save(); ctx.globalAlpha = Math.pow(1 - t, 1.7) * 0.85; ctx.strokeStyle = z.color; ctx.lineWidth = (1 - t) * 4.6
    ctx.shadowColor = z.color; ctx.shadowBlur = 9
    ctx.beginPath(); ctx.ellipse(x, y, 9 + z.size * easing(t), 4 + z.size * 0.36 * easing(t), 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }
}

// Branching lightning, layered core + glow, short lived to avoid clutter.
export function drawLightning(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false): void {
  for (const l of s.lightningFx) {
    ctx.save(); ctx.globalAlpha = l.life / l.max
    for (const [w, col, blur] of reducedMotion ? [LIGHTNING_LAYERS[2]!] : LIGHTNING_LAYERS) {
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
  for (const z of s.numberFx) {
    const x = z.x + ox, y = z.y + oy
    if (x < -80 || x > s.W + 80 || y < -80 || y > s.H + 80) continue
    const critical = z.critical === true
    const received = z.received === true
    const life = critical ? 0.82 : received ? 0.7 : 0.62
    const progress = Math.max(0, Math.min(1, 1 - z.life / life))
    const opacity = Math.max(0, Math.min(1, z.life / (critical ? 0.28 : 0.4)))
    // A local pop makes confirmed crits readable without another full-screen reaction.
    const pop = reducedMotion ? 1 : 1 + Math.max(0, 1 - progress / 0.18) * 0.3
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
    if (critical) {
      ctx.font = '900 12px system-ui'
      ctx.strokeText(translate('暴擊!'), 0, -29)
      ctx.fillStyle = '#fff4bf'
      ctx.fillText(translate('暴擊!'), 0, -29)
    }
    ctx.font = `900 ${critical ? (z.boss ? 34 : 28) : received ? 22 : (z.boss ? 21 : 16)}px system-ui`
    const label = received ? `−${z.value}` : String(z.value)
    ctx.strokeText(label, 0, 0)
    ctx.fillStyle = received ? '#ff737b' : critical ? '#ffba45' : z.boss ? '#ffca7c' : '#fff1d0'
    ctx.fillText(label, 0, 0)
    ctx.restore()
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
