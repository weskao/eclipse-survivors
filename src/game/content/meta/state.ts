import { validWallet, type CloudWallet } from '../../../cloud/wallet-policy'
import type { JobId } from '../../types'
import { ACHIEVEMENTS, MILESTONES, RESEARCH, STARTING_BONUSES, STARTING_EQUIPMENT, isCosmeticId, isDiscoverableId } from './catalog'

export type DiscoveryKind = 'relics' | 'weapons' | 'evolutions' | 'bosses'
export interface Mastery { xp: number; level: number }
export interface ModeRecord { runs: number; wins: number; bestKills: number; bestSeconds: number }
export interface MetaState {
  version: 3
  embers: number
  /** Local-only acknowledged cloud balance; never part of the uploaded document beyond its two fields. */
  cloudWallet?: CloudWallet
  runs: number
  wins: number
  bossWins: number
  achievements: string[]
  claimedMilestones: string[]
  research: Record<string, number>
  mastery: Record<string, Mastery>
  equipment: string[]
  bonuses: string[]
  discoveries: Record<DiscoveryKind, string[]>
  modeRecords: Record<string, ModeRecord>
  cosmetics: string[]
  /** Optional for compatibility with already committed v3 envelopes. */
  equippedCosmetics?: Partial<Record<JobId, string>>
  /** No eviction: when full, settlement must stop rather than repay old IDs. */
  runIds: string[]
}
export const MAX_RUN_IDS = 20_000
export const MAX_DISCOVERIES = 1024
const heroes: readonly JobId[] = ['knight', 'ranger', 'wizard']
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const whole = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max
const nonNegativeNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const isRunId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length < 128
const validMode = (id: string): boolean => ['quick', 'standard', 'endless', 'challenge'].includes(id) || isDiscoverableId(id)
const uniqueStrings = (v: unknown, max: number, valid: (x: unknown) => x is string): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every(valid) && new Set(v).size === v.length
const validKeys = (obj: Record<string, unknown>, ids: readonly string[]): boolean => Object.keys(obj).every(k => ids.includes(k))
const validTier = (v: unknown, max: number): boolean => whole(v, max)

export function createMetaState(): MetaState {
  return {
    version: 3, embers: 0, runs: 0, wins: 0, bossWins: 0,
    achievements: [], claimedMilestones: [], equipment: [], bonuses: [], cosmetics: [],
    equippedCosmetics: { knight: 'knight-default', ranger: 'ranger-default', wizard: 'wizard-default' },
    research: Object.fromEntries(RESEARCH.map(x => [x.id, 0])) as Record<string, number>,
    mastery: Object.fromEntries(heroes.map(x => [x, { xp: 0, level: 1 }])) as Record<string, Mastery>,
    discoveries: { relics: [], weapons: [], evolutions: [], bosses: [] },
    modeRecords: {}, runIds: [],
  }
}
export const resetMetaState = createMetaState
export const cloneMetaState = (state: MetaState): MetaState => ({
  ...state, ...(state.cloudWallet ? { cloudWallet: { ...state.cloudWallet } } : {}), achievements: [...state.achievements], claimedMilestones: [...state.claimedMilestones],
  research: { ...state.research },
  mastery: Object.fromEntries(Object.entries(state.mastery).map(([k, v]) => [k, { ...v }])),
  equipment: [...state.equipment], bonuses: [...state.bonuses], cosmetics: [...state.cosmetics],
  equippedCosmetics: { ...state.equippedCosmetics },
  discoveries: {
    relics: [...state.discoveries.relics], weapons: [...state.discoveries.weapons],
    evolutions: [...state.discoveries.evolutions], bosses: [...state.discoveries.bosses],
  },
  modeRecords: Object.fromEntries(Object.entries(state.modeRecords).map(([k, v]) => [k, { ...v }])),
  runIds: [...state.runIds],
})

/** Strict trust-boundary check. Nothing is coerced and unknown schema versions are refused. */
export function validateMetaState(raw: unknown): raw is MetaState {
  if (!isObj(raw) || (raw.cloudWallet !== undefined && !validWallet(raw.cloudWallet)) || raw.version !== 3 || !whole(raw.embers) || !whole(raw.runs) || !whole(raw.wins) || !whole(raw.bossWins)
    || raw.wins > raw.runs || !isObj(raw.research) || !isObj(raw.mastery)
    || !isObj(raw.discoveries) || !isObj(raw.modeRecords)
    || !uniqueStrings(raw.runIds, MAX_RUN_IDS, isRunId)) return false
  // Narrow once outside closures: TypeScript does not retain indexed property guards in callbacks.
  const research = raw.research as Record<string, unknown>
  const mastery = raw.mastery as Record<string, unknown>
  const achievements = ACHIEVEMENTS.map(a => a.id)
  const milestones = MILESTONES.map(m => m.id)
  const gear = STARTING_EQUIPMENT.map(e => e.id)
  const bonuses = STARTING_BONUSES.map(b => b.id)
  const fromIds = (ids: readonly string[]) => (v: unknown): v is string => typeof v === 'string' && ids.includes(v)
  if (!uniqueStrings(raw.achievements, achievements.length, fromIds(achievements))
    || !uniqueStrings(raw.claimedMilestones, milestones.length, fromIds(milestones))
    || !uniqueStrings(raw.equipment, gear.length, fromIds(gear))
    || !uniqueStrings(raw.bonuses, bonuses.length, fromIds(bonuses))
    || !uniqueStrings(raw.cosmetics, 1024, isCosmeticId)
    || !validKeys(research, RESEARCH.map(x => x.id))
    || RESEARCH.some(def => !validTier(research[def.id], def.maxRank)
      || ((research[def.id] as number) > 0
        && (def.requires ?? []).some(req => (research[req.id] as number) < req.rank)))) return false
  for (const [id, value] of Object.entries(mastery)) {
    if (!(heroes.includes(id as JobId) || isDiscoverableId(id)) || !isObj(value)
      || !whole(value.xp, 10_000_000) || !whole(value.level, 1000) || value.level < 1) return false
  }
  if (heroes.some(id => !mastery[id])) return false
  const categories: readonly DiscoveryKind[] = ['relics', 'weapons', 'evolutions', 'bosses']
  if (!validKeys(raw.discoveries, categories)) return false
  for (const category of categories) if (!uniqueStrings(raw.discoveries[category], MAX_DISCOVERIES, isDiscoverableId)) return false
  if (Object.keys(raw.modeRecords).length > 256) return false
  for (const [id, record] of Object.entries(raw.modeRecords)) {
    if (!validMode(id) || !isObj(record) || !whole(record.runs) || !whole(record.wins)
      || !nonNegativeNumber(record.bestKills) || !nonNegativeNumber(record.bestSeconds)
      || record.wins > record.runs) return false
  }
  if (raw.equippedCosmetics !== undefined) {
    if (!isObj(raw.equippedCosmetics)) return false
    for (const [hero, skin] of Object.entries(raw.equippedCosmetics)) {
      if (!heroes.includes(hero as JobId) || !isCosmeticId(skin) || !skin.startsWith(hero + '-')
        || (skin !== hero + '-default' && !(raw.cosmetics as string[]).includes(skin))) return false
    }
  }
  return true
}

/** Read-only helpers. Integration is solely responsible for persistence. */
export function parseMetaSnapshot(json: string): MetaState | null {
  try { const raw: unknown = JSON.parse(json); return validateMetaState(raw) ? raw : null } catch { return null }
}
export function readMetaSnapshot(read: () => string | null): MetaState | null {
  try { const data = read(); return data === null ? null : parseMetaSnapshot(data) } catch { return null }
}
