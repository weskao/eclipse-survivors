import type { Ctx2D } from './ctx'
import type { BossBodyMotion } from '../content/bosses/controller'
import type { BossId } from '../content/bosses/definitions'

const sources = import.meta.glob('../../assets/es2/production/skills/enemy-release/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const ENEMY_RELEASE_ART: Record<string, string> = Object.fromEntries(Object.entries(sources).map(([path, url]) => [path.split('/').pop()!.replace('.svg', ''), url]))
const images: Record<string, HTMLImageElement> = {}
let loaded = false
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const weights: Record<string, number> = { slime: 0.15, bat: 0.12, goblin: 0.3, golem: 0.92, warlock: 0.45, 'shadow-assassin': 0.2, necromancer: 0.45, 'dark-archer': 0.3, 'plague-carrier': 0.72, 'shield-guardian': 0.95, phantom: 0.16, 'fire-imp': 0.23, 'frost-wraith': 0.25, berserker: 0.68, 'crystal-sentinel': 0.92 }
export const enemyWeight = (kind: string) => weights[kind] ?? 0.5
export function preloadEnemyReleaseArt(makeImage: () => HTMLImageElement = () => new Image()): void {
  if (loaded || typeof Image === 'undefined') return
  loaded = true
  for (const [id, url] of Object.entries(ENEMY_RELEASE_ART)) {
    const image = makeImage(); image.decoding = 'async'; image.src = url; images[id] = image
  }
}
/** Smooth directional recoil, not a periodic shake. Physics keeps its existing coordinates. */
export function applyEnemyRecoil(ctx: Ctx2D, remaining: number, dx: number, dy: number, weight: number, reduced: boolean): void {
  if (reduced || remaining <= 0) return
  const t = 1 - clamp(remaining / 0.24)
  const impulse = Math.sin(Math.PI * Math.min(1, t * 1.7)) * (1 - t)
  const force = 1 - weight * 0.72
  ctx.translate(dx * impulse * 14 * force, dy * impulse * 8 * force - impulse * 3 * force)
  ctx.rotate(dx * impulse * 0.24 * force)
  ctx.scale(1 + impulse * 0.055 * force, 1 - impulse * 0.085 * force)
}
/** Renderer-only, material-aware death pose. Keeps the original sprite, anchor
 * and authoritative death clock; no extra texture, particle or actor allocation. */
export function applyEnemyDeathPose(ctx: Ctx2D, kind: string, remaining: number, total: number, dx: number, dy: number): void {
  const p = 1 - clamp(remaining / Math.max(.001, total))
  const fall = p * p
  const side = dx < 0 ? -1 : 1
  ctx.globalAlpha *= Math.min(1, (1 - p) * 1.8)
  if (kind === 'slime') {
    ctx.scale(1 + .30 * fall, 1 - .70 * fall)
  } else if (kind === 'bat' || kind === 'fire-imp') {
    ctx.translate(dx * 12 * p, dy * 5 * p + 16 * fall)
    ctx.rotate(side * .66 * fall)
    ctx.scale(1 - .28 * fall, 1 - .22 * fall)
  } else if (kind === 'phantom' || kind === 'warlock' || kind === 'frost-wraith' || kind === 'necromancer') {
    ctx.translate(dx * 5 * p, -12 * fall)
    ctx.scale(1 - .20 * fall, 1 + .08 * fall)
  } else if (kind === 'golem' || kind === 'crystal-sentinel' || kind === 'shield-guardian') {
    ctx.translate(dx * 5 * p, 5 * fall)
    ctx.rotate(side * .16 * fall)
    ctx.scale(1 + .04 * fall, 1 - .42 * fall)
  } else {
    const weight = enemyWeight(kind)
    ctx.translate(dx * (14 - 6 * weight) * p, dy * 5 * p + 6 * fall)
    ctx.rotate(side * (1.05 - .4 * weight) * fall)
    ctx.scale(1, 1 - .18 * fall)
  }
}

/** Foot-pivot anticipation, release follow-through and eased recovery. */
export function applyEnemyPose(ctx: Ctx2D, state: string, remaining: number, dx: number, dy: number, weight: number, reduced: boolean): void {
  if (reduced || state === 'approach' || state === 'phase') return
  const r = clamp(remaining), force = 1 - weight * 0.58
  if (state === 'windup') {
    const charge = (1 - r) ** 2
    if (charge <= 0) return
    ctx.translate(-dx * 7 * charge * force, -dy * 5 * charge * force)
    ctx.rotate(-dx * 0.14 * charge * force)
    ctx.scale(1 + 0.07 * charge * force, 1 - 0.11 * charge * force)
  } else if (r > 0) {
    const release = state === 'attack' ? Math.sin(Math.PI * (1 - r)) : r * r
    ctx.translate(dx * release * 13 * force, dy * release * 7 * force)
    ctx.rotate(dx * release * 0.17 * force)
    ctx.scale(1 - release * 0.045 * force, 1 + release * 0.07 * force)
  }
}
/** Use the controller's held pose in production too, not only opt-in candidate art.
 * Only the phase bitmap is transformed; the locked telegraph and HP bar stay in world space. */
export function applyBossBodyPose(ctx: Ctx2D, id: BossId | undefined, body: BossBodyMotion, reduced: boolean): void {
  if (reduced || !Number.isFinite(body.progress)) return
  const p = clamp(body.progress)
  const weight = id === 'infernal-titan' ? 1 : id === 'frost-sovereign' ? .65 : id === 'eclipse-seraph' ? .48 : .75
  if (body.pose === 'windup' || body.pose === 'attack' || body.pose === 'recover') {
    // No horizontal facing flip: phase art has authored equipment and silhouette.
    applyEnemyPose(ctx, body.pose, 1 - p, 0, 1, weight, false)
  } else if (body.pose === 'hurt' || body.pose === 'transform') {
    const pulse = Math.sin(Math.PI * p)
    if (pulse <= 0) return
    const force = (1 - weight * .5) * pulse
    ctx.translate(0, -5 * force)
    ctx.scale(1 + .035 * force, 1 - .045 * force)
  }
}

function ready(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return !!image?.complete && image.naturalWidth > 0
}
/** Exactly one textured release pass when decoded. No per-frame particle objects. */
export function drawEnemyRelease(ctx: Ctx2D, id: string, x: number, y: number, angle: number, width: number, height: number, life: number, reduced: boolean, viewportWidth = Infinity, viewportHeight = Infinity, art = images): void {
  if (life <= 0) return
  const margin = Math.max(width, height)
  if (x + margin < 0 || y + margin < 0 || x - margin > viewportWidth || y - margin > viewportHeight) return
  const image = art[id], t = 1 - clamp(life / 0.32)
  const beam = id === 'crystal-sentinel'
  const radial = id === 'slam' || id === 'necromancer' || id === 'shield-guardian' || id === 'berserker' || id === 'phantom'
  const stretch = reduced || beam || radial ? 1 : 0.68 + t * 0.32
  ctx.save(); ctx.translate(x, y)
  if (!radial) ctx.rotate(angle)
  ctx.globalAlpha *= (reduced ? 0.52 : 0.8) * (1 - t) ** 1.3
  if (ready(image)) {
    ctx.drawImage(image, beam ? 0 : -width * stretch / 2, -height * stretch / 2, width * stretch, height * stretch)
  } else {
    // A short geometric fallback only while the authored texture is unavailable.
    ctx.strokeStyle = '#e9bda7'; ctx.lineWidth = 2
    ctx.beginPath()
    if (beam) { ctx.moveTo(0, 0); ctx.lineTo(width, 0) }
    else ctx.arc(0, 0, width * 0.43, radial ? 0 : -0.8, radial ? Math.PI * 2 : 0.8)
    ctx.stroke()
  }
  ctx.restore()
}
/** Active zones retain the exact hazard boundary drawn by the caller. */
export function drawEnemyZone(ctx: Ctx2D, id: string, x: number, y: number, radius: number, life: number, reduced: boolean): boolean {
  const image = images[id]
  if (reduced || !ready(image)) return false
  ctx.save(); ctx.globalAlpha *= Math.min(0.62, life * 0.7)
  ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2)
  ctx.restore(); return true
}
