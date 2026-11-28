import { BALANCE, researchCost, type ResearchId } from '../../config'
import type { RunStats } from '../../../meta/types'
import { mergeMonsterKills, validMonsterKills, isNamedBoss, type MonsterId } from '../../monster-catalog'
import {
  ACHIEVEMENTS, MILESTONES, RESEARCH, STARTING_BONUSES, STARTING_EQUIPMENT,
  LEGACY_EVOLUTIONS, LEGACY_WEAPONS, isCosmeticId, isDiscoverableId,
  type AchievementDef, type MilestoneDef, type Presentation, type ResearchDef, type UnlockDef,
} from './catalog'
import {
  cloneMetaState, MAX_DISCOVERIES, MAX_RUN_IDS, validateMetaState,
  type DiscoveryKind, type MetaState, type ModeRecord,
} from './state'

export interface RunReceipt {
  stats: RunStats
  /** Optional content may be absent from the current registry without being forgotten. */
  relicIds?: readonly string[]
  weaponIds?: readonly string[]
  evolutionIds?: readonly string[]
  bossIds?: readonly string[]
  cosmeticIds?: readonly string[]
  modeId?: string
  heroId?: string
}
export interface GrantedReward { type: 'run' | 'achievement' | 'milestone'; id: string; embers: number }
export interface ProgressResult { accepted: boolean; reason?: 'invalid' | 'duplicate' | 'ledger-full'; state: MetaState; rewards: GrantedReward[] }
export interface PurchaseResult { ok: boolean; state: MetaState }
const validId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 128
const whole = (v: unknown, cap: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= cap
const nonnegative = (v: unknown, cap: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= cap
const validContentList = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.length <= 256 && v.every(isDiscoverableId)
const validOptionalList = (v: unknown): boolean =>
  v === undefined || validContentList(v)
const modeValid = (v: unknown): v is string =>
  typeof v === 'string' && (['quick', 'standard', 'endless', 'challenge'].includes(v) || isDiscoverableId(v))
const heroValid = (v: unknown): v is string =>
  typeof v === 'string' && (['knight', 'ranger', 'wizard'].includes(v) || isDiscoverableId(v))
const safeCurrency = (n: number): boolean => Number.isSafeInteger(n) && n >= 0

function isReceiptValid(receipt: RunReceipt): boolean {
  if (!receipt || typeof receipt !== 'object' || !receipt.stats) return false
  const s = receipt.stats
  if (!validId(s.id) || !modeValid(receipt.modeId ?? s.mode) || !heroValid(receipt.heroId ?? s.hero)
    || typeof s.victory !== 'boolean' || typeof s.bossDefeated !== 'boolean'
    || !nonnegative(s.seconds, 86_400) || !whole(s.kills, 1_000_000)
    || !whole(s.level, 1000) || !nonnegative(s.damageDealt, 1e12)
    || !nonnegative(s.damageTaken, 1e12) || !nonnegative(s.remainingHp, 1e9)
    || !s.enemies || typeof s.enemies !== 'object' || Array.isArray(s.enemies)
    || !Array.isArray(s.abilities) || s.abilities.length > 256
    || !s.abilities.every(x => typeof x === 'string' && (isDiscoverableId(x)
      || ['damage', 'speed', 'haste', 'maxhp', 'magnet', 'heal'].includes(x)))) return false
  if (!Object.values(s.enemies).every(x => whole(x, 1_000_000))) return false
  if (s.monsterKills !== undefined && (!validMonsterKills(s.monsterKills) || !Object.values(s.monsterKills).every(x => whole(x, 1_000_000)))) return false
  if (!validOptionalList(receipt.relicIds) || !validOptionalList(receipt.weaponIds)
    || !validOptionalList(receipt.evolutionIds) || !validOptionalList(receipt.bossIds)) return false
  if (receipt.cosmeticIds !== undefined &&
    (!Array.isArray(receipt.cosmeticIds) || receipt.cosmeticIds.length > 256 || !receipt.cosmeticIds.every(isCosmeticId))) return false
  return true
}
const dedupe = (target: string[], incoming: readonly string[]): void => {
  const seen = new Set(target)
  for (const id of incoming) if (!seen.has(id)) { target.push(id); seen.add(id) }
}
export function achievementEligible(id: string, s: MetaState, run?: RunReceipt): boolean {
  switch (id) {
    case 'first-blood': return !!run && run.stats.kills > 0
    case 'first-victory': return s.wins > 0
    case 'monster-hunter': return !!run && run.stats.kills >= 100
    case 'boss-slayer': return s.bossWins > 0
    case 'survivor': return !!run && run.stats.seconds >= 300
    case 'three-heroes': return ['knight', 'ranger', 'wizard'].every(id => (s.mastery[id]?.xp ?? 0) > 0)
    case 'veteran-explorer': return s.runs >= 10
    case 'victorious-five': return s.wins >= 5
    case 'abyss-conqueror': return s.bossWins >= 3
    case 'endless-walker': return !!run && (run.modeId ?? run.stats.mode) === 'endless' && run.stats.seconds >= 600
    case 'relic-collector': return s.discoveries.relics.length >= 5
    case 'evolution-scholar': return s.discoveries.evolutions.length >= 3
    case 'cosmetic-curator': return s.cosmetics.length >= 5
    case 'challenge-champion': return !!run && (run.modeId ?? run.stats.mode) === 'challenge' && run.stats.victory
    default: return false
  }
}
export function milestoneEligible(id: string, s: MetaState): boolean {
  switch (id) {
    case 'first-boss': return s.bossWins > 0
    case 'three-wins': return s.wins >= 3
    case 'ten-runs': return s.runs >= 10
    case 'five-relics': return s.discoveries.relics.length >= 5
    case 'three-evolutions': return s.discoveries.evolutions.length >= 3
    default: return false
  }
}
export const getAchievementStates = (state: MetaState): (AchievementDef & { unlocked: boolean })[] =>
  ACHIEVEMENTS.map(a => ({ ...a, unlocked: state.achievements.includes(a.id) }))
export const getDiscoveryEntries = (state: MetaState, kind: DiscoveryKind, ids: readonly string[]) =>
  ids.map(id => ({ id, unlocked: state.discoveries[kind].includes(id) }))
export function getRewardMetadata(reward: GrantedReward): Presentation {
  const entry: AchievementDef | MilestoneDef | undefined = reward.type === 'achievement'
    ? ACHIEVEMENTS.find(x => x.id === reward.id)
    : reward.type === 'milestone' ? MILESTONES.find(x => x.id === reward.id) : undefined
  return entry ?? { icon: '✦', title: '遠征結算', description: '本次遠征獲得的餘燼', rarity: 'common' }
}
export const masteryLevelForXp = (xp: number): number => Math.min(BALANCE.meta.runRewards.masteryMaxLevel,
  1 + Math.floor(Math.sqrt(xp / BALANCE.meta.runRewards.masteryLevelDivisor)))
function modeRecord(previous: ModeRecord | undefined, run: RunStats): ModeRecord {
  return {
    runs: (previous?.runs ?? 0) + 1, wins: (previous?.wins ?? 0) + Number(run.victory),
    bestKills: Math.max(previous?.bestKills ?? 0, run.kills),
    bestSeconds: Math.max(previous?.bestSeconds ?? 0, run.seconds),
  }
}

/** Atomic, side-effect-free settlement. Call only once for the authoritative completed run. */
export function applyCompletedRun(state: MetaState, receipt: RunReceipt): ProgressResult {
  const rejected = (reason: ProgressResult['reason']): ProgressResult => ({ accepted: false, reason, state, rewards: [] })
  if (!validateMetaState(state) || !isReceiptValid(receipt)) return rejected('invalid')
  const stats = receipt.stats
  if (state.runIds.includes(stats.id)) return rejected('duplicate')
  if (state.runIds.length >= MAX_RUN_IDS) return rejected('ledger-full')
  const next = cloneMetaState(state)
  const hero = receipt.heroId ?? stats.hero
  const mode = receipt.modeId ?? stats.mode
  next.runIds.push(stats.id)
  next.runs++
  next.wins += Number(stats.victory)
  next.bossWins += Number(stats.bossDefeated)
  next.monsterKills = mergeMonsterKills(next.monsterKills ?? {}, stats.monsterKills ?? stats.enemies)
  const previous = next.mastery[hero] ?? { xp: 0, level: 1 }
  const xp = previous.xp + BALANCE.meta.runRewards.masteryBaseXp
    + Math.floor(stats.kills / BALANCE.meta.runRewards.masteryKillsDivisor)
    + (stats.victory ? BALANCE.meta.runRewards.masteryVictoryXp : 0)
  if (xp > BALANCE.meta.runRewards.masteryXpMax) return rejected('invalid')
  next.mastery[hero] = { xp, level: masteryLevelForXp(xp) }
  next.modeRecords[mode] = modeRecord(next.modeRecords[mode], stats)
  const fromAbilities = stats.abilities.filter(id => isDiscoverableId(id))
  dedupe(next.discoveries.weapons, [...fromAbilities.filter(id => !LEGACY_EVOLUTIONS.includes(id) && (LEGACY_WEAPONS.includes(id) || id.includes(':'))), ...(receipt.weaponIds ?? [])])
  dedupe(next.discoveries.evolutions, [...fromAbilities.filter(id => LEGACY_EVOLUTIONS.includes(id)), ...(receipt.evolutionIds ?? [])])
  dedupe(next.discoveries.relics, receipt.relicIds ?? [])
  const exactBosses = Object.entries(stats.monsterKills ?? {}).filter(([id, count]) => count > 0 && isNamedBoss(id as MonsterId)).map(([id]) => 'bosses:' + id)
  dedupe(next.discoveries.bosses, receipt.bossIds ?? (stats.monsterKills ? [...exactBosses, ...((stats.monsterKills.boss ?? 0) > 0 ? ['bosses:legacy-boss'] : [])] : stats.bossDefeated ? ['bosses:legacy-boss'] : []))
  dedupe(next.cosmetics, receipt.cosmeticIds ?? [])
  if (Object.values(next.discoveries).some(ids => ids.length > MAX_DISCOVERIES)
    || next.cosmetics.length > 1024 || Object.keys(next.modeRecords).length > 256) return rejected('invalid')
  const rawBase = Math.floor(stats.kills / BALANCE.meta.runRewards.killDivisor)
    + Math.floor(stats.seconds / BALANCE.meta.runRewards.secondsDivisor)
    + (stats.victory ? BALANCE.meta.runRewards.victoryEmbers : 0)
  const base = Math.floor(rawBase * BALANCE.meta.runRewards.baseMultiplier)
  const research = RESEARCH.find(x => x.id === 'ember-study')
  const bonus = Math.floor(base * ((research?.benefitPerRank ?? 0) * (next.research['ember-study'] ?? 0)))
  const rewards: GrantedReward[] = [{ type: 'run', id: stats.id, embers: base + bonus }]
  // Evaluate in catalog order. A cosmetic unlocked here can satisfy a later collection achievement.
  for (const entry of ACHIEVEMENTS) {
    if (next.achievements.includes(entry.id) || !achievementEligible(entry.id, next, receipt)) continue
    next.achievements.push(entry.id)
    if (entry.cosmetic) dedupe(next.cosmetics, [entry.cosmetic])
    rewards.push({ type: 'achievement', id: entry.id, embers: entry.embers })
  }
  for (const entry of MILESTONES) {
    if (!next.claimedMilestones.includes(entry.id) && milestoneEligible(entry.id, next)) {
      next.claimedMilestones.push(entry.id)
      rewards.push({ type: 'milestone', id: entry.id, embers: entry.embers })
    }
  }
  const earned = rewards.reduce((sum, entry) => sum + entry.embers, 0)
  if (!safeCurrency(next.embers + earned) || !safeCurrency(next.runs) || !safeCurrency(next.wins)
    || !validateMetaState(next)) return rejected('invalid')
  next.embers += earned
  return { accepted: true, state: next, rewards }
}

const researchReady = (state: MetaState, def: ResearchDef): boolean =>
  (def.requires ?? []).every(req => (state.research[req.id] ?? 0) >= req.rank)

/** UI can distinguish prerequisites, owned ranks, affordability and capped nodes. */
export function getResearchStates(state: MetaState) {
  return RESEARCH.map(def => {
    const rank = state.research[def.id] ?? 0
    const nextCost = rank >= def.maxRank ? null : researchCost(def.id as ResearchId, rank)
    const locked = !researchReady(state, def)
    return { ...def, rank, nextCost, locked, unlocked: rank > 0, canBuy: !locked && nextCost !== null && state.embers >= nextCost }
  })
}

export function buyResearch(state: MetaState, id: string): PurchaseResult {
  const def = RESEARCH.find(x => x.id === id)
  if (!def || !validateMetaState(state)) return { ok: false, state }
  const rank = state.research[id]
  const cost = researchCost(def.id as ResearchId, rank)
  if (!researchReady(state, def) || rank >= def.maxRank || state.embers < cost) return { ok: false, state }
  const next = cloneMetaState(state)
  next.embers -= cost
  next.research[id]++
  return { ok: true, state: next }
}
const unlockReady = (state: MetaState, def: UnlockDef): boolean =>
  (!def.masteryLevel || (state.mastery[def.hero ?? '']?.level ?? 0) >= def.masteryLevel)
    && (!def.research || (state.research[def.research] ?? 0) >= 1)

export const getEquipmentStates = (state: MetaState, hero: string) =>
  STARTING_EQUIPMENT.filter(def => def.hero === hero).map(def => ({
    ...def, unlocked: state.equipment.includes(def.id), locked: !unlockReady(state, def),
    canBuy: unlockReady(state, def) && !state.equipment.includes(def.id) && state.embers >= def.cost,
  }))
export const getBonusStates = (state: MetaState) =>
  STARTING_BONUSES.map(def => ({
    ...def, unlocked: state.bonuses.includes(def.id), locked: !unlockReady(state, def),
    canBuy: unlockReady(state, def) && !state.bonuses.includes(def.id) && state.embers >= def.cost,
  }))

function unlock(state: MetaState, id: string, defs: readonly UnlockDef[], field: 'equipment' | 'bonuses'): PurchaseResult {
  const def = defs.find(x => x.id === id)
  if (!def || !validateMetaState(state) || state[field].includes(id) || state.embers < def.cost
    || !unlockReady(state, def)) return { ok: false, state }
  const next = cloneMetaState(state)
  next.embers -= def.cost
  next[field].push(id)
  return { ok: true, state: next }
}
export const unlockStartingEquipment = (state: MetaState, id: string): PurchaseResult =>
  unlock(state, id, STARTING_EQUIPMENT, 'equipment')
export const unlockStartingBonus = (state: MetaState, id: string): PurchaseResult =>
  unlock(state, id, STARTING_BONUSES, 'bonuses')

/** Read-only loadout metadata; run-only effects are applied by the integration layer at run creation. */
export function getStartingLoadout(state: MetaState, hero: string) {
  return {
    equipment: STARTING_EQUIPMENT.filter(x => x.hero === hero && state.equipment.includes(x.id)),
    bonuses: STARTING_BONUSES.filter(x => state.bonuses.includes(x.id)),
    research: RESEARCH.map(x => ({ ...x, rank: state.research[x.id] ?? 0 })),
  }
}
