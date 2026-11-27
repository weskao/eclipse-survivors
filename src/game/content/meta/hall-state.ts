import { HALL_GROUPS, HALL_TALENTS, hallTalent, hallTalentCost, hallTalentEligible } from './hall-talents'
import type { MetaState } from './state'

export interface HallAttunement {
  universal: string[]
  hero: Partial<Record<string, string>>
  resonance: string | null
}
export interface HallProgress {
  ownership: Record<string, number>
  attunement: HallAttunement
}
export type HallRunSnapshot = Readonly<{ hero: string; ranks: Readonly<Record<string, number>> }>
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function emptyHall(): HallProgress {
  return { ownership: {}, attunement: { universal: [], hero: {}, resonance: null } }
}

export function cloneHall(hall: HallProgress): HallProgress {
  return { ownership: { ...hall.ownership }, attunement: { universal: [...hall.attunement.universal], hero: { ...hall.attunement.hero }, resonance: hall.attunement.resonance } }
}

function kind(id: string): string | undefined {
  const node = hallTalent(id)
  return node?.maxRank === 1 ? HALL_GROUPS.find(group => group.id === node.group)?.kind : undefined
}

function owned(ownership: Readonly<Record<string, number>>, id: string): boolean {
  return Object.hasOwn(ownership, id) && ownership[id] === 1
}

export function normalizeHallAttunement(raw: unknown, ownership: Readonly<Record<string, number>>): HallAttunement {
  const result = emptyHall().attunement
  if (!object(raw)) return result
  if (Array.isArray(raw.universal)) {
    const valid = raw.universal.filter(id => typeof id === 'string' && kind(id) === 'discipline' && owned(ownership, id))
    if (valid.length === raw.universal.length && valid.length <= 2 && new Set(valid).size === valid.length) result.universal = [...valid]
  }
  if (object(raw.hero)) for (const [hero, id] of Object.entries(raw.hero)) {
    if (typeof id === 'string' && kind(id) === 'hero' && hallTalent(id)?.group === hero && owned(ownership, id)) result.hero[hero] = id
  }
  if (typeof raw.resonance === 'string' && kind(raw.resonance) === 'synergy' && owned(ownership, raw.resonance)) result.resonance = raw.resonance
  return result
}

export function validHallOwnership(raw: unknown, state: MetaState): raw is Record<string, number> {
  if (!object(raw) || Object.keys(raw).length > HALL_TALENTS.length) return false
  for (const [id, rank] of Object.entries(raw)) {
    const node = hallTalent(id)
    if (!node || typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank < 1 || rank > node.maxRank) return false
    if (node.masteryGate && ((state.mastery['heroes:' + node.group] ?? state.mastery[node.group])?.level ?? 1) < node.masteryGate) return false
    for (const req of node.requires) {
      const value = hallTalent(req.id) ? raw[req.id] : state.research[req.id]
      if (typeof value !== 'number' || value < req.rank) return false
    }
  }
  return true
}

export function validHall(raw: unknown, state: MetaState): raw is HallProgress {
  if (!object(raw) || !validHallOwnership(raw.ownership, state) || !object(raw.attunement)) return false
  const a = raw.attunement
  const normalized = normalizeHallAttunement(a, raw.ownership)
  return Array.isArray(a.universal) && a.universal.length === normalized.universal.length
    && a.universal.every((id, i) => id === normalized.universal[i])
    && object(a.hero) && Object.keys(a.hero).length === Object.keys(normalized.hero).length
    && Object.entries(a.hero).every(([hero, id]) => id === normalized.hero[hero])
    && a.resonance === normalized.resonance
}

export function purchaseHallTalent(state: MetaState, id: string, hero: string, expectedRank: number): MetaState | null {
  if (state.version !== 4 || !state.hall || state.cloudWallet || !validHall(state.hall, state)) return null
  const rank = state.hall.ownership[id] ?? 0
  const cost = hallTalentCost(id, rank)
  if (rank !== expectedRank || cost === null || !Number.isSafeInteger(state.embers) || state.embers < cost
    || !hallTalentEligible(id, state, state.hall.ownership, hero)) return null
  const hall = cloneHall(state.hall)
  hall.ownership[id] = rank + 1
  return { ...state, embers: state.embers - cost, hall }
}

export function equipHall(state: MetaState, hero: string, universal: string[], signature: string | null, resonance: string | null): MetaState | null {
  if (state.version !== 4 || !state.hall || state.cloudWallet || !validHall(state.hall, state)
    || !HALL_GROUPS.some(g => g.kind === 'hero' && g.id === hero)) return null
  const hall = cloneHall(state.hall)
  const requested = { universal: [...universal], hero: { ...hall.attunement.hero }, resonance }
  if (signature === null) delete requested.hero[hero]
  else requested.hero[hero] = signature
  hall.attunement = requested
  if (!validHall(hall, state)) return null
  return { ...state, hall }
}

export function resolveHallRunSnapshot(state: MetaState | null, hero: string): HallRunSnapshot {
  const ranks: Record<string, number> = Object.create(null)
  const hall = state?.version === 4 ? state.hall : undefined
  if (state && hall && validHall(hall, state)) {
    const a = hall.attunement
    for (const node of HALL_TALENTS) {
      const rank = hall.ownership[node.id] ?? 0
      if (!rank) continue
      const group = HALL_GROUPS.find(g => g.id === node.group)
      const active = group?.kind === 'discipline' ? node.maxRank > 1 || a.universal.includes(node.id)
        : group?.kind === 'hero' ? node.group === hero && (node.maxRank > 1 || a.hero[hero] === node.id)
        : group?.kind === 'synergy' && a.resonance === node.id && node.requires.every(req => a.universal.includes(req.id))
      if (active) ranks[node.id] = rank
    }
  }
  return Object.freeze({ hero, ranks: Object.freeze(ranks) })
}
