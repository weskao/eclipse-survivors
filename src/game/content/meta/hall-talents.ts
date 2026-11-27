import data from '../../balance/hall-talents.json'
import { RESEARCH } from './catalog'
import type { MetaState } from './state'

export interface HallTalent {
  id: string; group: string; name: string; nameEn: string; maxRank: number
  requires: readonly { id: string; rank: number }[]
  masteryGate: number; firstCost: number; costStep: number
  effect: string; effectEn: string
  art: { temporarySvg: string; futureWebp: string; description: string; status: string }
}
export const HALL_TALENTS: readonly HallTalent[] = data.talents
export const HALL_GROUPS = data.groups
const byId = new Map(HALL_TALENTS.map(node => [node.id, node]))
export const hallTalent = (id: string) => byId.get(id)
export const hallTalentGroup = (group: string) => HALL_TALENTS.filter(node => node.group === group)
export function validateHallTalents(nodes: readonly HallTalent[]): string[] {
  const errors: string[] = []
  const lookup = new Map(nodes.map(node => [node.id,node]))
  const caps = new Map(RESEARCH.map(node => [node.id,node.maxRank]))
  if (lookup.size !== nodes.length) errors.push('duplicate ID')
  for (const node of nodes) {
    if (caps.has(node.id) || !HALL_GROUPS.some(group => group.id === node.group)) errors.push('invalid group or reserved ID: ' + node.id)
    if (!Number.isSafeInteger(node.maxRank) || node.maxRank < 1 || !Number.isSafeInteger(node.firstCost) || node.firstCost < 0 || !Number.isSafeInteger(node.costStep) || node.costStep < 0) errors.push('invalid ranks or costs: ' + node.id)
    for (const req of node.requires) {
      const cap = caps.get(req.id) ?? lookup.get(req.id)?.maxRank
      if (cap === undefined || !Number.isSafeInteger(req.rank) || req.rank < 1 || req.rank > cap) errors.push('invalid prerequisite: ' + node.id + ':' + req.id)
    }
  }
  const visiting = new Set<string>(), visited = new Set<string>()
  function visit(id: string) {
    if (visiting.has(id)) { errors.push('cycle: ' + id); return }
    if (visited.has(id)) return
    const node = lookup.get(id)
    if (!node) return
    visiting.add(id)
    for (const req of node.requires) visit(req.id)
    visiting.delete(id); visited.add(id)
  }
  for (const node of nodes) visit(node.id)
  return errors
}
export function hallTalentCost(id: string, rank: number): number | null {
  const node = byId.get(id)
  if (!node || !Number.isSafeInteger(rank) || rank < 0 || rank >= node.maxRank) return null
  return node.firstCost + node.costStep * rank + 20 * Math.max(0, rank - 2) ** 2
}
export function hallTalentEligible(id: string, state: MetaState, ownership: Readonly<Record<string,number>>, hero: string): boolean {
  const node = byId.get(id)
  if (!node || hallTalentCost(id, ownership[id] ?? 0) === null) return false
  if (node.masteryGate) {
    if (node.group !== hero) return false
    const mastery = state.mastery['heroes:' + hero] ?? state.mastery[hero]
    if ((mastery?.level ?? 1) < node.masteryGate) return false
  }
  return node.requires.every(req => (byId.has(req.id) ? ownership[req.id] ?? 0 : state.research[req.id] ?? 0) >= req.rank)
}
