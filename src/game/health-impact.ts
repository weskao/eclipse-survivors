/** Presentation-only severity; never modifies combat damage or RNG. */
export type HealthImpact = 'critical' | 'heavy'
export function classifyHealthImpact(lossFraction: number, critical = false): HealthImpact | undefined {
  return critical ? 'critical' : lossFraction >= .22 - 1e-9 ? 'heavy' : undefined
}
let version = 0
const criticalVersions = new WeakMap<object, number>()
export function markHealthCritical(target: object): void { criticalVersions.set(target, ++version) }
export function healthCriticalVersion(target: object): number { return criticalVersions.get(target) ?? 0 }
