import type { Ctx2D } from '../ctx'

/** One short-lived ornamental overlay per confirmed hero special. Combat hitboxes are never derived from these shapes. */
export type HeroSpecialFxKind = 'hero-shadowblade' | 'hero-spirit-summoner' | 'hero-crimson-paladin'

const TAU = Math.PI * 2
const DIRECTIONS = Object.freeze(Array.from({ length: 24 }, (_, i) => Object.freeze({
  x: Math.cos(i * TAU / 24), y: Math.sin(i * TAU / 24),
})))

function halo(ctx: Ctx2D, radius: number, color: string, width: number, aspect = 1): void {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.ellipse(0, 0, Math.max(1, radius), Math.max(1, radius * aspect), 0, 0, TAU)
  ctx.stroke()
}

/** Batch a whole field into one fill call, sharing an immutable direction lookup. */
function motes(ctx: Ctx2D, count: number, radius: number, size: number, color: string, phase: number): void {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const v = DIRECTIONS[Math.floor(i * 24 / count)]!
    const x = v.x * radius, y = v.y * radius * 0.72
    const len = size * (1 + (i % 3) * 0.32)
    ctx.moveTo(x + v.x * len, y + v.y * len)
    ctx.lineTo(x - v.y * len * 0.35, y + v.x * len * 0.35)
    ctx.lineTo(x - v.x * (len + phase * 8), y - v.y * (len + phase * 8))
    ctx.lineTo(x + v.y * len * 0.35, y - v.x * len * 0.35)
    ctx.closePath()
  }
  ctx.fill()
}

function shadowblade(ctx: Ctx2D, t: number, bloom: number, count: number, reduced: boolean): void {
  // Violet shadow seal and three independent, crossing sword paths: no character sprite is stretched.
  halo(ctx, 30 + bloom * 94, '#57408b', 13 - bloom * 7, 0.47)
  halo(ctx, 36 + bloom * 83, '#bea0ff', 3.5, 0.47)
  halo(ctx, 20 + bloom * 38, '#e1d1ff', 1.5, 0.52)
  const trails = reduced ? 2 : 3
  for (let i = 0; i < trails; i++) {
    const angle = i * TAU / 3 - 0.75 + (reduced ? 0 : t * 1.35)
    const reach = 47 + bloom * 93 + i * 8
    ctx.save()
    ctx.rotate(angle)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-reach * 0.82, -22)
    ctx.bezierCurveTo(-reach * 0.18, -reach * 0.96, reach * 0.42, reach * 0.6, reach, -15)
    ctx.strokeStyle = '#432a78'
    ctx.lineWidth = 17 - bloom * 6
    ctx.stroke()
    ctx.strokeStyle = '#bea0ff'
    ctx.lineWidth = 6 - bloom * 2
    ctx.stroke()
    ctx.strokeStyle = '#f5e9ff'
    ctx.lineWidth = 1.7
    ctx.beginPath()
    ctx.moveTo(-reach * 0.63, -25)
    ctx.bezierCurveTo(-reach * 0.12, -reach * 0.81, reach * 0.47, reach * 0.43, reach * 0.87, -16)
    ctx.stroke()
    ctx.restore()
  }
  motes(ctx, count, 42 + bloom * 120, 4.2, '#d5b1ff', t)
  halo(ctx, 10 + bloom * 25, '#f1ddff', 2)
}

