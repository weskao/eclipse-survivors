import type { ContentEvent, GameState } from '../../types'
import { RELIC_BY_ID, RELIC_CUES, RELICS, type RelicBonuses, type RelicDefinition, type RelicId, type RelicStat } from './catalog'

export type RelicFeedback = (cue: (typeof RELIC_CUES)[keyof typeof RELIC_CUES], relic?: RelicDefinition) => void

export const RELIC_CAPACITY = 10
export const INITIAL_REROLLS = 2
export const INITIAL_BANISHES = 2
const EMPTY_BONUSES: Readonly<RelicBonuses> = Object.freeze({})

export interface TreasureOffer {
  readonly chestId: number
  readonly options: readonly RelicId[]
}
interface RunRelics {
  readonly inventory: Map<RelicId, number>
  readonly banished: Set<RelicId>
  bonuses: Readonly<RelicBonuses>
  pending: TreasureOffer | null
  lastChestId: number
  rerolls: number
  banishes: number
}
const runs = new WeakMap<GameState, RunRelics>()
const fresh = (): RunRelics => ({ inventory: new Map(), banished: new Set(), bonuses: EMPTY_BONUSES,
  pending: null, lastChestId: 0, rerolls: INITIAL_REROLLS, banishes: INITIAL_BANISHES })
