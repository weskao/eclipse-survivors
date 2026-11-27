import { MAX_MOBS } from '../../constants'
import { hallWorldHealing } from '../meta/hall-runtime'
import { addXp } from '../../progression'
import type { ContentEvent, GameHooks, GameState, Hero, Mob, Point } from '../../types'
import { RELICS, type RelicDefinition } from '../relics/catalog'
import { acquireRelic, inventorySnapshot } from '../relics/runtime'
import { createLegacyEventWorld } from './adapters'
import { WORLD_EVENT_DEFINITIONS, validEffects } from './definitions'
import { createWorldEventDirector } from './director'
import type { WorldEventEffect, WorldEventTransaction } from './types'

const INTERACTION_RADIUS_SQUARED = 64 * 64
const HISTORY_LIMIT = 256
const ENCOUNTER_SEARCH = 12
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export interface WorldEventOption {
  readonly id: string
  readonly title: string
  readonly risk: string
  readonly reward: string
  readonly costs: readonly string[]
  readonly available: boolean
  readonly reason: string | null
}

export interface LiveWorldEventsOptions {
  /** The engine supplies its seeded RNG; use the same source for replay. */
  readonly random?: () => number
  /** Other live faction actors count against the same 130-actor limit. */
  readonly otherActors?: () => number
}

interface TimedBuff {
  readonly id: string
  readonly hero: Hero
  readonly until: number
  readonly damage: number
  readonly speed: number
  readonly delay: number
  readonly protection: boolean
}

const MODIFIERS: Readonly<Record<string, { damage?: number; speed?: number; delay?: number; protection?: boolean }>> = {
  'events:cursed-might': { damage: 1.25 },
  'events:ward': { protection: true },
  'events:haste': { speed: 1.25 },
  'events:cleanse': { speed: 1.08, protection: true },
  'events:forged-might': { damage: 1.30 },
  'events:pact-power': { damage: 1.4, speed: 0.9 },
}

function costLabels(effects: readonly WorldEventEffect[]): string[] {
  return effects.flatMap(effect => effect.type === 'health-cost' ? [effect.amount + ' HP']
    : effect.type === 'xp-cost' ? [effect.amount + ' XP'] : [])
}

function availableRelic(
  state: GameState, effect: Extract<WorldEventEffect, { type: 'symbolic-loot' }>,
): RelicDefinition | null {
  const inventory = inventorySnapshot(state)
  const stacks = new Map(inventory.items.map(item => [item.id, item.stacks]))
  const candidates = RELICS.filter(relic => relic.rarity === effect.tier && !inventory.banished.includes(relic.id)
    && (stacks.get(relic.id) ?? 0) < relic.maxStacks
    && (stacks.has(relic.id) || inventory.items.length < inventory.capacity))
  if (!candidates.length) return null
  // A symbolic token deterministically resolves to an actual, eligible run relic.
  let hash = 0
  for (let i = 0; i < effect.id.length; i++) hash = (Math.imul(hash, 31) + effect.id.charCodeAt(i)) >>> 0
  return candidates[hash % candidates.length]!
}

function makeMob(kind: string, x: number, y: number): Mob {
  const elite = kind === 'events:elite-target'
  const heavy = elite || kind === 'events:vault-guards'
  const hp = elite ? 320 : heavy ? 190 : 85
  return {
    x, y, type: heavy ? 'golem' : 'goblin', hp, max: hp, r: heavy ? 28 : 19,
    speed: heavy ? 67 : 95, dmg: elite ? 19 : heavy ? 14 : 10,
    phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
    ...(elite ? { elite: true } : {}),
  }
}

/**
 * A complete per-run integration port. No shared game files are patched.
 *
 * Mount tick() once per simulation frame, choose() from a deliberate UI action,
 * and onContentEvent() from the existing post-kill ContentEvent hook. Call
 * reset() on run start; scene changes are observed by tick() or sceneChange().
 */
