import { RESEARCH } from '../content/meta/catalog'
import { getResearchStates } from '../content/meta/progression'
import type { MetaState } from '../content/meta/state'
import { hallRankVariant } from './hall-upgrade-sample'

/** Choose a cue from committed ranks, including all prerequisites of a child. */
export function researchCelebrationVariant(id: string, before: MetaState | null, after: MetaState | null): number {
  const def = RESEARCH.find(node => node.id === id)
  const rank = after?.research[id] ?? 0
  if (!before || !after || !def) return hallRankVariant(rank, def?.maxRank ?? 5, false)
  const locked = new Set(getResearchStates(before).filter(node => node.locked).map(node => node.id))
  const opened = getResearchStates(after).some(node => !node.locked && locked.has(node.id))
  return hallRankVariant(rank, def.maxRank, opened)
}
