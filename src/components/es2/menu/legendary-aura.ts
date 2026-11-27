/** Pure plan for the legendary choice-card aura (Pixi runtime lives in legendary-aura-pixi.ts).
 * Pattern borrowed from established loot/gacha reveals, not their assets: reveal pillar + shockwave,
 * border-tracing comets, rising embers, slow god-rays and a foil sweep, all clipped to the card. */
export type AuraMode = 'off' | 'calm' | 'full'
export interface AuraPolicy { reduceMotion: boolean; reduceFlashing: boolean; still: boolean }

export const AURA_BUDGET = {
  maxCards: 3,
  embers: 16,
  emberAlpha: .8,
  emberLoop: 2.6, // seconds per ember rise
  comets: 2,
  trail: 9,
  cometLoop: 3.4, // seconds per full perimeter lap
  stars: 5,
  burst: 26, // reveal-only particles per card
  revealSeconds: .95,
} as const

/** Reduced motion and still mode remove all decorative motion; reduced flashing keeps a gentle, flash-free loop. */
export function auraMode(p: AuraPolicy): AuraMode {
  if (p.reduceMotion || p.still) return 'off'
  return p.reduceFlashing ? 'calm' : 'full'
}

/** Sprites per card: rays + sweep + embers + comet heads/trails + stars (+ reveal pillar/ring/burst in full mode). */
export function auraSpriteCount(cards: number, mode: AuraMode): number {
  if (mode === 'off') return 0
  const n = Math.min(cards, AURA_BUDGET.maxCards)
  const loop = 2 + AURA_BUDGET.embers + AURA_BUDGET.comets * (1 + AURA_BUDGET.trail) + AURA_BUDGET.stars
  return n * (mode === 'full' ? loop + 2 + AURA_BUDGET.burst : loop)
}

/** Point on a rounded-rect perimeter, clockwise from the top-left straight edge; u wraps at 1. */
export function perimeterPoint(w: number, h: number, r: number, u: number): { x: number; y: number } {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  const sw = w - 2 * r, sh = h - 2 * r, arc = Math.PI * r / 2
  const total = 2 * sw + 2 * sh + 4 * arc
  let d = (((u % 1) + 1) % 1) * total
  const corner = (cx: number, cy: number, start: number) => {
    const a = start + d / r
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  }
  if (d < sw) return { x: r + d, y: 0 }
  d -= sw
  if (d < arc) return corner(w - r, r, -Math.PI / 2)
  d -= arc
  if (d < sh) return { x: w, y: r + d }
  d -= sh
  if (d < arc) return corner(w - r, h - r, 0)
  d -= arc
  if (d < sw) return { x: w - r - d, y: h }
  d -= sw
  if (d < arc) return corner(r, h - r, Math.PI / 2)
  d -= arc
  if (d < sh) return { x: 0, y: h - r - d }
  d -= sh
  return corner(r, r, Math.PI)
}

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

/** Deterministic looping ember: rises from the lower card edge, sways, fades in and out; biased toward the side edges. */
export function emberPose(i: number, t: number, w: number, h: number): { x: number; y: number; alpha: number; scale: number } {
  const loop = AURA_BUDGET.emberLoop * (.75 + hash(i) * .5)
  const k = (((t / loop + hash(i + 17)) % 1) + 1) % 1
  const side = hash(i + 5) < .5 ? -1 : 1
  const lane = .5 + side * (.18 + .3 * Math.sqrt(hash(i + 9)))
  const sway = Math.sin((t + hash(i + 3) * 9) * (1.6 + hash(i + 7))) * w * .035
  const x = Math.max(0, Math.min(w, lane * w + sway))
  const y = Math.max(0, Math.min(h, h * (1 - k * (.55 + hash(i + 11) * .4))))
  const alpha = AURA_BUDGET.emberAlpha * Math.min(1, k / .15) * Math.min(1, (1 - k) / .35)
  return { x, y, alpha, scale: .45 + hash(i + 13) * .55 }
}
