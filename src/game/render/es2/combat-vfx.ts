import type { ContentVisualFx, GameState } from '../../types'
import type { Ctx2D } from '../ctx'

/** Lightweight ES2 VFX: cached immutable directions, bounded geometry, no per-frame gradients. */
export const COMBAT_FX_SPECS = [
  { kind: 'critical-hit', id: 'combat-vfx:critical-hit', title: 'Critical Impact', duration: 0.52, radius: 110 },
  { kind: 'sword-slash', id: 'combat-vfx:sword-slash', title: 'Directional Sword Arc', duration: 0.42, radius: 122 },
  { kind: 'projectile-trail', id: 'combat-vfx:projectile-trail', title: 'Projectile Release Trail', duration: 0.34, radius: 128 },
  { kind: 'spell-cast', id: 'combat-vfx:spell-cast', title: 'Arcane Conjuration', duration: 0.72, radius: 110 },
  { kind: 'frost-impact', id: 'combat-vfx:frost-impact', title: 'Frost Shatter', duration: 0.62, radius: 112 },
  { kind: 'lightning-chain', id: 'combat-vfx:lightning-chain', title: 'Chain Lightning', duration: 0.34, radius: 152 },
  { kind: 'fire-eruption', id: 'combat-vfx:fire-eruption', title: 'Infernal Eruption', duration: 0.72, radius: 142 },
  { kind: 'poison-cloud', id: 'combat-vfx:poison-cloud', title: 'Corruption Miasma', duration: 1.8, radius: 132 },
  { kind: 'gravity-vortex', id: 'combat-vfx:gravity-vortex', title: 'Singularity Spiral', duration: 1.25, radius: 148 },
  { kind: 'boss-entrance', id: 'combat-vfx:boss-entrance', title: 'Boss Arrival', duration: 2.3, radius: 182 },
  { kind: 'boss-phase', id: 'combat-vfx:boss-phase', title: 'Boss Metamorphosis', duration: 1.5, radius: 172 },
  { kind: 'shield-impact', id: 'combat-vfx:shield-impact', title: 'Aegis Absorption', duration: 0.56, radius: 112 },
  { kind: 'dash-afterimage', id: 'combat-vfx:dash-afterimage', title: 'Dash Echo', duration: 0.48, radius: 145 },
  { kind: 'evolution-awakening', id: 'combat-vfx:evolution-awakening', title: 'Evolution Awakening', duration: 1.8, radius: 174 },
  { kind: 'chest-opening', id: 'combat-vfx:chest-opening', title: 'Treasure Revelation', duration: 1.15, radius: 142 },
  { kind: 'enemy-death', id: 'combat-vfx:enemy-death', title: 'Soul Dissolution', duration: 0.7, radius: 124 },
  { kind: 'ultimate-attack', id: 'combat-vfx:ultimate-attack', title: 'Ultimate Release', duration: 1.1, radius: 190 },
  { kind: 'victory-finish', id: 'combat-vfx:victory-finish', title: 'Victory Benediction', duration: 2.4, radius: 195 },
] as const

export type CombatFxKind = (typeof COMBAT_FX_SPECS)[number]['kind']
export type FxQuality = 'low' | 'medium' | 'high'
export type LiveSetting<T> = T | (() => T)
export interface CombatVfxPreferences {
  quality?: LiveSetting<FxQuality>
  reducedMotion?: LiveSetting<boolean>
  reducedFlashing?: LiveSetting<boolean>
}
export interface DirectedCombatFx extends ContentVisualFx {
  /** Frozen at emission to avoid changing a slash's trajectory when the player turns. */
  angle?: number
}

export const COMBAT_FX_BY_KIND = new Map<CombatFxKind, (typeof COMBAT_FX_SPECS)[number]>(
  COMBAT_FX_SPECS.map(spec => [spec.kind, spec]),
)
// The only trigonometric table is immutable. No particles or vectors are allocated per frame.
const TAU = Math.PI * 2
const DIRS = Object.freeze(Array.from({ length: 24 }, (_, i) => Object.freeze({
  x: Math.cos(i * TAU / 24), y: Math.sin(i * TAU / 24),
})))
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t) }
const live = <T>(setting: LiveSetting<T> | undefined, fallback: T): T =>
  typeof setting === 'function' ? (setting as () => T)() : (setting ?? fallback)

