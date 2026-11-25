import type { Ctx2D } from '../../render/ctx'
import type { BossSnapshot, BossTelegraph, BossImpact, BossProjectile } from './controller'
import type { BossId } from './definitions'
import { drawEnergyMissile, drawZoneMotes } from '../../render/energy-art'
import type { ProjectileArtId, ProjectileSprites } from '../../render/projectile-art'

const TAU = Math.PI * 2
const SAFE_HALF_ANGLE = Math.PI / 5
const DASH = [10, 9] as const
const SOLID: number[] = []
const clamp = (value: number) => Math.max(0, Math.min(1, value))

/**
 * Single Canvas 2D pass, shared by all 25 boss attacks.
 * No textures, gradients, shadows, timers or particle objects are created per frame.
 * All visual boundaries are derived from the controller's collision geometry.
 */
const PALETTES: Record<BossId, { core: string; glow: string; edge: string; muted: string }> = {
  'abyss-monarch': { core: '#f2d9ff', glow: '#a176ff', edge: '#d7a9ff', muted: '#552f89' },
  'frost-sovereign': { core: '#edfdff', glow: '#72caff', edge: '#b9f4ff', muted: '#346eaa' },
  'infernal-titan': { core: '#fff3c9', glow: '#ff7c3e', edge: '#ffba6b', muted: '#9c3527' },
  'eclipse-seraph': { core: '#fff9d9', glow: '#f0c777', edge: '#ffeaa6', muted: '#7455ad' },
}

type Palette = (typeof PALETTES)[BossId]
const MISSILE_ART: Record<BossId, ProjectileArtId> = {
  'abyss-monarch': 'enemy-hex', 'frost-sovereign': 'arcane-bolt',
  'infernal-titan': 'enemy-ember', 'eclipse-seraph': 'holy-lance',
}

function isVisible(t: BossTelegraph, ox: number, oy: number, w: number, h: number, padding = 25): boolean {
  const x = t.x + ox, y = t.y + oy
  if (t.shape === 'beam') {
    const ex = x + Math.cos(t.angle) * t.length, ey = y + Math.sin(t.angle) * t.length
    const m = t.width + padding
    return Math.max(x, ex) >= -m && Math.min(x, ex) <= w + m
      && Math.max(y, ey) >= -m && Math.min(y, ey) <= h + m
  }
  const radius = t.radius + padding
  return x + radius >= 0 && x - radius <= w && y + radius >= 0 && y - radius <= h
}

function drawRunes(ctx: Ctx2D, radius: number, charge: number, count: number): void {
  // All rune strokes are one batched path. Fixed count, no allocations.
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const angle = i * TAU / count + charge * 0.18
    const cs = Math.cos(angle), sn = Math.sin(angle)
    const from = radius - 12 - (i % 2) * 4
    ctx.moveTo(cs * from, sn * from)
    ctx.lineTo(cs * (radius - 2), sn * (radius - 2))
    if (i % 2 === 0) {
      const arc = angle + 0.12
      ctx.lineTo(Math.cos(arc) * (radius - 6), Math.sin(arc) * (radius - 6))
    }
  }
  ctx.stroke()
}

