import { TAU } from '../constants'
import { easing } from '../math'
import type { GameState, Hero } from '../types'
import type { Ctx2D } from './ctx'
import { softGlow } from './environment'

const BLAZE_COLORS = ['#ffd8a0', '#ff9e4c', '#ff6b31']
const LIGHTNING_LAYERS = [[9, '#63b7ff', 15], [4, '#b3deff', 10], [1.4, '#ffffff', 3]] as const

// Magical gems have faceted highlights and small animated coronae.
export function drawStars(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false): void {
  const { W, H } = s
  for (const star of s.stars) {
    const x = star.x + ox
    const y = star.y + oy
    if (x < -25 || x > W + 25 || y < -25 || y > H + 25) continue
    const bob = reducedMotion ? 0 : Math.sin(star.t * 4) * 3
    ctx.save(); ctx.translate(x, y + bob - 7); if (!reducedMotion) ctx.rotate(Math.sin(star.t * 2) * 0.11)
    ctx.shadowBlur = 12; ctx.shadowColor = star.value > 10 ? '#f8bd67' : '#75cfff'; ctx.fillStyle = star.value > 10 ? '#ffc77c' : '#8ddffe'
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, -1); ctx.lineTo(0, 10); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill()
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffffb8'
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 6); ctx.lineTo(-3, -1); ctx.closePath(); ctx.fill()
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
    ctx.beginPath(); ctx.arc(hero.x + ox, hero.y + oy - 24, 45 + (1 - t) * 24, 0, TAU); ctx.stroke()
    ctx.restore()
    ctx.save(); ctx.globalAlpha = t; ctx.textAlign = 'center'; ctx.font = '900 28px system-ui'
    ctx.fillStyle = '#fff5d5'; ctx.strokeStyle = '#5c4722'; ctx.lineWidth = 5
    ctx.strokeText('LEVEL UP!', hero.x + ox, hero.y - 88 + oy); ctx.fillText('LEVEL UP!', hero.x + ox, hero.y - 88 + oy)
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
export function drawShots(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  const { W, H } = s
  for (const b of s.shots) {
    const x = b.x + ox
    const y = b.y + oy
    const a = Math.atan2(b.vy, b.vx)
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue
    // Motion history is drawn in world space to avoid faking a longer shaft.
    const tx = (b.prevX ?? b.x) + ox
    const ty = (b.prevY ?? b.y) + oy
    const history = Math.hypot(x - tx, y - ty)
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
      ctx.shadowBlur = 13; ctx.shadowColor = '#ffc474'; ctx.strokeStyle = '#ffeac2'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(-29, 0); ctx.lineTo(10, 0); ctx.stroke()
      ctx.fillStyle = '#fff3d5'
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(1, -5); ctx.lineTo(3, 0); ctx.lineTo(1, 5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#ddac77'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-11, 0); ctx.lineTo(-15, 4); ctx.stroke()
    } else {
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 28)
      gl.addColorStop(0, '#f2eaff'); gl.addColorStop(0.2, '#a6d8ff'); gl.addColorStop(0.44, '#937af7b9'); gl.addColorStop(1, '#9170ec00')
      ctx.fillStyle = gl
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill()
      ctx.strokeStyle = '#d6baff80'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(0, 0); ctx.stroke()
    }
    ctx.restore()
  }
}

export function drawOrbs(ctx: Ctx2D, s: GameState, hero: Hero, ox: number, oy: number): void {
  const orb = hero.skills.orb
  if (!orb) return
  const q = s.worldClock
  const n = Math.min(orb + 1, 6)
  for (let k = 0; k < n; k++) {
    const a = q * 2.7 + k * TAU / n
    const x = hero.x + ox + Math.cos(a) * 71
    const y = hero.y + oy + Math.sin(a) * 71
    ctx.save(); ctx.translate(x, y); ctx.rotate(q * 3)
    ctx.shadowColor = '#a6eaff'; ctx.shadowBlur = 15; ctx.strokeStyle = '#e1f3ff'; ctx.lineWidth = 2.5
    ctx.strokeRect(-8, -8, 16, 16)
    ctx.restore()
  }
}

// Expanding contact rings / shock waves.
export function drawImpactWaves(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  for (const z of s.impactWaves) {
    const t = 1 - z.life / z.max
    const x = z.x + ox
    const y = z.y + oy
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

// Subpixel glowing debris, capped pool and reusable shape geometry.
export function drawFx(ctx: Ctx2D, s: GameState, ox: number, oy: number, reducedMotion = false): void {
  const { W, H } = s
  let painted = 0
  for (const f of s.fx) {
    if (reducedMotion && (f.type === 'footstep' || f.type === 'ember' || f.type === 'spark' || !f.type)) continue
    if (reducedMotion && painted++ >= 40) break
    const x = f.x + ox
    const y = f.y + oy
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue
    ctx.save(); ctx.globalAlpha = Math.max(0, f.life / f.max)
    if (f.type === 'meteor') {
      const t = 1 - f.life / f.max
      ctx.strokeStyle = '#ffd6a7'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(x - 18 - t * 22, y - 42 - t * 90); ctx.lineTo(x, y); ctx.stroke()
      ctx.fillStyle = '#ffb065'; ctx.shadowColor = '#ffb065'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(x, y, 12 + 12 * (1 - t), 0, TAU); ctx.fill()
    } else if (f.type === 'vortex') {
      ctx.strokeStyle = f.color; ctx.lineWidth = 2.2; ctx.shadowColor = f.color; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(x, y, 8 + Math.sin(f.life * 9) * 6, 0, TAU); ctx.stroke()
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

export function drawNumbers(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  for (const z of s.numberFx) {
    const a = Math.max(0, Math.min(1, z.life / 0.4))
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round'
    ctx.font = `900 ${z.boss ? '21' : '16'}px system-ui`
    ctx.lineWidth = 4; ctx.strokeStyle = '#151019e8'
    ctx.strokeText(String(z.value), z.x + ox, z.y + oy)
    ctx.fillStyle = z.boss ? '#ffca7c' : '#fff1d0'
    ctx.fillText(String(z.value), z.x + ox, z.y + oy)
    ctx.restore()
  }
}

// Screen-space finishing: one-pass warm tint, vignette and high-contrast center.
export function drawVignette(ctx: Ctx2D, s: GameState): void {
  const { W, H } = s
  const vg = ctx.createRadialGradient(W * 0.52, H * 0.49, Math.min(W, H) * 0.19, W * 0.52, H * 0.49, Math.max(W, H) * 0.86)
  vg.addColorStop(0, '#04070900'); vg.addColorStop(0.7, '#0e112010'); vg.addColorStop(1, '#06071596')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}