function ring(ctx: Ctx2D, r: number, color: string, width = 2, y = 0, aspect = 1): void {
  ctx.strokeStyle = color; ctx.lineWidth = width
  ctx.beginPath(); ctx.ellipse(0, y, Math.max(0.1, r), Math.max(0.1, r * aspect), 0, 0, TAU); ctx.stroke()
}
function rays(ctx: Ctx2D, count: number, inner: number, outer: number, color: string, offset = 0): void {
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'
  ctx.beginPath()
  const stride = 24 / count
  for (let i = 0; i < count; i++) {
    const v = DIRS[Math.floor(i * stride) % 24]!
    const co = Math.cos(offset), si = Math.sin(offset)
    const x = v.x * co - v.y * si, y = v.y * co + v.x * si
    ctx.moveTo(x * inner, y * inner); ctx.lineTo(x * outer, y * outer)
  }
  ctx.stroke()
}
function shards(ctx: Ctx2D, count: number, distance: number, size: number, color: string, phase: number): void {
  ctx.fillStyle = color
  const stride = 24 / count
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const v = DIRS[Math.floor(i * stride) % 24]!
    const x = v.x * distance, y = v.y * distance
    const w = size * (i % 3 === 0 ? 1.4 : 0.8)
    ctx.moveTo(x + v.x * w * (1 + phase), y + v.y * w * (1 + phase))
    ctx.lineTo(x - v.y * w * 0.45, y + v.x * w * 0.45)
    ctx.lineTo(x - v.x * w * 0.5, y - v.y * w * 0.5)
    ctx.lineTo(x + v.y * w * 0.45, y - v.x * w * 0.45)
    ctx.closePath()
  }
  ctx.fill()
}
function spiral(ctx: Ctx2D, arms: number, radius: number, phase: number, color: string, steps: number): void {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath()
  for (let a = 0; a < arms; a++) {
    for (let i = 0; i <= steps; i++) {
      const f = i / steps
      const angle = a * TAU / arms + f * Math.PI * 1.35 + phase * TAU * 0.25
      const x = Math.cos(angle) * (7 + radius * f)
      const y = Math.sin(angle) * (7 + radius * f) * 0.65
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
}

/**
 * Called only from ContentEffectDefinition.draw or a test. The registry owns the
 * effect queue and restores its caller context; this function also restores its
 * own transform on exception. World coordinates are never converted twice.
 */
export function drawCombatEffect(
  ctx: Ctx2D, state: GameState, effect: ContentVisualFx, ox: number, oy: number,
  kind: CombatFxKind, settings: CombatVfxPreferences = {},
): void {
  const spec = COMBAT_FX_BY_KIND.get(kind)
  if (!spec || !(effect.max > 0) || !(effect.life > 0)) return
  const x = effect.x + ox, y = effect.y + oy
  const bounds = spec.radius + 12
  if (x < -bounds || x > state.W + bounds || y < -bounds || y > state.H + bounds) return

  const reduced = live(settings.reducedMotion, false)
  const flashing = live(settings.reducedFlashing, false)
  const quality = live(settings.quality, 'high')
  const count = reduced ? 4 : quality === 'low' ? 4 : quality === 'medium' ? 8 : 12
  const raw = clamp(1 - effect.life / effect.max)
  // Anticipation (0-16%), strike/expansion (16-72%), fade (72-100%).
  const t = reduced ? 0.42 : raw
  const strike = ease((t - 0.16) / 0.55)
  const fade = clamp((1 - raw) / 0.28)
  const anticipation = ease(raw / 0.16)
  const alpha = Math.min(flashing ? 0.55 : 0.88, (raw < 0.16 ? 0.22 + anticipation * 0.48 : 0.88) * fade)
  const angle = (effect as DirectedCombatFx).angle
  ctx.save()
  try {
    ctx.translate(x, y)
    if (Number.isFinite(angle)) ctx.rotate(angle!)
    ctx.globalAlpha = alpha
    ctx.lineJoin = 'round'
    ctx.shadowBlur = 0 // Native Canvas shadows are expensive with large crowds.
    switch (kind) {
      case 'critical-hit':
        ring(ctx, 10 + strike * 52, '#ffc577', 5 - 2 * strike)
        rays(ctx, count, 8 + strike * 16, 24 + strike * 76, '#fff1cd', t)
        shards(ctx, count, 15 + strike * 65, 7 * (1 - strike * 0.55), '#f6a75e', strike)
        break
      case 'sword-slash': {
        ctx.strokeStyle = '#ffc577'; ctx.lineCap = 'round'
        ctx.lineWidth = 11 - strike * 5
        ctx.beginPath(); ctx.arc(0, 0, 44 + strike * 33, -1.35 + strike * 0.58, 0.42 + strike * 0.75); ctx.stroke()
        ctx.strokeStyle = '#fff4d7'; ctx.lineWidth = 2.4
        ctx.beginPath(); ctx.arc(0, 0, 49 + strike * 33, -1.17 + strike * 0.58, 0.52 + strike * 0.75); ctx.stroke()
        shards(ctx, count, 55 + strike * 33, 3, '#ffb66f', t)
        break
      }
      case 'projectile-trail': {
        // Short-lived muzzle/release ribbon, not a false visual projectile hitbox.
        ctx.strokeStyle = '#e0e9ff'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(-90 * (1 - strike), 0); ctx.lineTo(24 + strike * 22, 0); ctx.stroke()
        ctx.strokeStyle = '#a3b3ed'; ctx.lineWidth = 1.6
        ctx.beginPath(); ctx.moveTo(-54 * (1 - strike), -7); ctx.lineTo(7 + strike * 32, -2); ctx.stroke()
        shards(ctx, count, 10 + strike * 36, 2, '#ffe2b2', t)
        break
      }
      case 'spell-cast':
        ring(ctx, 16 + strike * 33, '#bdacff', 3)
        ring(ctx, 31 + strike * 40, '#75d6ee', 1.5)
        rays(ctx, count, 25 + strike * 12, 48 + strike * 27, '#e7d9ff', t)
        break
      case 'frost-impact':
        ring(ctx, 12 + strike * 61, '#94dfff', 3)
        shards(ctx, count, 18 + strike * 74, 12 * (1 - 0.42 * strike), '#d5f9ff', strike)
        rays(ctx, count, 8, 22 + strike * 44, '#70b6e8', 0)
        break
      case 'lightning-chain': {
        ctx.strokeStyle = '#b3deff'; ctx.lineWidth = 4
        ctx.beginPath(); ctx.moveTo(-57, -31)
        for (let i = 0; i < count; i++) {
          const p = i / (count - 1)
          ctx.lineTo(-57 + p * 120, -31 + p * 71 + (i % 2 ? -13 : 13) * (1 - strike * 0.35))
        }
        ctx.stroke()
        ring(ctx, 7 + strike * 20, '#edf8ff', 2)
        shards(ctx, count, 16 + strike * 34, 4, '#8cd9ff', t)
        break
      }
      case 'fire-eruption':
        ring(ctx, 18 + strike * 50, '#ff9452', 4, 0, 0.42)
        ctx.fillStyle = '#ffd79a'
        ctx.beginPath()
        for (let i = 0; i < count; i++) {
          const v = DIRS[Math.floor(i * 24 / count)]!
          const base = v.x * (12 + strike * 50)
          const height = 35 + (i % 3) * 14 + strike * 45
          ctx.moveTo(base - 8, 4); ctx.lineTo(base, -height); ctx.lineTo(base + 8, 2); ctx.closePath()
        }
        ctx.fill()
        shards(ctx, count, 20 + strike * 58, 4, '#ec6b38', strike)
        break
      case 'poison-cloud':
        ring(ctx, 30 + strike * 52, '#7cbe80', 4, 0, 0.5)
        for (let i = 0; i < count; i++) {
          const v = DIRS[Math.floor(i * 24 / count)]!
          ring(ctx, 7 + (i % 3) * 4 + strike * 6, i % 2 ? '#80b66b' : '#ad8bc2', 2,
            v.y * (25 + strike * 46), 0.55)
        }
        break
      case 'gravity-vortex':
        ring(ctx, 15 + strike * 57, '#a08cd5', 3, 0, 0.65)
        spiral(ctx, reduced ? 2 : 3, 31 + strike * 58, t, '#c8b3f9', count)
        ring(ctx, 8 + strike * 6, '#ece2ff', 3)
        break
      case 'boss-entrance':
        ring(ctx, 50 + strike * 82, '#ad5975', 4, 0, 0.5)
        ring(ctx, 70 + strike * 52, '#e3b38a', 2, 0, 0.5)
        rays(ctx, count, 43 + strike * 24, 85 + strike * 52, '#bf7584', t)
        break
      case 'boss-phase':
        ring(ctx, 26 + strike * 87, '#ed7d9d', 5)
        spiral(ctx, reduced ? 2 : 4, 28 + strike * 81, t, '#ffd9d3', count)
        shards(ctx, count, 16 + strike * 87, 8, '#b972c6', strike)
        break
      case 'shield-impact':
        ring(ctx, 22 + strike * 59, '#7ee2e2', 4, 0, 0.7)
        rays(ctx, count, 24, 38 + strike * 50, '#e0ffec', 0)
        shards(ctx, count, 14 + strike * 35, 5, '#77bbff', strike)
        break
      case 'dash-afterimage':
        for (let i = 0; i < count; i++) {
          const v = DIRS[Math.floor(i * 24 / count)]!
          ctx.strokeStyle = i % 2 ? '#94c8e8' : '#d4f6ff'; ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(-23 - strike * 51 - i * 3, v.y * 20)
          ctx.lineTo(17 - strike * 9, v.y * 12 + v.x * 6)
          ctx.stroke()
        }
        break
      case 'evolution-awakening':
        ring(ctx, 35 + strike * 92, '#d8abff', 5)
        ring(ctx, 51 + strike * 71, '#ffdc9b', 2)
        spiral(ctx, 3, 31 + strike * 93, t, '#fbecff', count)
        rays(ctx, count, 37, 54 + strike * 75, '#bc95f5', t)
        break
      case 'chest-opening':
        ring(ctx, 13 + strike * 67, '#ffca72', 3, 0, 0.44)
        rays(ctx, count, 9 + strike * 18, 40 + strike * 76, '#fff0ba', t)
        shards(ctx, count, 24 + strike * 66, 6, '#f8a654', strike)
        break
      case 'enemy-death':
        ring(ctx, 40 * (1 - strike) + 5, '#dba8c5', 3)
        shards(ctx, count, 54 - strike * 34, 9 * (1 - strike * 0.75), '#8f6fbb', 1 - strike)
        spiral(ctx, reduced ? 2 : 3, 42 - strike * 27, t, '#c9accd', count)
        break
      case 'ultimate-attack':
        ring(ctx, 23 + strike * 130, '#ffe6b2', 6)
        ring(ctx, 42 + strike * 109, '#be7fdf', 3)
        rays(ctx, count, 28 + strike * 35, 91 + strike * 89, '#e8ccff', t)
        shards(ctx, count, 44 + strike * 119, 10, '#efb77d', strike)
        break
      case 'victory-finish':
        ring(ctx, 43 + strike * 74, '#ffd893', 4, 0, 0.58)
        ring(ctx, 58 + strike * 65, '#f2e6c2', 2, 0, 0.58)
        rays(ctx, count, 62 + strike * 16, 101 + strike * 77, '#fff4cc', t)
        spiral(ctx, 2, 34 + strike * 66, t, '#edd1a0', count)
        break
    }
  } finally {
    ctx.restore()
  }
}
