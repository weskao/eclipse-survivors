import type { Ctx2D } from '../ctx'
import { HERO_ART_SLOTS, HERO_TARGET_SLOTS, heroArtPose, heroMotePose, heroTargetLimit, type HeroCast, type HeroPose, type HeroSpecialKind } from '../pixi-vfx/hero-choreography'
import shadowRiftUrl from '../../../assets/es2/production/skills/shadow-rift.svg?url'
import spiritFlameUrl from '../../../assets/es2/production/skills/spirit-flame.svg?url'
import spiritGuardianUrl from '../../../assets/es2/production/skills/spirit-guardian.svg?url'
import oathWardUrl from '../../../assets/es2/production/skills/oath-ward.svg?url'
import oathRaysUrl from '../../../assets/es2/production/skills/oath-rays.svg?url'

/** Cosmetic world-space texture passes; gameplay hitboxes remain simulation-owned. */
export type HeroSpecialFxKind = HeroSpecialKind
type Texture = 'rift' | 'flame' | 'guardian' | 'ward' | 'rays'
const SOURCES: Record<Texture, string> = {
  rift: shadowRiftUrl, flame: spiritFlameUrl, guardian: spiritGuardianUrl, ward: oathWardUrl, rays: oathRaysUrl,
}
const cached: Partial<Record<Texture, HTMLImageElement>> = {}
const TAU = Math.PI * 2
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t) }
const DUST = Object.freeze(Array.from({ length: 24 }, (_, i) => Object.freeze({
  x: Math.cos(i * 2.39996) * (0.43 + (i % 5) * 0.12),
  y: Math.sin(i * 2.39996) * (0.45 + (i % 4) * 0.13),
  size: 1.1 + (i % 4) * 0.7,
})))

/** Shared decoded sources for the GPU hero pass (same images, no second decode). */
export const heroSpecialImages = (): Readonly<Partial<Record<Texture, HTMLImageElement>>> => cached

/** Decode the five authored SVG textures once, never during a rendering frame. */
export function preloadHeroSpecialVfx(): void {
  if (typeof Image === 'undefined') return
  for (const key of Object.keys(SOURCES) as Texture[]) {
    if (cached[key]) continue
    const img = new Image()
    img.decoding = 'async'
    img.src = SOURCES[key]
    cached[key] = img
  }
}

function sprite(
  ctx: Ctx2D, key: Texture, x: number, y: number, w: number, h: number,
  opacity: number, rotation = 0,
): boolean {
  const img = cached[key]
  if (!img?.complete || img.naturalWidth === 0 || opacity <= 0) return false
  ctx.save()
  ctx.translate(x, y)
  if (rotation) ctx.rotate(rotation)
  ctx.globalAlpha *= Math.min(1, opacity)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
  return true
}

/** Fixed-seed, irregular embers: one path and one fill, no per-frame particle objects. */
function dust(ctx: Ctx2D, count: number, radius: number, phase: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const d = DUST[i]!
    const drift = 0.32 + phase * (0.86 + (i % 3) * 0.14)
    const x = d.x * radius * drift, y = d.y * radius * drift * 0.72
    const rx = Math.max(0.5, d.size * (1 - phase * 0.65))
    ctx.moveTo(x + rx, y) // Do not join successive dust ellipses into a giant star polygon.
    ctx.ellipse(x, y, rx, Math.max(0.5, d.size * 0.5), i * 0.4, 0, TAU)
  }
  ctx.fill()
}

function shadowblade(ctx: Ctx2D, t: number, bloom: number, count: number, reduced: boolean): void {
  // Two offset, textured steel cuts and a brief dust wake. No geometric seal or neon ring.
  const p1 = reduced ? 0.56 : ease((t - 0.08) / 0.28)
  const p2 = reduced ? 0 : ease((t - 0.3) / 0.28)
  ctx.fillStyle = '#17131d'
  ctx.beginPath(); ctx.ellipse(0, 46, 67 + 35 * bloom, 16, 0, 0, TAU); ctx.fill()
  const slashOpacity = reduced ? 0.67 : (1 - ease((t - 0.49) / 0.28)) * 0.93
  const first = sprite(ctx, 'rift', -80 + p1 * 86, -24 - p1 * 6,
    270 + p1 * 36, 260, slashOpacity, -0.48 + p1 * 0.48)
  if (!first && slashOpacity > 0.05) {
    ctx.strokeStyle = '#c3b5c6'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(-103 + p1 * 45, 49); ctx.bezierCurveTo(-32, 7, 38, -48, 104 + p1 * 12, -94); ctx.stroke()
  }
  if (!reduced && t > 0.22) {
    sprite(ctx, 'rift', 59 - p2 * 102, -5, 260, 250,
      (1 - ease((t - 0.73) / 0.24)) * 0.75, 1.72 - p2 * 0.46)
  }
  ctx.globalAlpha *= 0.62
  dust(ctx, reduced ? 4 : count, 165, bloom, '#93838a')
}

