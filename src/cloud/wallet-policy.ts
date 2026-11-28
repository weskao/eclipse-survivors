export interface CloudWallet { revision: number; embers: number }
export function validWallet(value: unknown): value is CloudWallet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return Object.keys(v).length === 2 && typeof v.embers === 'number' && Number.isSafeInteger(v.embers) && v.embers >= 0
    && typeof v.revision === 'number' && Number.isSafeInteger(v.revision) && v.revision >= 0
}
export function walletPlan(baseline: CloudWallet | null, local: number, remote: CloudWallet): 'restore' | 'upload' | 'conflict' {
  if (!baseline) return local === 0 || local === remote.embers ? 'restore' : 'conflict'
  if (local === baseline.embers || local === remote.embers) return 'restore'
  return baseline.revision === remote.revision && baseline.embers === remote.embers ? 'upload' : 'conflict'
}