function drawTelegraph(ctx: Ctx2D, t: BossTelegraph, ox: number, oy: number,
  palette: Palette, reduced: boolean, w: number, h: number): void {
  if (!isVisible(t, ox, oy, w, h)) return
  const x = t.x + ox, y = t.y + oy
  const charge = clamp(t.progress ?? 0)
  const active = t.stage === 'active'
  const harmless = t.harmless
  const ink = harmless ? palette.glow : t.color
  // A distinct static 2D warning surface remains legible with reduced motion.
  const wash = harmless ? 0.08 : active ? 0.18 : 0.11 + charge * 0.13
  const emphasis = reduced ? 0.56 : active ? 0.7 : 0.6 + charge * 0.35
  ctx.save()
  try {
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.fillStyle = ink
    ctx.strokeStyle = ink
    ctx.globalAlpha = wash
    ctx.lineWidth = 2.5

    if (t.shape === 'beam') {
      ctx.translate(x, y)
      ctx.rotate(t.angle)
      // Warning exactly follows the capsule hitbox: width is half-width.
      ctx.beginPath()
      ctx.lineWidth = t.width * 2
      ctx.moveTo(0, 0)
      ctx.lineTo(t.length, 0)
      ctx.stroke()
      ctx.globalAlpha = emphasis
      ctx.lineWidth = 2.2
      ctx.strokeStyle = palette.edge
      ctx.beginPath()
      ctx.moveTo(0, -t.width); ctx.lineTo(t.length, -t.width)
      ctx.moveTo(0, t.width); ctx.lineTo(t.length, t.width)
      ctx.stroke()
      if (!reduced) {
        ctx.globalAlpha = 0.35 + charge * 0.55
        ctx.strokeStyle = palette.core
        ctx.lineWidth = 1.6 + charge * 1.4
        ctx.setLineDash(DASH as unknown as number[])
        ctx.beginPath()
        ctx.moveTo(t.length * (1 - charge), 0); ctx.lineTo(t.length, 0)
        ctx.stroke()
        ctx.setLineDash(SOLID)
        // Forward-facing spearhead. It communicates direction, not an extra hitbox.
        ctx.beginPath()
        ctx.moveTo(t.length - 19, -9); ctx.lineTo(t.length, 0); ctx.lineTo(t.length - 19, 9)
        ctx.stroke()
      }
      return
    }

    ctx.beginPath()
    if (t.shape === 'arena') {
      // Paint only the lethal sector. The wedge remains completely unpainted.
      ctx.moveTo(x, y)
      ctx.arc(x, y, t.radius, t.safeAngle + SAFE_HALF_ANGLE, t.safeAngle + TAU - SAFE_HALF_ANGLE)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = emphasis
      ctx.strokeStyle = palette.edge
      ctx.lineWidth = 3
      ctx.stroke()
      // Deliberately readable safe-lane guide (not a claimed extra safe area).
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(t.safeAngle - SAFE_HALF_ANGLE) * t.radius,
        y + Math.sin(t.safeAngle - SAFE_HALF_ANGLE) * t.radius)
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(t.safeAngle + SAFE_HALF_ANGLE) * t.radius,
        y + Math.sin(t.safeAngle + SAFE_HALF_ANGLE) * t.radius)
      ctx.strokeStyle = '#a9ffe1'
      ctx.lineWidth = reduced ? 2 : 3
      ctx.stroke()
      if (!reduced) {
        ctx.beginPath()
        ctx.arc(x, y, t.radius * 0.93, t.safeAngle - SAFE_HALF_ANGLE, t.safeAngle + SAFE_HALF_ANGLE)
        ctx.lineWidth = 3
        ctx.stroke()
      }
      return
    }

    ctx.arc(x, y, t.radius, 0, TAU)
    if (t.shape === 'ring' && t.innerRadius > 0) {
      ctx.moveTo(x + t.innerRadius, y)
      ctx.arc(x, y, t.innerRadius, 0, TAU, true)
      ctx.fill('evenodd')
    } else ctx.fill()
    ctx.globalAlpha = emphasis
    ctx.strokeStyle = palette.edge
    ctx.lineWidth = 3
    ctx.stroke()

    if (t.shape === 'ring' && t.innerRadius > 0) {
      ctx.beginPath()
      ctx.arc(x, y, t.innerRadius, 0, TAU)
      ctx.stroke()
    }
    drawZoneMotes(ctx, x, y, t.radius, t.shape === 'ring' ? t.innerRadius : 0, charge, palette.core, reduced)
    if (reduced) return
    ctx.strokeStyle = harmless ? palette.core : palette.glow
    ctx.globalAlpha = active ? 0.55 : 0.38 + charge * 0.48
    ctx.lineWidth = 1.8
    ctx.setLineDash(DASH as unknown as number[])
    ctx.beginPath()
    const inner = t.shape === 'ring' ? (t.innerRadius + t.radius) / 2 : t.radius * (0.82 - charge * 0.14)
    ctx.arc(x, y, Math.max(4, inner), 0, TAU)
    ctx.stroke()
    ctx.setLineDash(SOLID)
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = palette.core
    ctx.lineWidth = 2
    drawRunes(ctx, Math.max(18, t.radius * (harmless ? 0.74 : 0.9)), charge, harmless ? 10 : 8)
    ctx.restore()
  } finally {
    ctx.restore()
  }
}

