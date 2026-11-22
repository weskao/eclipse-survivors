import { migrateProfile } from '../../../meta/profile'
import type { Profile } from '../../../meta/types'
import { ACHIEVEMENTS, LEGACY_EVOLUTIONS, MILESTONES, isDiscoverableId } from './catalog'
import { achievementEligible, milestoneEligible } from './progression'
import { createMetaState, validateMetaState, type MetaState } from './state'

export interface MetaMigrationProposal {
  readonly fromVersion: 2
  readonly toVersion: 3
  /** No writes. Integration must make an atomic transition and retire the old reward writer. */
  readonly requiresIntegration: true
  readonly next: MetaState
  /** Normalized, complete legacy v2 profile; keep in the integration-owned persistence envelope. */
  readonly legacyProfile: Profile
}
const safeObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Only complete, validated v2 profiles may be proposed for migration.
 * The proposal is not persisted; existing SAVE_KEY and v2 compatibility are untouched.
 * Historical achievements/milestones are marked completed with ZERO retroactive rewards.
 */
export function proposeV2Migration(raw: unknown): MetaMigrationProposal | null {
  if (!safeObject(raw) || raw.version !== 2) return null
  const legacy: Profile | null = migrateProfile(raw)
  if (!legacy) return null
  const next = createMetaState()
  next.embers = legacy.embers
  // Some valid v2 files were migrated from v1 with wins > runs. Keep both raw values in legacyProfile.
  next.runs = Math.max(legacy.runs, legacy.wins)
  next.wins = legacy.wins
  next.bossWins = Math.floor(legacy.discoveredMonsters.boss ?? 0)
  next.runIds = [...legacy.recentRunIds]
  next.research.power = legacy.upgrades.power
  next.research.vitality = legacy.upgrades.vitality
  next.cosmetics = [...legacy.unlockedCosmetics]
  next.equippedCosmetics = { ...legacy.equippedCosmetics }
  // Passive v2 upgrades (e.g. damage/haste) remain in legacyProfile, not weapon discoveries.
  const weapons = legacy.discoveredAbilities.filter(id => isDiscoverableId(id) && !LEGACY_EVOLUTIONS.includes(id))
  const evolutions = legacy.discoveredAbilities.filter(id => LEGACY_EVOLUTIONS.includes(id))
  next.discoveries.weapons = [...weapons]
  next.discoveries.evolutions = [...evolutions]
  if ((legacy.discoveredMonsters.boss ?? 0) > 0) next.discoveries.bosses = ['bosses:legacy-boss']
  for (const [id, best] of Object.entries(legacy.best)) {
    if (!best) continue
    next.modeRecords[id] = { runs: 0, wins: 0, bestKills: best.kills, bestSeconds: best.seconds }
  }
  // Existing earned achievements remain claimed. Inferred v2 totals get no back pay.
  next.achievements = [...legacy.achievements]
  for (const entry of ACHIEVEMENTS) {
    if (!next.achievements.includes(entry.id) && achievementEligible(entry.id, next)) next.achievements.push(entry.id)
  }
  // Historical play counts are not known per hero; do not fabricate hero mastery XP.
  for (const entry of MILESTONES) {
    if (milestoneEligible(entry.id, next)) next.claimedMilestones.push(entry.id)
  }
  return validateMetaState(next)
    ? { fromVersion: 2, toVersion: 3, requiresIntegration: true, next, legacyProfile: legacy }
    : null
}