function summoner(ctx: Ctx2D, t: number, bloom: number, count: number, reduced: boolean): void {
  // Imperfect spirit flames gather inward through vapor. No hexagram / UI-like orbit paths.
  const converge = reduced ? 0.72 : ease((t - 0.12) / 0.61)
  ctx.fillStyle = '#233539'
  ctx.beginPath(); ctx.ellipse(0, 45, 83 + bloom * 37, 17, 0, 0, TAU); ctx.fill()
  const radius = 112 - converge * 35
  const alpha = reduced ? 0.58 : Math.min(0.92, 0.42 + converge * 0.51)
  for (let i = 0; i < (reduced ? 2 : 3); i++) {
    const a = i * TAU / 3 - 1.6 + (reduced ? 0 : t * 0.36)
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius * 0.37 - 36 - converge * 17 - (reduced ? 0 : Math.sin(t * Math.PI + i) * 9)
    const image = sprite(ctx, 'flame', x, y, 112 + bloom * 34, 144 + bloom * 46,
      alpha * 0.82, Math.sin(a) * 0.16)
    const guardian = sprite(ctx, 'guardian', x, y - 9, 106 + bloom * 22, 152 + bloom * 34, alpha * 0.88, Math.sin(a) * 0.06)
    if (!image && !guardian) {
      ctx.fillStyle = '#a0d9d6'; ctx.beginPath(); ctx.ellipse(x, y, 8, 18, a, 0, TAU); ctx.fill()
    }
  }
  if (!reduced && t > 0.35) {
    sprite(ctx, 'flame', 0, -17, 164 + bloom * 48, 201 + bloom * 52,
      0.53 + 0.27 * (1 - ease((t - 0.72) / 0.26)))
  }
  ctx.globalAlpha *= 0.52
  dust(ctx, reduced ? 3 : count, 111 + bloom * 53, converge, '#a0d9d6')
}

function paladin(ctx: Ctx2D, t: number, bloom: number, count: number, reduced: boolean): void {
  // Worn bronze ward and filtered sunlight, not a flat icon with five pink pillars.
  const raise = reduced ? 0.76 : ease((t - 0.1) / 0.36)
  const release = reduced ? 1 : 1 - ease((t - 0.76) / 0.22)
  ctx.fillStyle = '#332021'
  ctx.beginPath(); ctx.ellipse(0, 45, 80 + bloom * 45, 21, 0, 0, TAU); ctx.fill()
  sprite(ctx, 'rays', 0, -68, 330 + bloom * 75, 345 + bloom * 70,
    (reduced ? 0.28 : 0.4 + 0.35 * bloom) * release)
  const hasWard = sprite(ctx, 'ward', 0, -34 + (1 - raise) * 31,
    166 + raise * 49, 181 + raise * 57, (0.36 + raise * 0.52) * release, reduced ? -0.035 : -0.13 + raise * 0.095)
  if (!hasWard) {
    ctx.strokeStyle = '#d6b580'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(0, -122); ctx.bezierCurveTo(56, -98, 83, -89, 81, -35)
    ctx.bezierCurveTo(77, 32, 21, 63, 0, 75); ctx.bezierCurveTo(-21, 63, -77, 32, -81, -35)
    ctx.bezierCurveTo(-83, -89, -56, -98, 0, -122); ctx.stroke()
  }
  ctx.globalAlpha *= 0.52 * release
  dust(ctx, reduced ? 4 : count, 158, bloom, '#d6b580')
}

