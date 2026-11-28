import { TAU } from '../constants'
import type { HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'

/**
 * One procedural human locomotion model shared by every hero renderer:
 * the legacy skinned rig (knight/ranger/wizard), held ES2 directional cells
 * and the ES2 portrait fallback. Visual only; hitboxes and simulation never
 * read it. Joint heights are fractions of figure height above the feet,
 * calibrated against the authored hero art (large heads, shorter legs).
 */
export const GAIT_HIP = 0.42
export const GAIT_KNEE = 0.21
/** Leg pixels sit within this half-width of the body centre; wider is cape/robe/hands. */
const LEG_BAND = 0.17
const THIGH = GAIT_HIP - GAIT_KNEE
const SHIN = GAIT_KNEE
// Running stride (radians): thigh swing, stance/swing knee flexion, torso lean.
const STRIDE = 0.4
const STANCE_FLEX = 0.28
const SWING_FLEX = 1.15
const LEAN = 0.1
const ARM = 0.8
const SWAY = 0.012
/** Screen-y foreshortening of forward/back motion for a top-down-ish camera. */
const DEPTH = 0.35

export interface GaitPose {
  /** Pelvis drop (+ = down) as a fraction of figure height; keeps the lowest foot grounded. */
  pelvis: number
  /** Lateral weight shift toward the stance leg, fraction of figure height. */
  sway: number
  /** Forward torso lean, radians. */
  lean: number
  /** Thigh swing from vertical per leg, radians (+ = forward). Leg 0 = screen-left half. */
  thigh: [number, number]
  /** Knee flexion per leg, radians (always ≥ 0: knees never hyperextend). */
  knee: [number, number]
  /** Arm swing per side, radians (+ = forward); counters the same-side leg. */
  arm: [number, number]
  /** Screen-x and screen-y (toward camera) components of the travel direction. */
  fx: number
  depth: number
}

export interface GaitPoint { x: number; y: number; rotation: number }

// One reused sample: renderers call sampleGait once per draw and never retain it.
const scratch: GaitPose = {
  pelvis: 0, sway: 0, lean: 0, thigh: [0, 0], knee: [0, 0], arm: [0, 0], fx: 1, depth: 0,
}
const clamp = (v: number): number => Math.max(0, Math.min(1, v))

/**
 * Run/dash pose, or null for every other pose (their existing motion stays).
 * Run cycle follows the integer frame so baked body frames and the live rigid
 * weapon overlay sample the same instant. `sideView` = the legacy right-facing
 * rig (mirrored by its caller); otherwise the travel octant sets the axis.
 * The result is a shared scratch object: read it before the next call.
 */
export function sampleGait(anim: HeroAnimation, sideView: boolean): GaitPose | null {
  if (anim.reducedMotion || (anim.pose !== 'run' && anim.pose !== 'dash')) return null
  const g = scratch
  if (anim.pose === 'run') {
    const cycle = anim.frame / Math.max(1, anim.count)
    for (let i = 0; i < 2; i++) {
      const q = (cycle + i * 0.5) % 1
      // q = 0 heel strike, 0–0.5 stance (leg sweeps back), 0.5–1 swing.
      g.thigh[i] = STRIDE * Math.cos(TAU * q)
      g.knee[i] = q < 0.5 ? STANCE_FLEX * Math.sin(Math.PI * q / 0.5)
        : SWING_FLEX * Math.sin(Math.PI * (q - 0.5) / 0.5)
    }
    g.lean = LEAN
    g.sway = SWAY * Math.sin(TAU * cycle)
  } else {
    // Dash: a single lunge that opens and recovers with the dash progress.
    const e = Math.sin(Math.PI * clamp(anim.phase))
    g.thigh[0] = 0.55 * e; g.thigh[1] = -0.45 * e
    g.knee[0] = 0.55 * e; g.knee[1] = 0.25 * e
    g.lean = 0.22 * e
    g.sway = 0
  }
  for (let i = 0; i < 2; i++) g.arm[i] = -ARM * g.thigh[i]!
  // Lower the pelvis until the lowest foot touches the ground: no foot ever
  // sinks, and the reaching leg takes the weight just before heel strike.
  g.pelvis = THIGH + SHIN - Math.max(
    THIGH * Math.cos(g.thigh[0]) + SHIN * Math.cos(g.thigh[0] - g.knee[0]),
    THIGH * Math.cos(g.thigh[1]) + SHIN * Math.cos(g.thigh[1] - g.knee[1]))
  const a = (Number.isFinite(anim.direction) ? anim.direction : 0) * Math.PI / 4
  g.fx = sideView ? 1 : Math.cos(a)
  g.depth = sideView ? 0 : Math.sin(a)
  return g
}

/** Displacement of a torso point (x, y relative to the feet, y up negative). */
export function gaitTorsoPoint(g: GaitPose, x: number, y: number, height: number, out: GaitPoint): GaitPoint {
  const r = y + GAIT_HIP * height
  const a = g.lean * g.fx
  const c = Math.cos(a), s = Math.sin(a)
  out.x = x * c - r * s - x + g.sway * height * g.depth
  out.y = x * s + r * c - r + g.pelvis * height
  out.rotation = a
  return out
}

/** Displacement of a leg point `below` pixels under the hip, on leg 0 or 1. */
export function gaitLegPoint(g: GaitPose, leg: 0 | 1, below: number, height: number, out: GaitPoint): GaitPoint {
  const l1 = THIGH * height
  const t = g.thigh[leg]
  let f: number, d: number, a: number
  if (below <= l1) {
    f = below * Math.sin(t); d = below * Math.cos(t); a = t
  } else {
    a = t - g.knee[leg]
    f = l1 * Math.sin(t) + (below - l1) * Math.sin(a)
    d = l1 * Math.cos(t) + (below - l1) * Math.cos(a)
  }
  out.x = f * g.fx + g.sway * height * g.depth
  out.y = d - below + f * g.depth * DEPTH + g.pelvis * height
  out.rotation = -a * g.fx
  return out
}

/** Any figure point: legs inside the central band below the hip, torso elsewhere. */
export function gaitPoint(g: GaitPose, x: number, y: number, height: number, out: GaitPoint): GaitPoint {
  const below = y + GAIT_HIP * height
  return below > 0 && Math.abs(x) < LEG_BAND * height
    ? gaitLegPoint(g, x < 0 ? 0 : 1, below, height, out)
    : gaitTorsoPoint(g, x, y, height, out)
}

const pa: GaitPoint = { x: 0, y: 0, rotation: 0 }
const pb: GaitPoint = { x: 0, y: 0, rotation: 0 }

/**
 * Baked full-body art (ES2 cells, portrait) with built-in equipment: the torso
 * and its weapon stay ONE rigid piece; only the four leg segments articulate,
 * each a rotated (and depth-foreshortened) crop of the same source rect.
 * Destination coordinates share the caller's origin; `ground` is the foot line.
 * Bounded cost: 4 leg crops + 3 torso crops, 5 save/restore pairs.
 */
export function drawGaitBody(
  ctx: Ctx2D, image: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number,
  dx: number, dy: number, dw: number, dh: number,
  ground: number, height: number, g: GaitPose,
): void {
  const kx = sw / dw, ky = sh / dh
  const hip = ground - GAIT_HIP * height
  const knee = ground - GAIT_KNEE * height
  const band = LEG_BAND * height
  const ov = 0.02 * height
  const bottom = dy + dh
  const crop = (x0: number, y0: number, x1: number, y1: number, ox: number, oy: number): void => {
    ctx.drawImage(image, sx + (x0 - dx) * kx, sy + (y0 - dy) * ky, (x1 - x0) * kx, (y1 - y0) * ky,
      x0 - ox, y0 - oy, x1 - x0, y1 - y0)
  }
  const segment = (leg: 0 | 1, top: number, end: number, y1: number): void => {
    const x0 = leg === 0 ? -band : -ov
    const x1 = leg === 0 ? ov : band
    gaitLegPoint(g, leg, top - hip, height, pa)
    gaitLegPoint(g, leg, end - hip, height, pb)
    const vx = pb.x - pa.x, vy = end - top + pb.y - pa.y
    ctx.save()
    ctx.translate(pa.x, top + pa.y)
    ctx.rotate(Math.atan2(-vx, vy))
    ctx.scale(1, Math.hypot(vx, vy) / (end - top))
    crop(x0, Math.max(dy, top - ov), x1, Math.min(bottom, y1), 0, top)
    ctx.restore()
  }
  for (let i = 1; i >= 0; i--) {
    const leg = i as 0 | 1
    segment(leg, hip, knee, knee + ov)
    segment(leg, knee, ground, bottom)
  }
  // Torso, head, held weapon and the cape/robe beside the legs: one rigid piece.
  gaitTorsoPoint(g, 0, hip - ground, height, pa)
  ctx.save()
  ctx.translate(pa.x, hip + pa.y)
  ctx.rotate(pa.rotation)
  crop(dx, dy, dx + dw, hip + ov, 0, hip)
  crop(dx, hip + ov, -band, bottom, 0, hip)
  crop(band, hip + ov, dx + dw, bottom, 0, hip)
  ctx.restore()
}