export function createLiveWorldEvents(
  state: GameState, hooks: GameHooks, options: LiveWorldEventsOptions = {},
) {
  let tagged = new WeakMap<Mob, string>()
  const spawned = new Set<Mob>()
  let scene = state.currentScene
  const buffs = new Map<string, TimedBuff>()
  const committed = new Set<string>()
  const recent: string[] = []
  let generation = 0
  let retiredSerial = 0

  function removeBuff(buff: TimedBuff): void {
    if (state.hero !== buff.hero) return
    buff.hero.damage /= buff.damage
    buff.hero.speed /= buff.speed
    buff.hero.delay /= buff.delay
    if (buff.protection) {
      let remainingProtection = 0
      for (const other of buffs.values()) {
        if (other !== buff && other.hero === buff.hero && other.protection) {
          remainingProtection = Math.max(remainingProtection, other.until - state.time)
        }
      }
      buff.hero.inv = Math.max(Math.min(buff.hero.inv, 1), remainingProtection)
    }
  }

  function clearBuffs(): void {
    const active = [...buffs.values()]
    buffs.clear()
    for (const buff of active) removeBuff(buff)
  }

  /** Remove only event-created actors; unrelated legacy/faction mobs remain untouched. */
  function cleanupSpawned(): void {
    if (spawned.size) {
      state.mobs = state.mobs.filter(mob => !spawned.has(mob))
      spawned.clear()
    }
    tagged = new WeakMap<Mob, string>()
  }

  function sceneChange(): void {
    cleanupSpawned()
    clearBuffs()
    scene = state.currentScene
    director.sceneChange(scene, state.time)
  }

  function prepareEncounter(id: string, count: number): Mob[] | null {
    const other = options.otherActors?.() ?? 0
    if (!Number.isSafeInteger(other) || other < 0 ||
      count + state.mobs.length + other > MAX_MOBS || !state.hero) return null
    const world = createLegacyEventWorld(state)
    const mobs: Mob[] = []
    for (let i = 0; i < count; i++) {
      let position: Point | null = null
      for (let attempt = 0; attempt < ENCOUNTER_SEARCH; attempt++) {
        const a = (i * 4 + attempt) * GOLDEN_ANGLE
        const radius = 170 + (attempt % 4) * 38
        const point = { x: world.hero.x + Math.cos(a) * radius,
          y: world.hero.y + Math.sin(a) * radius }
        if (!world.canPlace(point, 30) || !world.canApproach(world.hero, point) ||
          world.isOccupied(point, 36) || mobs.some(m => {
            const dx = m.x - point.x, dy = m.y - point.y
            return dx * dx + dy * dy < 75 * 75
          })) continue
        position = point
        break
      }
      if (!position) return null
      mobs.push(makeMob(id, position.x, position.y))
    }
    return mobs
  }

  function applyBuff(effect: Extract<WorldEventEffect, { type: 'buff' }>, txId: string): void {
    const hero = state.hero!
    const modifier = MODIFIERS[effect.id]!
    const buff: TimedBuff = {
      id: txId + ':' + effect.id, hero, until: state.time + effect.seconds,
      damage: modifier.damage ?? 1, speed: modifier.speed ?? 1, delay: modifier.delay ?? 1,
      protection: !!modifier.protection,
    }
    hero.damage *= buff.damage
    hero.speed *= buff.speed
    hero.delay *= buff.delay
    if (buff.protection) hero.inv = Math.max(hero.inv, effect.seconds)
    buffs.set(buff.id, buff)
  }

  function markCommitted(id: string): void {
    committed.add(id)
    recent.push(id)
    if (recent.length > HISTORY_LIMIT) {
      const forgotten = recent.shift()!
      committed.delete(forgotten)
      const oldSerial = Number(forgotten.split(':')[1])
      if (Number.isSafeInteger(oldSerial)) retiredSerial = Math.max(retiredSerial, oldSerial)
    }
  }

  function commit(tx: WorldEventTransaction): boolean {
    if (committed.has(tx.id)) return true
    // A bounded ledger rejects stale replays rather than paying a forgotten ID twice.
    const match = /^(\d+):(\d+)$/.exec(tx.eventId)
    if (!match) return false
    const epoch = Number(match[1]), serial = Number(match[2])
    if (!Number.isSafeInteger(epoch) || !Number.isSafeInteger(serial) || serial < 1 ||
      epoch < generation || (epoch === generation && serial <= retiredSerial) ||
      state.mode !== 'play' || !state.hero || state.hero.hp <= 0 ||
      !Number.isFinite(state.time) || !Number.isFinite(state.hero.hp) ||
      !Number.isFinite(state.hero.max) || !Number.isFinite(state.hero.xp) ||
      !validEffects(tx.effects)) return false
    if (epoch > generation) {
      generation = epoch
      retiredSerial = 0
      committed.clear()
      recent.length = 0
    }
    const hero = state.hero
    let hpCost = 0, xpCost = 0
    const loot: RelicDefinition[] = []
    const encounters: Array<{ mobs: Mob[]; eventId: string }> = []
    const grants: Extract<WorldEventEffect, { type: 'buff' }>[] = []
    for (const effect of tx.effects) {
      if (effect.type === 'health-cost') hpCost += effect.amount
      if (effect.type === 'xp-cost') xpCost += effect.amount
      if (effect.type === 'buff') {
        if (!Object.hasOwn(MODIFIERS, effect.id)) return false
        grants.push(effect)
      }
      if (effect.type === 'symbolic-loot') {
        // The current pack issues one unique loot token per transaction. Do not
        // partially grant a multi-token request without a transactional inventory API.
        if (loot.length) return false
        const relic = availableRelic(state, effect)
        if (!relic) return false
        loot.push(relic)
      }
      if (effect.type === 'encounter') {
        if (encounters.length) return false
        const mobs = prepareEncounter(effect.id, effect.count)
        if (!mobs) return false
        encounters.push({ mobs, eventId: tx.eventId })
      }
    }
    if (hero.hp <= hpCost || hero.xp < xpCost || !Number.isFinite(hpCost) ||
      !Number.isFinite(xpCost)) return false

    // The only operation which can reject after preflight is inventory acquisition;
    // perform it before touching HP/XP, buffs or actor arrays.
    for (const relic of loot) if (!acquireRelic(state, relic.id)) return false

    hero.hp -= hpCost
    hero.xp -= xpCost
    for (const encounter of encounters) {
      for (const mob of encounter.mobs) {
        state.mobs.push(mob)
        spawned.add(mob)
        tagged.set(mob, encounter.eventId)
      }
    }
    for (const buff of grants) applyBuff(buff, tx.id)
    for (const effect of tx.effects) {
      if (effect.type === 'heal') hero.hp = Math.min(hero.max, hero.hp + hallWorldHealing(state,tx.kind,tx.choiceId,effect.amount))
    }
    // Mark before emitting potentially reentrant level-up and pickup callbacks.
    markCommitted(tx.id)
    for (const effect of tx.effects) {
      if (effect.type === 'xp') addXp(state, effect.amount, hooks)
    }
    try {
      hooks.sfx(tx.audioCue)
      const event = WORLD_EVENT_DEFINITIONS.find(def => def.id === tx.kind)
      const action = event?.choices.find(choice => choice.id === tx.choiceId)
      hooks.message('✦ ' + (event?.title ?? 'World Event') + ' · ' + (action?.title ?? 'Reward Claimed'))
      hooks.content?.(state, { type: 'pickup', kind: 'world' })
    } catch {
      // Presentation hooks cannot invalidate a committed gameplay transaction.
    }
    return true
  }

  const director = createWorldEventDirector({ commit, random: options.random })

  function optionsFor(eventId: string): readonly WorldEventOption[] {
    const marker = director.active.find(e => e.id === eventId)
    const definition = marker && WORLD_EVENT_DEFINITIONS.find(def => def.id === marker.kind)
    if (!marker || !definition || !state.hero) return []
    const world = createLegacyEventWorld(state)
    const dx = marker.x - world.hero.x, dy = marker.y - world.hero.y
    const withinRange = Number.isFinite(world.hero.x) && Number.isFinite(world.hero.y) &&
      dx * dx + dy * dy <= INTERACTION_RADIUS_SQUARED
    const allowed = new Set(director.choices(eventId, world).map(choice => choice.id))
    const busy = director.objectives.length > 0
    return definition.choices.map(choice => {
      let reason: string | null = null
      if (!world.playing) reason = 'Game is paused'
      else if (!Number.isFinite(world.hero.hp) || !Number.isFinite(world.hero.xp) ||
        !Number.isFinite(world.hero.x) || !Number.isFinite(world.hero.y))
        reason = 'Invalid player state'
      else if (marker.expiresAt <= world.time) reason = 'Event expired'
      else if (!withinRange) reason = 'Move into interaction range'
      else if (choice.minHp && world.hero.hp < choice.minHp) reason = 'Insufficient HP'
      else if (choice.minXp && world.hero.xp < choice.minXp) reason = 'Insufficient XP'
      else if (choice.objective && busy) reason = 'Finish the current objective'
      else if (choice.effects.some(effect => effect.type === 'symbolic-loot' &&
        !availableRelic(state, effect))) reason = 'Relic inventory full or unavailable'
      else if (choice.effects.some(effect => effect.type === 'encounter' &&
        state.mobs.length + (options.otherActors?.() ?? 0) + effect.count > MAX_MOBS))
        reason = 'Enemy capacity reached'
      else if (!allowed.has(choice.id)) reason = 'Unavailable'
      return { id: choice.id, title: choice.title, risk: choice.risk, reward: choice.reward,
        costs: costLabels(choice.effects), available: reason === null, reason }
    })
  }

  function choose(eventId: string, choiceId: string): ReturnType<typeof director.choose> {
    if (!state.hero) return 'unavailable'
    return director.choose(eventId, choiceId, createLegacyEventWorld(state))
  }

  function onContentEvent(event: ContentEvent): void {
    if (event.type === 'reset' || event.type === 'start') { reset(); return }
    if (event.type === 'scene-change') { sceneChange(); return }
    if (event.type !== 'kill' || !state.hero || state.mode !== 'play' ||
      state.currentScene !== scene || event.mob.hp !== 0 ||
      !state.mobs.includes(event.mob)) return
    const eventId = tagged.get(event.mob)
    if (!eventId) return
    tagged.delete(event.mob)
    spawned.delete(event.mob)
    director.reportKill(!!event.mob.elite, eventId, state.time, event.mob)
  }

  function tick(): void {
    if (state.currentScene !== scene) sceneChange()
    if (!state.hero || state.mode !== 'play') return
    for (const [key, buff] of buffs) {
      if (buff.hero !== state.hero || state.time >= buff.until) {
        removeBuff(buff)
        buffs.delete(key)
      }
    }
    director.tick(createLegacyEventWorld(state))
  }

  function reset(): void {
    cleanupSpawned()
    clearBuffs()
    scene = state.currentScene
    director.reset()
  }

  return { director, tick, reset, sceneChange, options: optionsFor, choose, onContentEvent }
}

export type LiveWorldEvents = ReturnType<typeof createLiveWorldEvents>
