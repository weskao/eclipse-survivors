import { t } from '../../../i18n'
import { skillImageSrc } from '../../../game/ui-art'
import { getResearchStates, getEquipmentStates, getBonusStates } from '../../../game/content/meta/progression'
import type { MetaState } from '../../../game/content/meta/state'
import type { Profile } from '../../../meta/types'
import type { AbilityId } from '../../../game/types'
import { upgradeCost } from '../menu/model'

export interface HallNode {
  id: string
  kind: 'research' | 'equipment' | 'bonus' | 'legacy'
  title: string
  description: string
  art: string
  rank: number
  maxRank: number
  cost: number | null
  locked: boolean
  canBuy: boolean
  requires: readonly { id: string; rank: number; title: string }[]
  requirements: readonly string[]
  current?: string
  next?: string
}

const icons: Record<string, AbilityId> = {
  power: 'damage', vitality: 'maxhp', insight: 'orb', scavenging: 'magnet', 'ember-study': 'blaze',
  'knight-aegis': 'shield', 'ranger-quiver': 'multi', 'wizard-focus': 'bolt',
  'ember-spark': 'orb', 'wanderer-kit': 'magnet', 'guardian-vow': 'maxhp',
}
const art = (id: string) => skillImageSrc(icons[id] ?? 'shield')
const effect = (rank: number, perRank: number, flat: boolean) =>
  '+' + Number((rank * perRank * (flat ? 1 : 100)).toFixed(2)) + (flat ? '' : '%')

export function researchHallNodes(state: MetaState): HallNode[] {
  const research = getResearchStates(state)
  return research.map(node => {
    const flat = node.benefit === 'hpFlat'
    const requires = (node.requires ?? []).map(req => ({ ...req, title: research.find(entry => entry.id === req.id)?.title ?? req.id }))
    return {
      id: node.id, kind: 'research', title: node.title, art: art(node.id),
      description: t(node.description, { value: Number((node.benefitPerRank * (flat ? 1 : 100)).toFixed(2)) }),
      rank: node.rank, maxRank: node.maxRank, cost: node.nextCost, locked: node.locked, canBuy: node.canBuy,
      requires, requirements: requires.map(req => t(req.title) + ' · Lv. ' + req.rank),
      current: effect(node.rank, node.benefitPerRank, flat),
      next: node.nextCost === null ? undefined : effect(node.rank + 1, node.benefitPerRank, flat),
    }
  })
}

export function unlockHallNodes(state: MetaState, hero: string): HallNode[] {
  const research = getResearchStates(state)
  return [
    ...getEquipmentStates(state, hero).map(node => ({
      id: node.id, kind: 'equipment' as const, title: node.title, description: t(node.description), art: art(node.id),
      rank: Number(node.unlocked), maxRank: 1, cost: node.unlocked ? null : node.cost, locked: node.locked,
      canBuy: node.canBuy, requires: [], requirements: node.masteryLevel ? [t('英雄專精') + ' · Lv. ' + node.masteryLevel] : [],
    })),
    ...getBonusStates(state).map(node => ({
      id: node.id, kind: 'bonus' as const, title: node.title,
      description: t(node.description, { value: Number(((node.bonus ?? 0) * 100).toFixed(2)) }), art: art(node.id),
      rank: Number(node.unlocked), maxRank: 1, cost: node.unlocked ? null : node.cost, locked: node.locked,
      canBuy: node.canBuy, requires: [], requirements: node.research ? [t(research.find(req => req.id === node.research)?.title ?? node.research) + ' · Lv. 1'] : [],
    })),
  ]
}

export function legacyHallNodes(profile: Profile): HallNode[] {
  return ([
    { id: 'power', title: '破曉之刃', description: '永久傷害 +4% / 階', perRank: .04, flat: false },
    { id: 'vitality', title: '不滅之心', description: '永久生命 +12 / 階', perRank: 12, flat: true },
  ] as const).map(node => {
    const rank = profile.upgrades[node.id], maxRank = 3, cost = rank >= maxRank ? null : upgradeCost(rank)
    return { id: node.id, kind: 'legacy', title: node.title, description: t(node.description), art: art(node.id),
      rank, maxRank, cost, locked: false, canBuy: cost !== null && profile.embers >= cost, requires: [], requirements: [],
      current: effect(rank, node.perRank, node.flat), next: cost === null ? undefined : effect(rank + 1, node.perRank, node.flat) }
  })
}

export function hallRows(nodes: readonly HallNode[]): HallNode[][] {
  const depths = new Map<string, number>()
  const depth = (node: HallNode, visited = new Set<string>()): number => {
    const cached = depths.get(node.id)
    if (cached !== undefined) return cached
    if (visited.has(node.id)) return 0
    const seen = new Set(visited).add(node.id)
    const parents = node.requires.map(req => nodes.find(parent => parent.id === req.id)).filter((parent): parent is HallNode => !!parent)
    const value = parents.length ? 1 + Math.max(...parents.map(parent => depth(parent, seen))) : 0
    depths.set(node.id, value)
    return value
  }
  const rows: HallNode[][] = []
  for (const node of nodes) (rows[depth(node)] ??= []).push(node)
  return rows.filter(Boolean)
}

export function hallEdges(previous: readonly HallNode[], row: readonly HallNode[]) {
  return row.flatMap((node, to) => node.requires.flatMap(req => {
    const from = previous.findIndex(parent => parent.id === req.id)
    const parent = previous[from]
    return parent ? [{ id: req.id + ':' + node.id, from: (from + .5) / previous.length * 100,
      to: (to + .5) / row.length * 100, active: parent.rank >= req.rank }] : []
  }))
}