function getRun(state: GameState): RunRelics {
  let run = runs.get(state)
  if (!run) { run = fresh(); runs.set(state, run) }
  return run
}
export function resetRelics(state: GameState): void { runs.delete(state) }
export function inventorySnapshot(state: GameState): Readonly<{ items: readonly { id: RelicId; stacks: number }[];
  capacity: number; rerolls: number; banishes: number; banished: readonly RelicId[]; pending: TreasureOffer | null }> {
  const run = getRun(state)
  return { items: Array.from(run.inventory, ([id, stacks]) => ({ id, stacks })), capacity: RELIC_CAPACITY,
    rerolls: run.rerolls, banishes: run.banishes, banished: [...run.banished],
    pending: run.pending ? { chestId: run.pending.chestId, options: [...run.pending.options] } : null }
}
function recompute(run: RunRelics): void {
  const stats: RelicBonuses = {}
  for (const [id, stacks] of run.inventory) {
    for (const [stat, value] of Object.entries(RELIC_BY_ID.get(id)!.bonuses)) {
      const key = stat as RelicStat
      stats[key] = (stats[key] ?? 0) + value * stacks
    }
  }
  run.bonuses = Object.freeze(stats)
}
/** Snapshot cached on acquisition; never scans the inventory in the per-hit path. */
export function relicBonuses(state: GameState): Readonly<RelicBonuses> { return getRun(state).bonuses }
export function hasRelic(state: GameState, id: RelicId): boolean { return getRun(state).inventory.has(id) }
export function acquireRelic(state: GameState, id: RelicId): boolean {
  const hero = state.hero
  const relic = RELIC_BY_ID.get(id)
  const run = getRun(state)
  if (!hero || !relic || run.banished.has(id)) return false
  const stacks = run.inventory.get(id) ?? 0
  if (stacks >= relic.maxStacks || (!stacks && run.inventory.size >= RELIC_CAPACITY)) return false
  run.inventory.set(id, stacks + 1)
  recompute(run)
  const bonuses = relic.bonuses
  if (bonuses.damage) hero.damage *= 1 + bonuses.damage
  if (bonuses.speed) hero.speed *= 1 + bonuses.speed
  if (bonuses.haste) hero.delay *= 1 / (1 + bonuses.haste)
  if (bonuses.maxHp || bonuses.maxHpRate) {
    const oldMax = hero.max
    hero.max = Math.max(1, Math.round((hero.max + (bonuses.maxHp ?? 0)) * (1 + (bonuses.maxHpRate ?? 0))))
    hero.hp = Math.min(hero.max, Math.max(1, hero.hp + Math.max(0, hero.max - oldMax)))
  }
  return true
}
function eligible(run: RunRelics, avoid: ReadonlySet<RelicId> = new Set()): RelicDefinition[] {
  return RELICS.filter(relic => !avoid.has(relic.id) && !run.banished.has(relic.id) &&
    (run.inventory.get(relic.id) ?? 0) < relic.maxStacks &&
    (run.inventory.has(relic.id) || run.inventory.size < RELIC_CAPACITY))
}
function weightedOptions(run: RunRelics, rng: () => number, avoid: ReadonlySet<RelicId> = new Set()): RelicId[] {
  const pool = eligible(run, avoid)
  const choices: RelicId[] = []
  while (choices.length < 3 && pool.length) {
    const total = pool.reduce((sum, def) => sum + def.weight, 0)
    const sample = rng()
    if (!Number.isFinite(sample)) throw new Error('Invalid treasure RNG sample')
    let roll = Math.min(1 - Number.EPSILON, Math.max(0, sample)) * total
    let index = pool.findIndex(def => (roll -= def.weight) < 0)
    if (index < 0) index = pool.length - 1
    choices.push(pool.splice(index, 1)[0]!.id)
  }
  return choices
}
/** chestId must be a strictly increasing world-event serial. Same/old chests never pay twice. */
export function openTreasure(state: GameState, chestId: number, rng: () => number, feedback?: RelicFeedback): TreasureOffer | null {
  const run = getRun(state)
  if (!state.hero || run.pending || !Number.isSafeInteger(chestId) || chestId <= run.lastChestId) return null
  run.lastChestId = chestId
  const options = weightedOptions(run, rng)
  if (!options.length) return null
  run.pending = { chestId, options }
  feedback?.(RELIC_CUES.chestOpen)
  return { chestId, options: [...options] }
}
export function claimTreasure(state: GameState, chestId: number, id: RelicId, feedback?: RelicFeedback): boolean {
  const run = getRun(state)
  if (!run.pending || run.pending.chestId !== chestId || !run.pending.options.includes(id)) return false
  if (!acquireRelic(state, id)) return false
  run.pending = null
  const relic = RELIC_BY_ID.get(id)!
  feedback?.(relic.cursed ? RELIC_CUES.curseTaken : RELIC_CUES.rewardTaken, relic)
  return true
}
export function rerollTreasure(state: GameState, chestId: number, rng: () => number): TreasureOffer | null {
  const run = getRun(state)
  if (!run.pending || run.pending.chestId !== chestId || run.rerolls <= 0) return null
  const old = new Set(run.pending.options)
  // Prefer new choices; if all remaining items are already shown, a reroll is not charged.
  const options = weightedOptions(run, rng, old)
  if (!options.length) return null
  run.rerolls--
  run.pending = { chestId, options }
  return { chestId, options: [...options] }
}
export function banishTreasure(state: GameState, chestId: number, id: RelicId): boolean {
  const run = getRun(state)
  if (!run.pending || run.pending.chestId !== chestId || !run.pending.options.includes(id) ||
      run.banishes <= 0 || run.inventory.has(id) || run.banished.has(id)) return false
  run.banishes--
  run.banished.add(id)
  run.pending = { chestId, options: run.pending.options.filter(option => option !== id) }
  return true
}
export interface AttackContext {
  element?: 'physical' | 'fire' | 'frost' | 'lightning'
  source?: 'weapon' | 'summon'
  moving?: boolean
  afterDash?: boolean
  boss?: boolean
  /** Remaining enemy HP fraction before this hit. */
  targetHpFraction?: number
}
export interface AttackResult { damage: number; critical: boolean; execute: boolean; pierce: number; extraProjectile: boolean }
/** Pre-hit adapter: caller applies the result to the actual target (never an extra XP event). */
export function calculateRelicAttack(state: GameState, damage: number, context: AttackContext, rng: () => number): AttackResult {
  const b = relicBonuses(state)
  if (!Number.isFinite(damage) || damage <= 0) return { damage: 0, critical: false, execute: false, pierce: 0, extraProjectile: false }
  let multiplier = 1 + (context.element && context.element !== 'physical' ? b[context.element] ?? 0 : 0)
  if (context.source === 'summon') multiplier *= 1 + (b.summon ?? 0) + (hasRelic(state, 'relics:wolf-totem') && hasRelic(state, 'relics:shadow-chain') ? 0.15 : 0)
  if (context.moving) multiplier *= 1 + (b.moving ?? 0)
  else if (context.moving === false) multiplier *= 1 + (b.stationary ?? 0)
  if (context.afterDash) multiplier *= 1 + (b.dashDamage ?? 0)
  if (context.boss) multiplier *= 1 + (b.bossDamage ?? 0)
  const critChance = Math.min(0.75, Math.max(0, b.critChance ?? 0))
  const critical = critChance > 0 && rng() < critChance
  if (critical) multiplier *= 1.5 + (b.critPower ?? 0)
  const execute = !context.boss && Number.isFinite(context.targetHpFraction) &&
    context.targetHpFraction! > 0 && context.targetHpFraction! <= Math.min(0.3, b.execute ?? 0)
  const pierce = Math.max(0, Math.floor((b.pierce ?? 0) +
    (hasRelic(state, 'relics:celestial-lens') && hasRelic(state, 'relics:echo-gem') ? 1 : 0)))
  const extraChance = Math.min(0.6, Math.max(0, b.extraProjectile ?? 0))
  const extraProjectile = extraChance > 0 && rng() < extraChance
  return { damage: damage * multiplier, critical, execute, pierce, extraProjectile }
}
export interface IncomingResult { damage: number; dodged: boolean; reflected: number }
/** Must be applied BEFORE existing hero damage processing, not on the post-hit event. */
export function calculateRelicIncoming(state: GameState, amount: number, rng: () => number): IncomingResult {
  if (!Number.isFinite(amount) || amount <= 0) return { damage: 0, dodged: false, reflected: 0 }
  const b = relicBonuses(state)
  if (rng() < Math.min(0.6, Math.max(0, b.dodge ?? 0))) return { damage: 0, dodged: true, reflected: 0 }
  let resist = b.resistance ?? 0
  const hero = state.hero
  if (hero && hero.hp / hero.max < 0.35) resist += b.protectLowHp ?? 0
  const damage = amount * (1 + (b.incoming ?? 0)) * (1 - Math.max(-0.5, Math.min(0.8, resist)))
  return { damage, dodged: false, reflected: damage * Math.max(0, b.reflect ?? 0) }
}
export function relicPickupRadius(state: GameState, radius: number): number {
  return Math.max(0, radius) * (1 + (relicBonuses(state).pickupRange ?? 0))
}
/** Bounded periodic recovery; this is an explicit integration hook, not an auto-running ability. */
export function tickRelicRecovery(state: GameState, dt: number): void {
  const hero = state.hero
  if (!hero || !Number.isFinite(dt) || dt <= 0 || state.mode !== 'play') return
  const b = relicBonuses(state)
  const delta = (b.regeneration ?? 0) * Math.min(dt, 0.25)
  hero.hp = Math.max(1, Math.min(hero.max, hero.hp + (delta > 0 ? delta * (1 - (b.healingPenalty ?? 0)) : delta)))
}
/** Existing ContentPack event callback supports post-hit lifesteal, on-kill healing, and pickups. */
export function onRelicEvent(state: GameState, event: ContentEvent): void {
  if (event.type === 'reset') { resetRelics(state); return }
  const hero = state.hero
  if (!hero) return
  const b = relicBonuses(state)
  const recovery = 1 - Math.min(0.95, Math.max(0, b.healingPenalty ?? 0))
  if (event.type === 'hit' && event.damage > 0) {
    // Real dealt damage only; lifesteal capped to 8% max HP per hit.
    const recovered = Math.min(hero.max * 0.08, event.damage * (b.lifeSteal ?? 0) * recovery)
    hero.hp = Math.min(hero.max, hero.hp + recovered)
  } else if (event.type === 'kill') {
    hero.hp = Math.min(hero.max, hero.hp + (b.healOnKill ?? 0) * recovery)
  } else if (event.type === 'pickup') {
    hero.hp = Math.min(hero.max, hero.hp + (b.healOnPickup ?? 0) * recovery)
  } else if (event.type === 'run-complete') {
    getRun(state).pending = null
  }
}
