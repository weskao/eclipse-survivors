import { BALANCE } from '../../../game/config'
import { LOW_HP_PCT } from '../../../game/constants'

export type LowHealthTier = 'normal' | 'warning' | 'critical' | 'emergency' | 'dead'

/** HUD-only classification; the real engine owns HP and game-over decisions. */
export function lowHealthTier(percent: number): LowHealthTier {
  if (!Number.isFinite(percent)) return 'normal'
  // Engine HP division can produce 12.000000000000002 at an exact 12% boundary.
  const hp = Math.round(percent * 100) / 100
  if (hp <= 0) return 'dead'
  if (hp <= BALANCE.world.lowHpEmergencyPct return 'emergency'
  if (percent <= LOW_HP_PCT) return 'critical'
  if (percent <= BALANCE.world.lowHpWarningPct) return 'warning'
  return 'normal'
}
