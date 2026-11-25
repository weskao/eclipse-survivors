import type { Ctx2D } from './ctx'

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
