import type { Ctx2D } from '../../render/ctx'
import type { BossTelegraph } from './controller'
import type { AttackPresentation } from './attack-presentation'
export interface ParticleBudget { remaining: number }
type Stage = 'warning' | 'active' | 'release'
const TAU = Math.PI * 2
const SAFE = Math.PI / 5
// Stable, immutable seed table. No per-particle state or allocations during rendering.
const SEEDS = Array.from({ length: 32 }, (_, i) => {
  const r = (n: number) => ((Math.sin((i + 1) * n) * 43758.5453) % 1 + 1) % 1
  return { a: r(12.9898), b: r(78.233), c: r(45.164), d: r(94.673) }
})
/** A clipped material-local particle pass; one fill per palette, not one draw per particle.
 * Position is derived from simulation progress, so pause and cancellations cannot drift.
 */
export function drawBossParticles(ctx: Ctx2D, t: BossTelegraph, p: AttackPresentation, stage: Stage,
  progress: number, budget: ParticleBudget, edge: string, core: string): void {
  const n = Math.min(budget.remaining, stage === 'release' ? 12 + Math.round(p.weight * 16) : stage === 'warning' ? 8 : 12)
  if (n <= 0) return
  budget.remaining -= n
  const collapse = p.visual === 'collapse' || p.visual === 'vortex'
  const frost = p.boss === 'frost-sovereign'
  const fire = p.boss === 'infernal-titan'
  const holy = p.boss === 'eclipse-seraph' && p.visual === 'halo'
  const shift = (p.pitch % 47) * 0.13
  const baseAlpha = ctx.globalAlpha
  for (let pass = 0; pass < 2; pass++) {
    if (pass >= n) break
    ctx.fillStyle = pass ? core : edge
    ctx.globalAlpha = baseAlpha * (pass ? 0.85 : 0.66)
    ctx.beginPath()
    for (let i = pass; i < n; i += 2) {
      const seed = SEEDS[i]!
      const q = stage === 'release' ? Math.min(1, progress * (0.72 + seed.c * 0.4))
        : (seed.d + progress * (stage === 'warning' ? 0.8 : 1.6)) % 1
      let x: number, y: number, angle: number
      if (t.shape === 'beam') {
        x = t.length * (stage === 'warning' ? 1 - q : q)
        y = (seed.b * 2 - 1) * t.width * 0.68
        angle = 0
      } else {
        const start = t.shape === 'arena' ? SAFE + 0.1 : 0
        const span = t.shape === 'arena' ? TAU - 2 * (SAFE + 0.1) : TAU
        angle = start + ((seed.a + shift + (collapse ? -q : q) * 0.13) % 1 + 1) % 1 * span
        const inner = t.shape === 'ring' ? t.innerRadius : 0
        const thickness = t.radius - inner
        const travel = stage === 'warning' || collapse ? 1 - q : q
        const r = inner + thickness * (0.12 + travel * 0.67 + seed.b * 0.08)
        x = Math.cos(angle) * r; y = Math.sin(angle) * r
      }
      const scale = Math.min(12, Math.max(2, (t.shape === 'beam' ? t.width : t.radius) * (0.018 + seed.c * 0.032)))
        * (stage === 'release' ? (1 - progress * 0.66) : 0.75)
      const dx = Math.cos(angle), dy = Math.sin(angle)
      const len = scale * (frost ? 2.5 : holy ? 3.1 : fire ? 1.6 : 3.4)
      const side = scale * (frost ? 0.52 : fire ? 0.77 : 0.38)
      ctx.moveTo(x + dx * len, y + dy * len)
      if (frost) {
        ctx.lineTo(x - dy * side, y + dx * side)
        ctx.lineTo(x - dx * len * 0.72, y - dy * len * 0.72)
        ctx.lineTo(x + dy * side * 0.7, y - dx * side * 0.7)
      } else {
        ctx.bezierCurveTo(x + dx * scale - dy * side, y + dy * scale + dx * side,
          x - dx * scale - dy * side, y - dy * scale + dx * side, x - dx * len * 0.65, y - dy * len * 0.65)
        ctx.bezierCurveTo(x - dx * scale + dy * side * 0.5, y - dy * scale - dx * side * 0.5,
          x + dx * scale + dy * side, y + dy * scale - dx * side, x + dx * len, y + dy * len)
      }
      ctx.closePath()
    }
    ctx.fill()
  }
  ctx.globalAlpha = baseAlpha
}
