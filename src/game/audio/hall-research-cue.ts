import { RESEARCH } from '../content/meta/catalog'
import { getResearchStates } from '../content/meta/progression'
import type { MetaState } from '../content/meta/state'
import { HALL_TALENTS, HALL_GROUPS, hallTalent, hallTalentEligible } from '../content/meta/hall-talents'
import { HALL_UPGRADE, hallRankVariant } from './hall-upgrade-sample'

/** Choose a cue from committed ranks, including all prerequisites of a child. */
export function researchCelebrationVariant(id: string, before: MetaState | null, after: MetaState | null): number {
  const def = RESEARCH.find(node => node.id === id)
  const rank = after?.research[id] ?? 0
  if (!before || !after || !def) return hallRankVariant(rank, def?.maxRank ?? 5, false)
  const locked = new Set(getResearchStates(before).filter(node => node.locked).map(node => node.id))
  const opened = getResearchStates(after).some(node => !node.locked && locked.has(node.id))
  return hallRankVariant(rank, def.maxRank, opened)
}

export function talentCelebrationVariant(id:string, hero:string, before:MetaState|null, after:MetaState|null):number {
  const node=hallTalent(id)
  if(!node||!before?.hall||!after?.hall) return HALL_UPGRADE.rank
  if(node.maxRank===1) {
    const kind=HALL_GROUPS.find(g=>g.id===node.group)?.kind
    return kind==='hero'?HALL_UPGRADE.signature:kind==='synergy'?HALL_UPGRADE.resonance:HALL_UPGRADE.keystone
  }
  const opened=HALL_TALENTS.some(n=>!hallTalentEligible(n.id,before,before.hall!.ownership,hero)&&hallTalentEligible(n.id,after,after.hall!.ownership,hero))
  return hallRankVariant(after.hall.ownership[id]??0,node.maxRank,opened)
}
export function attunementCelebrationVariant(hero:string,before:MetaState|null,after:MetaState|null):number|undefined {
  const a=before?.hall?.attunement,b=after?.hall?.attunement
  if(!a||!b)return undefined
  if(b.resonance&&b.resonance!==a.resonance)return HALL_UPGRADE.resonanceAttune
  if(b.hero[hero]&&b.hero[hero]!==a.hero[hero])return HALL_UPGRADE.signatureAttune
  if(b.universal.some(id=>!a.universal.includes(id)))return HALL_UPGRADE.attune
  return undefined
}
