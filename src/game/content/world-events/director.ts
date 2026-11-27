import { BALANCE } from '../../config'
import { random as gameRandom } from '../../math'
import { WORLD_EVENT_DEFINITIONS, validEffects } from './definitions'
import type {
  ActiveWorldEvent, ActiveWorldObjective, EventWorld, WorldEventChoice, WorldEventDefinition,
  WorldEventDirectorOptions, WorldEventId, WorldEventObjectiveDef, WorldEventTransaction,
} from './types'

const DEFINITIONS = new Map(WORLD_EVENT_DEFINITIONS.map(def => [def.id, def]))
const SETTINGS = BALANCE.events.interactive
const REACH = 64
const SPAWN_ATTEMPTS = BALANCE.events.placementRetries
const TAU = Math.PI * 2

interface PendingObjective extends Omit<ActiveWorldObjective, 'count'> {
  count: number
  readonly countedMobs: WeakSet<object>
  readonly definition: WorldEventDefinition
  readonly choice: WorldEventChoice
  readonly objective: WorldEventObjectiveDef
}

/**
 * Per-run, scene-agnostic director. A pure choice contract is shared by mouse,
 * keyboard and touch; integration decides how to display the available options.
 * No GameState mutation and no unbounded per-frame scans live here.
 */
export function createWorldEventDirector({ commit, random = gameRandom }: WorldEventDirectorOptions) {
  let generation = 0
  let serial = 0
  let nextAt = BALANCE.events.firstSpawnAt
  let lastBiome: EventWorld['biome'] | undefined
  let lastKind: WorldEventId | undefined
  const seenKinds = new Set<WorldEventId>()
  let active: ActiveWorldEvent[] = []
  let pending: PendingObjective[] = []
  const resolving = new Set<string>()

  const roll = (): number => {
    const n = random()
    return Number.isFinite(n) ? Math.min(0.999999999, Math.max(0, n)) : 0
  }

  function reset(): void {
    generation++
    serial = 0
    nextAt = BALANCE.events.firstSpawnAt
    lastBiome = undefined
    lastKind = undefined
    seenKinds.clear()
    active = []
    pending = []
    resolving.clear()
  }

  /** Invalidate scene-owned markers/objectives even when no play ticks occur. */
  function sceneChange(biome: EventWorld['biome'], time: number): void {
    lastBiome = biome
    active = []
    pending = []
    resolving.clear()
    nextAt = Number.isFinite(time) ? time + BALANCE.events.sceneSpawnDelay : BALANCE.events.firstSpawnAt
  }

  function spawn(kind: WorldEventId, world: EventWorld, position?: { x: number; y: number }): ActiveWorldEvent | null {
    const hero = world.hero
    if (lastBiome === undefined) lastBiome = world.biome
    if (!world.playing || !hero || hero.hp <= 0 || active.length >= SETTINGS.maxActive || !DEFINITIONS.has(kind) ||
      !Number.isFinite(world.time) || !Number.isFinite(hero.x) || !Number.isFinite(hero.y) ||
      !Number.isFinite(hero.hp) || !Number.isFinite(hero.xp)) return null
    let target = position
    if (!target) {
      const angle = roll() * TAU, radius = SETTINGS.minRadius + roll() * (SETTINGS.maxRadius - SETTINGS.minRadius)
      target = { x: hero.x + Math.cos(angle) * radius, y: hero.y + Math.sin(angle) * radius }
    }
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y) ||
        !world.canPlace(target, SETTINGS.terrainClearance) || !world.canApproach(hero, target) || world.isOccupied(target, SETTINGS.mobClearance)) return null
    for (const e of active) {
      const dx = e.x - target.x, dy = e.y - target.y
      if (dx * dx + dy * dy < SETTINGS.minSeparation ** 2) return null
    }
    const event: ActiveWorldEvent = { id: `${generation}:${++serial}`, kind,
      x: target.x, y: target.y, expiresAt: world.time + SETTINGS.lifetime }
    active.push(event)
    return event
  }

  function choices(eventId: string, world: EventWorld): readonly WorldEventChoice[] {
    const event = active.find(e => e.id === eventId && e.expiresAt > world.time)
    const definition = event && DEFINITIONS.get(event.kind)
    if (!definition) return []
    return definition.choices.filter(choice => canChoose(choice, world))
  }

  function canChoose(choice: WorldEventChoice, world: EventWorld): boolean {
    if (!Number.isFinite(world.hero.hp) || !Number.isFinite(world.hero.xp) ||
      (choice.minHp ?? 0) > world.hero.hp || (choice.minXp ?? 0) > world.hero.xp) return false
    if (choice.objective && pending.length >= 1) return false
    return true
  }

  function transaction(event: ActiveWorldEvent, definition: WorldEventDefinition,
    choiceId: string, effects: WorldEventTransaction['effects'], suffix = ''): WorldEventTransaction {
    return {
      id: `${event.id}:${choiceId}${suffix}`, eventId: event.id, kind: event.kind,
      choiceId, visualCueId: definition.visualCueId, audioCue: definition.audioCue, effects,
    }
  }

  function apply(tx: WorldEventTransaction): boolean {
    if (!validEffects(tx.effects) || resolving.has(tx.eventId)) return false
    resolving.add(tx.eventId)
    try {
      // The adapter guarantees atomicity and idempotency; a rejected commit changes nothing.
      return commit(tx) === true
    } catch {
      return false
    } finally {
      resolving.delete(tx.eventId)
    }
  }

  function choose(eventId: string, choiceId: string, world: EventWorld):
    'applied' | 'unavailable' | 'out-of-range' | 'retry' {
    if (!world.playing || !world.hero || world.hero.hp <= 0 ||
      !Number.isFinite(world.time) || !Number.isFinite(world.hero.x) ||
      !Number.isFinite(world.hero.y) || !Number.isFinite(world.hero.hp) ||
      !Number.isFinite(world.hero.xp)) return 'unavailable'
    const event = active.find(e => e.id === eventId && e.expiresAt > world.time)
    const definition = event && DEFINITIONS.get(event.kind)
    const choice = definition?.choices.find(c => c.id === choiceId)
    if (!event || !definition || !choice || !canChoose(choice, world)) return 'unavailable'
    const dx = event.x - world.hero.x, dy = event.y - world.hero.y
    if (dx * dx + dy * dy > REACH * REACH) return 'out-of-range'
    if (!apply(transaction(event, definition, choice.id, choice.effects))) return 'retry'
    active = active.filter(e => e !== event)
    if (choice.objective) {
      pending.push({
        eventId: event.id, choiceId: choice.id, kind: choice.objective.kind,
        deadline: world.time + choice.objective.seconds, x: event.x, y: event.y,
        count: 0, countedMobs: new WeakSet<object>(), target: choice.objective.count ?? 0,
        eliteOnly: choice.objective.eliteOnly ?? false,
        definition, choice, objective: choice.objective,
      })
    }
    return 'applied'
  }

  /** Only count unique, tagged encounter deaths inside the event time window. */
  function reportKill(elite: boolean, sourceEventId: string, atTime: number, mob: object): void {
    if (!Number.isFinite(atTime)) return
    for (const obj of pending) {
      if (obj.eventId !== sourceEventId || obj.kind !== 'kill' || (obj.eliteOnly && !elite) ||
        atTime < obj.deadline - obj.objective.seconds || atTime > obj.deadline ||
        obj.countedMobs.has(mob)) continue
      obj.countedMobs.add(mob)
      obj.count = Math.min(obj.target, obj.count + 1)
    }
  }

  function tick(world: EventWorld): void {
    if (!world.playing || !world.hero || world.hero.hp <= 0 ||
      !Number.isFinite(world.time) || !Number.isFinite(world.hero.x) ||
      !Number.isFinite(world.hero.y) || !Number.isFinite(world.hero.hp) ||
      !Number.isFinite(world.hero.xp)) return
    if (lastBiome === undefined) lastBiome = world.biome
    else if (lastBiome !== world.biome) {
      sceneChange(world.biome, world.time)
      return
    }
    const before = active.length
    active = active.filter(e => e.expiresAt > world.time)
    if (before !== active.length) nextAt = Math.max(nextAt, world.time + SETTINGS.expiryRetryDelay)

    let processedObjective = false
    for (const obj of pending.slice()) {
      if (obj.kind === 'stay') {
        const dx = world.hero.x - obj.x, dy = world.hero.y - obj.y
        if (dx * dx + dy * dy > (obj.objective.radius ?? 150) ** 2) {
          pending = pending.filter(p => p !== obj)
          processedObjective = true
          continue
        }
      }
      if (obj.kind === 'kill' && obj.count < obj.target && world.time >= obj.deadline) {
        pending = pending.filter(p => p !== obj)
        processedObjective = true
        continue
      }
      if (world.time < obj.deadline && !(obj.kind === 'kill' && obj.count >= obj.target)) continue
      if (world.time > obj.deadline + 10) {
        pending = pending.filter(p => p !== obj)
        continue
      }
      const event: ActiveWorldEvent = { id: obj.eventId, kind: obj.definition.id, x: obj.x,
        y: obj.y, expiresAt: obj.deadline }
      if (apply(transaction(event, obj.definition, obj.choiceId, obj.objective.rewards, ':complete'))) {
        pending = pending.filter(p => p !== obj)
        processedObjective = true
      }
    }

    if (processedObjective || world.time < nextAt || active.length >= SETTINGS.maxActive) return
    nextAt = world.time + SETTINGS.spawnIntervalBase + roll() * SETTINGS.spawnIntervalVariation
    const available = WORLD_EVENT_DEFINITIONS.filter(def =>
      def.id !== lastKind && !active.some(event => event.kind === def.id))
    // Prefer unseen kinds across the run; keep the roll seeded and never duplicate a live marker kind.
    const unseen = available.filter(def => !seenKinds.has(def.id))
    const candidates = unseen.length ? unseen : available
    if (!candidates.length) return
    const definition = candidates[Math.floor(roll() * candidates.length)]!
    for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
      const candidate = spawn(definition.id, world)
      if (candidate) {
        if (seenKinds.size === DEFINITIONS.size) seenKinds.clear()
        seenKinds.add(definition.id)
        lastKind = definition.id
        break
      }
    }
  }

  return {
    get active(): readonly ActiveWorldEvent[] { return active.slice() },
    get objectives(): readonly ActiveWorldObjective[] {
      return pending.map(({ eventId, choiceId, kind, deadline, x, y, count, target, eliteOnly }) =>
        ({ eventId, choiceId, kind, deadline, x, y, count, target, eliteOnly }))
    },
    spawn, tick, choices, choose, reportKill, reset, sceneChange,
  }
}