function summoner(ctx: Ctx2D, t: number, bloom: number, count: number, reduced: boolean): void {
  // Converging spirit orbit, rotating hexagram and icy soul-flame petals.
  const r = 38 + bloom * 89
  halo(ctx, r, '#4e8fbb', 9 - bloom * 4, 0.58)
  halo(ctx, r * 0.86, '#8cecff', 2.8, 0.58)
  halo(ctx, r * 0.6, '#b8a3ff', 1.8, 0.64)
  ctx.save()
  ctx.rotate(reduced ? -0.3 : t * 0.82)
  ctx.strokeStyle = '#8cecff'
  ctx.lineWidth = 2.1
  ctx.beginPath()
  for (let i = 0; i <= 6; i++) {
    const v = DIRECTIONS[(i % 6) * 4]!
    if (i === 0) ctx.moveTo(v.x * r * 0.76, v.y * r * 0.44)
    else ctx.lineTo(v.x * r * 0.76, v.y * r * 0.44)
  }
  ctx.stroke()
  ctx.restore()
  const orbit = reduced ? 41 : 92 - bloom * 50
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 - Math.PI / 2 + (reduced ? 0 : t * 1.8)
    const x = Math.cos(a) * orbit
    const y = Math.sin(a) * orbit * 0.65
    ctx.strokeStyle = '#6fa8eb'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(x * 0.28 - y * 0.16, y * 0.28 + x * 0.1, x * 0.8 - y * 0.15, y * 0.8 + x * 0.1, x, y)
    ctx.stroke()
    ctx.fillStyle = '#4267a6'
    ctx.beginPath()
    ctx.ellipse(x, y, 12, 16, a, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#8cecff'
    ctx.beginPath()
    ctx.ellipse(x, y - 3, 6.5, 11, a, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff4d6'
    ctx.beginPath()
    ctx.arc(x - 1, y - 6, 3.3, 0, TAU)
    ctx.fill()
  }
  motes(ctx, count, 18 + bloom * 125, 5.2, '#c6faff', t)
  halo(ctx, 8 + bloom * 20, '#e8fbff', 3)
}

function shieldCrest(ctx: Ctx2D, scale: number): void {
  ctx.save()
  ctx.scale(scale, scale)
  ctx.fillStyle = '#58223a'
  ctx.strokeStyle = '#ffd99b'
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.moveTo(0, -52)
  ctx.bezierCurveTo(16, -43.3, 30, -39, 42, -39)
  ctx.lineTo(39, 9)
  ctx.bezierCurveTo(34.3, 27.7, 21.3, 43.3, 0, 56)
  ctx.bezierCurveTo(-21.3, 43.3, -34.3, 27.7, -39, 9)
  ctx.lineTo(-42, -39)
  ctx.bezierCurveTo(-30, -39, -16, -43.3, 0, -52)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#e77d82'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -38)
  ctx.lineTo(0, 36)
  ctx.moveTo(-23, -7)
  ctx.lineTo(23, -7)
  ctx.stroke()
  ctx.fillStyle = '#ffdfaa'
  ctx.beginPath()
  ctx.moveTo(0, -25)
  ctx.lineTo(7, -8)
  ctx.lineTo(0, 9)
  ctx.lineTo(-7, -8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function paladin(ctx: Ctx2D, t: number, bloom: number, count: number, reduced: boolean): void {
  // A shield forms inside a sunburst; descending gold pillars convey the protective oath.
  const r = 50 + bloom * 112
  halo(ctx, r, '#a33e57', 11 - bloom * 5, 0.59)
  halo(ctx, r * 0.9, '#ffd99b', 3.4, 0.59)
  halo(ctx, r * 0.66, '#f58a89', 2, 0.64)
  const pillars = reduced ? 3 : 5
  ctx.lineCap = 'round'
  for (let i = 0; i < pillars; i++) {
    const x = (i - (pillars - 1) / 2) * 34
    const rise = reduced ? 7 : (1 - bloom) * 52
    ctx.beginPath()
    ctx.moveTo(x, -46 - rise)
    ctx.lineTo(x, -110 - rise - (i % 2) * 18)
    ctx.strokeStyle = '#ae5367'
    ctx.lineWidth = 12
    ctx.stroke()
    ctx.strokeStyle = '#ffd99b'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(0, reduced ? 0 : 9 * (1 - bloom))
  shieldCrest(ctx, 0.84 + bloom * 0.26)
  ctx.restore()
  motes(ctx, count, 41 + bloom * 131, 4.5, '#ffdcab', t)
  halo(ctx, 12 + bloom * 44, '#fff1d5', 2, 0.7)
}

/** Called after viewport culling and outer alpha selection by the shared VFX renderer. */
export function drawHeroSpecialFx(
  ctx: Ctx2D, kind: HeroSpecialFxKind, progress: number, bloom: number,
  particleCount: number, reducedMotion: boolean,
): void {
  ctx.translate(0, -24) // Canvas hero anchors are at the feet, while the spell centers on the torso.
  switch (kind) {
    case 'hero-shadowblade': shadowblade(ctx, progress, bloom, particleCount, reducedMotion); break
    case 'hero-spirit-summoner': summoner(ctx, progress, bloom, particleCount, reducedMotion); break
    case 'hero-crimson-paladin': paladin(ctx, progress, bloom, particleCount, reducedMotion); break
  }
}
