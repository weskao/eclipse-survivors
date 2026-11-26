import { BALANCE } from './config'

/** Shared damage classification and presentation metadata. */
export type HealthImpact = 'critical' | 'heavy'
export function classifyHealthImpact(lossFraction: number, critical = false): HealthImpact | undefined {
  return critical ? 'critical' : lossFraction >= BALANCE.combat.heroHitFeedback.heavyLossFraction - 1e-9 ? 'heavy' : undefined
}
let version = 0
const criticalVersions = new WeakMap<object, number>()
export function markHealthCritical(target: object): void { criticalVersions.set(target, ++version) }
export function healthCriticalVersion(target: object): number { return criticalVersions.get(target) ?? 0 }

export type IncomingRank = keyof typeof BALANCE.combat.incomingCritical
export type HeroDamageSeverity = HealthImpact | 'extreme'
export interface IncomingHit { rank?: IncomingRank; angle?: number }

/** Only direct hostile attacks call this. The engine injects its seeded RNG. */
export function rollIncomingCritical(rank: IncomingRank, rng: () => number): boolean {
  const chance = BALANCE.combat.incomingCritical[rank].chance
  if (chance <= 0) return false
  const roll = rng()
  return Number.isFinite(roll) && roll >= 0 && roll < chance
}

export function classifyHeroDamage(lossFraction: number, critical = false): HeroDamageSeverity | undefined {
  if (lossFraction >= BALANCE.combat.heroHitFeedback.extremeLossFraction - 1e-9) return 'extreme'
  return classifyHealthImpact(lossFraction, critical)
}

// One short, directional recoil per landed hit, independent of persistent low-HP warning.
// Weak ownership keeps reset/new-run state clean without another ticking effect pool.
const heroImpacts = new WeakMap<object, { at: number; angle: number; severity: HeroDamageSeverity }>()
export function recordHeroImpact(hero: object, at: number, angle: number, severity: HeroDamageSeverity): void {
  heroImpacts.set(hero, { at, angle: Number.isFinite(angle) ? angle : 0, severity })
}
export function clearHeroImpact(hero: object): void { heroImpacts.delete(hero) }
export function sampleHeroImpact(hero: object, now: number) {
  const event = heroImpacts.get(hero)
  if (!event) return undefined
  const tuning = BALANCE.combat.heroHitFeedback[event.severity]
  const p = (now - event.at) / tuning.seconds
  if (p < 0 || p >= 1) return undefined
  const kick = tuning.shakePx * Math.cos(p * Math.PI * 2) * (1 - p) ** 2
  return { severity: event.severity, angle: event.angle, progress: p,
    offsetX: Math.cos(event.angle) * kick, offsetY: Math.sin(event.angle) * kick * .75 }
}
