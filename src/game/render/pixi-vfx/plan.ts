import { BOSS_ATTACKS, type BossAttackId, type BossShape } from '../../content/bosses/definitions'
import { ATTACK_PRESENTATION } from '../../content/bosses/attack-presentation'
import type { BossImpact } from '../../content/bosses/controller'

export interface ImpactGeometry { shape: BossShape; radius: number; innerRadius: number; width: number; length: number; rotation: number }
export function impactGeometry(t: BossImpact): ImpactGeometry | undefined {
  const id = t.attackId as BossAttackId, attack = BOSS_ATTACKS[id], profile = ATTACK_PRESENTATION[id]
  if (!attack || !profile) return undefined
  const launch = attack.kind === 'projectile'
  return { shape: launch ? 'circle' : t.shape, radius: launch ? 42 + 13 * profile.weight : t.radius,
    innerRadius: launch ? 0 : t.innerRadius, width: t.width, length: t.length,
    rotation: t.shape === 'beam' ? t.angle : t.shape === 'arena' ? t.safeAngle : 0 }
}
export function visibleImpact(t: BossImpact, g: ImpactGeometry, ox: number, oy: number, w: number, h: number): boolean {
  const x = t.x + ox, y = t.y + oy
  if (g.shape === 'beam') {
    const ex = x + Math.cos(g.rotation) * g.length, ey = y + Math.sin(g.rotation) * g.length, pad = g.width + 50
    return Math.max(x, ex) >= -pad && Math.min(x, ex) <= w + pad && Math.max(y, ey) >= -pad && Math.min(y, ey) <= h + pad
  }
  const r = g.radius + 50
  return x + r >= 0 && x - r <= w && y + r >= 0 && y - r <= h
}
export const particleLimit = (reduced: boolean, quality?: string): number => reduced ? 0 : quality === 'low' ? 24 : quality === 'medium' ? 48 : 88
/** Only a successful, synchronously composited GPU pass owns the visual event. */
export function runVfxPass(gpu: () => boolean, fallback: () => void): void {
  try { if (gpu()) return } catch { /* Canvas is authoritative on failure. */ }
  fallback()
}