function drawProjectile(ctx: Ctx2D, p: BossProjectile, ox: number, oy: number,
  palette: Palette, reduced: boolean, w: number, h: number,
  art: ProjectileArtId, sprites?: Partial<ProjectileSprites>): void {
  const x = p.x + ox, y = p.y + oy
  const margin = Math.max(35, p.radius * 4)
  if (x < -margin || y < -margin || x > w + margin || y > h + margin) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.atan2(p.vy, p.vx))
  ctx.globalAlpha = 0.95
  drawEnergyMissile(ctx, sprites, art, Math.max(2, p.radius), p.life, palette.edge, palette.core, reduced)
  ctx.restore()
}

/** Under-actor warning pass; fixed hitbox geometry, time-based windup and clear safe zones. */
export function drawBossTelegraphs(ctx: Ctx2D, snapshot: BossSnapshot, ox: number, oy: number,
  reducedMotion = false, viewportWidth = Infinity, viewportHeight = Infinity,
  sprites?: Partial<ProjectileSprites>): void {
  if (!snapshot.id) return
  const palette = PALETTES[snapshot.id]
  ctx.save()
  try {
    for (const t of snapshot.telegraphs)
      drawTelegraph(ctx, t, ox, oy, palette, reducedMotion, viewportWidth, viewportHeight)
    for (const p of snapshot.projectiles)
      drawProjectile(ctx, p, ox, oy, palette, reducedMotion, viewportWidth, viewportHeight, MISSILE_ART[snapshot.id], sprites)
  } finally {
    ctx.restore()
  }
}

function drawImpact(ctx: Ctx2D, impact: BossImpact, ox: number, oy: number,
  palette: Palette, reduced: boolean, w: number, h: number): void {
  if (!(impact.max > 0) || impact.life <= 0 || !isVisible(impact, ox, oy, w, h, 55)) return
  const phase = clamp(1 - impact.life / impact.max)
  const fade = (1 - phase) ** 2
  const x = impact.x + ox, y = impact.y + oy
  ctx.save()
  try {
    ctx.translate(x, y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = Math.min(0.73, fade * 0.7)
    ctx.strokeStyle = palette.core
    ctx.lineWidth = reduced ? 2.2 : 4.8 * (1 - phase * 0.55)
    if (impact.shape === 'beam') {
      ctx.rotate(impact.angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(impact.length, 0)
      ctx.stroke()
      if (!reduced) {
        ctx.strokeStyle = palette.glow
        ctx.globalAlpha *= 0.65
        ctx.lineWidth = Math.max(2, impact.width * 1.5 * (1 - phase))
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(impact.length, 0)
        ctx.stroke()
      }
      return
    }
    const radius = impact.shape === 'ring'
      ? impact.innerRadius + (impact.radius - impact.innerRadius) * (0.25 + 0.75 * phase)
      : impact.radius * (0.18 + 0.82 * phase)
    ctx.beginPath()
    if (impact.shape === 'arena') {
      ctx.arc(0, 0, radius, impact.safeAngle + SAFE_HALF_ANGLE, impact.safeAngle + TAU - SAFE_HALF_ANGLE)
    } else ctx.arc(0, 0, radius, 0, TAU)
    ctx.stroke()
    if (reduced) return
    ctx.strokeStyle = palette.glow
    ctx.globalAlpha = Math.min(0.55, fade * 0.52)
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(0, 0, radius * 0.74, 0, TAU)
    ctx.stroke()
    // Batched shards differ by palette and hit radius; never obscure the central hero.
    const count = impact.harmless ? 6 : 9
    ctx.strokeStyle = palette.edge
    ctx.globalAlpha = Math.min(0.66, fade * 0.66)
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const a = (i + (impact.attackId.length % 4) / 4) * TAU / count
      const d = Math.max(12, radius * 0.72)
      const r = Math.max(8, impact.radius * 0.13)
      ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
      ctx.lineTo(Math.cos(a) * (d + r), Math.sin(a) * (d + r))
    }
    ctx.stroke()
  } finally {
    ctx.restore()
  }
}

/** Above-actor short-lived release accents; presentation cannot affect collision. */
export function drawBossImpacts(ctx: Ctx2D, snapshot: BossSnapshot, ox: number, oy: number,
  reducedMotion = false, viewportWidth = Infinity, viewportHeight = Infinity): void {
  if (!snapshot.id || !snapshot.impacts?.length) return
  ctx.save()
  try {
    const palette = PALETTES[snapshot.id]
    for (const impact of snapshot.impacts)
      drawImpact(ctx, impact, ox, oy, palette, reducedMotion, viewportWidth, viewportHeight)
  } finally {
    ctx.restore()
  }
}