type ClassicKind = 'hero-knight' | 'hero-ranger' | 'hero-wizard'
type WorldCast = { x: number; y: number; life: number; max: number; targets?: readonly { x: number; y: number }[] }
const CLASSIC_FX = {
  'hero-knight': { duration: 1.2, color: '#e8c084', radius: 190 },
  'hero-ranger': { duration: 1.35, color: '#c1e7a9', radius: 110 },
  'hero-wizard': { duration: 1.65, color: '#b9a2ff', radius: 240 },
} as const
const fallbackPose: HeroPose = { x: 0, y: 0, rotation: 0, width: 0, height: 0, alpha: 0, tint: 0, texture: 'spark', additive: true }
const fallbackTargets = Array.from({ length: HERO_TARGET_SLOTS }, () => ({ x: 0, y: 0 }))
const relativeTargets: { x: number; y: number }[] = []
const fallbackCast: HeroCast = { kind: 'hero-knight', elapsed: 0, life: 0, targets: relativeTargets, reduced: false }
function isArtTexture(key: HeroPose['texture']): key is Texture {
  return Object.prototype.hasOwnProperty.call(SOURCES, key)
}
/** Same clock and cast positions as Pixi. Only the paint backend and particle budget differ. */
function classicHeroFx(ctx: Ctx2D, kind: ClassicKind, progress: number, bloom: number, count: number, reduced: boolean, world?: WorldCast): void {
  const profile = CLASSIC_FX[kind], p = fallbackPose, cast = fallbackCast
  cast.kind = kind; cast.reduced = reduced
  cast.elapsed = world ? world.max - world.life : progress * profile.duration
  cast.life = world?.life ?? (1 - progress) * profile.duration
  relativeTargets.length = 0
  if (world?.targets) for (let i = 0; i < Math.min(heroTargetLimit(kind), world.targets.length); i++) {
    const point = fallbackTargets[i]!, target = world.targets[i]!
    point.x = target.x - world.x; point.y = target.y - world.y + 24
    relativeTargets.push(point)
  }
  for (let i = 0; i < HERO_ART_SLOTS; i++) {
    if (!heroArtPose(p, cast, i)) continue
    if (isArtTexture(p.texture) && sprite(ctx, p.texture, p.x, p.y, p.width, p.height, p.alpha, p.rotation)) continue
    // Use a bounded contact/energy contour if the shared texture isn't decoded.
    ctx.save()
    ctx.globalAlpha *= p.alpha
    ctx.strokeStyle = profile.color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, p.width * .32), Math.max(1, p.height * .26), p.rotation, 0, TAU); ctx.stroke()
    ctx.restore()
  }
  if (reduced) return
  // One path per cast for the low-cost fallback particle layer.
  ctx.fillStyle = profile.color
  ctx.beginPath()
  let emitted = 0
  for (let i = 0; i < count; i++) {
    if (!heroMotePose(p, cast, i)) continue
    const rx = Math.max(.5, p.width * .22), ry = Math.max(.5, p.height * .22)
    ctx.moveTo(p.x + rx * Math.cos(p.rotation), p.y + rx * Math.sin(p.rotation))
    ctx.ellipse(p.x, p.y, rx, ry, p.rotation, 0, TAU)
    emitted++
  }
  if (emitted) ctx.fill()
  else dust(ctx, count, profile.radius * .55, bloom, profile.color)
}

/** Local origin is the caster's feet. Registry handles fade, viewport culling and lifetime. */
export function drawHeroSpecialFx(
  ctx: Ctx2D, kind: HeroSpecialFxKind, progress: number, bloom: number,
  particleCount: number, reducedMotion: boolean, world?: WorldCast,
): void {
  // The explicit preload runs when render assets are mounted; keep a visible fallback on decode failures.
  ctx.translate(0, -24)
  switch (kind) {
    case 'hero-knight':
    case 'hero-ranger':
    case 'hero-wizard':
      classicHeroFx(ctx, kind, progress, bloom, particleCount, reducedMotion, world)
      break
    case 'hero-shadowblade': shadowblade(ctx, progress, bloom, particleCount, reducedMotion); break
    case 'hero-spirit-summoner': summoner(ctx, progress, bloom, particleCount, reducedMotion); break
    case 'hero-crimson-paladin': paladin(ctx, progress, bloom, particleCount, reducedMotion); break
  }
}
