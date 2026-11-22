import { damageHero, hit } from '../../combat'
import { clearApproach, resolveObstacleCollision } from '../../world'
import type { GameHooks, GameState, Mob, Shot } from '../../types'
import { ELITE_AFFIXES, ENEMY_DEFINITIONS, type FactionAffix, type FactionKind } from './definitions'
import {
  cleanupFactionEnemies, createFactionRuntime, damageFactionEnemy,
  spawnFactionEnemy, tickFactionEnemies,
  type FactionEnemy, type FactionHit, type FactionReward,
} from './runtime'

const KINDS = Object.keys(ENEMY_DEFINITIONS) as FactionKind[]
const STATUS_KINDS = ['poison', 'freeze', 'burn'] as const
type StatusKind = typeof STATUS_KINDS[number]
type StatusEntry = { remaining: number; tick: number }

export interface FactionBridgeOptions {
  /** Supply the game's seeded simulation RNG. No random global is used. */
  random: () => number
  onReward?(reward: FactionReward): void
  onHit?(enemy: FactionEnemy, applied: number): void
  onTelegraph?(enemy: FactionEnemy): void
  /** Override the native obstacle raycast only for another authoritative world geometry. */
  lineOfSight?(scene: number, fromX: number, fromY: number, toX: number, toY: number): boolean
}

export type FactionShotContact =
  | { kind: 'legacy'; target: Mob; fraction: number }
  | { kind: 'faction'; target: FactionEnemy; fraction: number }

function firstContact(startX: number, startY: number, deltaX: number, deltaY: number,
  cx: number, cy: number, radius: number): number {
  const ox = startX - cx, oy = startY - cy
  const c = ox * ox + oy * oy - radius * radius
  if (c <= 0) return 0
  const a = deltaX * deltaX + deltaY * deltaY
  if (a <= 0) return Infinity
  const b = ox * deltaX + oy * deltaY
  const discriminant = b * b - a * c
  if (discriminant < 0) return Infinity
  const t = (-b - Math.sqrt(discriminant)) / a
  return t >= 0 && t <= 1 ? t : Infinity
}

/** Instantiate once per game run; do not persist or share the bridge between runs. */
export function createFactionBridge(options: FactionBridgeOptions) {
  let runtime = createFactionRuntime()
  let defeated: Partial<Record<FactionKind, number>> = {}
  const statuses: Partial<Record<StatusKind, StatusEntry>> = {}

  function reset(): void {
    runtime = createFactionRuntime()
    defeated = {}
    for (const kind of STATUS_KINDS) delete statuses[kind]
  }

  function legacyCount(state: GameState): number {
    let count = 0
    for (const mob of state.mobs) if (mob.hp > 0) count++
    return count
  }

  function syncBudget(state: GameState): void {
    cleanupFactionEnemies(runtime)
    runtime.legacyMobCount = legacyCount(state)
  }

  function spawn(state: GameState, kind: FactionKind, x: number, y: number,
    config: { affix?: FactionAffix } = {}): FactionEnemy | null {
    if (state.mode !== 'play' || !state.hero) return null
    syncBudget(state)
    return spawnFactionEnemy(runtime, kind, x, y, config)
  }

  /** Also used by the legacy spawn scheduler before adding a legacy actor. */
  function availableSpawnSlots(state: GameState): number {
    let live = 0
    for (const enemy of runtime.enemies) if (enemy.hp > 0) live++
    return Math.max(0, 130 - live - legacyCount(state))
  }

  function chooseKind(): FactionKind | null {
    const n = options.random()
    return Number.isFinite(n) && n >= 0 && n < 1 ? KINDS[Math.floor(n * KINDS.length)]! : null
  }

  function chooseAffix(): FactionAffix | null {
    const n = options.random()
    return Number.isFinite(n) && n >= 0 && n < 1 ? ELITE_AFFIXES[Math.floor(n * ELITE_AFFIXES.length)]! : null
  }

  function spawnRandom(state: GameState, x: number, y: number, elite = false): FactionEnemy | null {
    const kind = chooseKind()
    if (!kind) return null
    const affix = elite ? chooseAffix() : null
    if (elite && !affix) return null
    return spawn(state, kind, x, y, affix ? { affix } : {})
  }

  function hitFaction(state: GameState, enemy: FactionEnemy, amount: number,
    sourceX: number, sourceY: number, hooks: GameHooks): number {
    if (state.mode !== 'play' || !state.hero || !runtime.enemies.includes(enemy)) return 0
    const applied = damageFactionEnemy(runtime, enemy, amount, sourceX, sourceY, reward => {
      state.kill++
      defeated[reward.kind] = (defeated[reward.kind] ?? 0) + 1
      // The legacy XP collection path owns level progression; never award XP twice.
      state.stars.push({ x: reward.x, y: reward.y, value: reward.xp, t: 0 })
      if (state.stars.length > 220) state.stars.splice(0, state.stars.length - 220)
      hooks.sfx('kill')
      options.onReward?.(reward)
    })
    if (applied > 0) {
      state.damageDealt += applied
      options.onHit?.(enemy, applied)
    }
    return applied
  }

  /** First swept projectile contact across BOTH legacy and faction actor pools. */
  function shotContact(state: GameState, shot: Shot): FactionShotContact | null {
    if (!state.hero || !Number.isFinite(shot.x) || !Number.isFinite(shot.y)) return null
    const sx = shot.prevX ?? shot.x, sy = shot.prevY ?? shot.y
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null
    const dx = shot.x - sx, dy = shot.y - sy
    let nearest: FactionShotContact | null = null
    for (const mob of state.mobs) {
      if (mob.hp <= 0) continue
      const t = firstContact(sx, sy, dx, dy, mob.x, mob.y, mob.r + shot.r)
      if (t < (nearest?.fraction ?? Infinity)) nearest = { kind: 'legacy', target: mob, fraction: t }
    }
    for (const enemy of runtime.enemies) {
      if (enemy.hp <= 0 || enemy.state === 'phase') continue
      const t = firstContact(sx, sy, dx, dy, enemy.x, enemy.y, enemy.radius + shot.r)
      if (t < (nearest?.fraction ?? Infinity)) nearest = { kind: 'faction', target: enemy, fraction: t }
    }
    return nearest
  }

  /** Use instead of (never in addition to) the legacy shot collision resolver. */
  function resolveShot(state: GameState, shot: Shot, hooks: GameHooks,
    source: { x: number; y: number }): FactionShotContact | null {
    if (state.mode !== 'play' || shot.life <= 0) return null
    const contact = shotContact(state, shot)
    if (!contact) return null
    if (contact.kind === 'legacy') hit(state, contact.target, shot.d, hooks)
    else hitFaction(state, contact.target, shot.d, source.x, source.y, hooks)
    shot.life = 0
    return contact
  }

  function nearestFaction(x: number, y: number, radius: number): FactionEnemy | null {
    if (!Number.isFinite(radius) || radius < 0) return null
    let found: FactionEnemy | null = null
    let best = radius * radius
    for (const enemy of runtime.enemies) {
      if (enemy.hp <= 0 || enemy.state === 'phase') continue
      const dx = enemy.x - x, dy = enemy.y - y
      const squared = dx * dx + dy * dy
      if (squared < best || (squared === best && !found)) { best = squared; found = enemy }
    }
    return found
  }

  function nearestTarget(state: GameState, x: number, y: number, radius: number):
    | { kind: 'legacy'; target: Mob } | { kind: 'faction'; target: FactionEnemy } | null {
    if (!Number.isFinite(radius) || radius < 0) return null
    let best = radius * radius
    let result: { kind: 'legacy'; target: Mob } | { kind: 'faction'; target: FactionEnemy } | null = null
    for (const mob of state.mobs) {
      if (mob.hp <= 0) continue
      const dx = mob.x - x, dy = mob.y - y
      const d2 = dx * dx + dy * dy
      if (d2 <= best) { best = d2; result = { kind: 'legacy', target: mob } }
    }
    for (const enemy of runtime.enemies) {
      if (enemy.hp <= 0 || enemy.state === 'phase') continue
      const dx = enemy.x - x, dy = enemy.y - y
      const d2 = dx * dx + dy * dy
      if (d2 < best) { best = d2; result = { kind: 'faction', target: enemy } }
    }
    return result
  }

  function factionsInRadius(x: number, y: number, radius: number): FactionEnemy[] {
    if (!Number.isFinite(radius) || radius < 0) return []
    const result: FactionEnemy[] = []
    const r2 = radius * radius
    for (const enemy of runtime.enemies) {
      if (enemy.hp <= 0 || enemy.state === 'phase') continue
      const dx = enemy.x - x, dy = enemy.y - y
      if (dx * dx + dy * dy <= r2 + 2 * radius * enemy.radius + enemy.radius * enemy.radius)
        result.push(enemy)
    }
    return result
  }

  function receiveDamage(state: GameState, amount: number, info: FactionHit, hooks: GameHooks): boolean {
    const hero = state.hero
    if (!hero || state.mode !== 'play') return false
    const before = hero.hp
    damageHero(state, amount, hooks)
    if (hero.hp >= before) return false
    if (info.status && info.duration && info.duration > 0) {
      const existing = statuses[info.status]
      statuses[info.status] = { remaining: Math.max(existing?.remaining ?? 0, info.duration), tick: existing?.tick ?? 0.65 }
    }
    return true
  }

  function tickStatuses(state: GameState, dt: number, hooks: GameHooks): void {
    for (const kind of STATUS_KINDS) {
      const effect = statuses[kind]
      if (!effect) continue
      effect.remaining -= dt
      effect.tick -= dt
      if (kind !== 'freeze' && effect.tick <= 0 && effect.remaining > 0) {
        // Damage immunity remains authoritative; DoT never bypasses damageHero.
        damageHero(state, kind === 'burn' ? 3 : 2, hooks)
        effect.tick += 0.65
      }
      if (effect.remaining <= 0) delete statuses[kind]
    }
  }

  /** Call only within a fixed simulation tick; pauses freeze all timers. */
  function tick(state: GameState, dt: number, hooks: GameHooks): void {
    if (state.mode !== 'play' || !state.hero || !Number.isFinite(dt) || dt <= 0) return
    syncBudget(state)
    tickStatuses(state, dt, hooks)
    tickFactionEnemies({
      runtime,
      hero: state.hero,
      width: state.W, height: state.H,
      legacyMobCount: runtime.legacyMobCount,
      lineOfSight: (x, y, toX, toY) => options.lineOfSight
        ? options.lineOfSight(state.currentScene, x, y, toX, toY)
        : clearApproach(state.currentScene, { x, y }, { x: toX, y: toY }, 0),
      onHeroDamage: (damage, info) => receiveDamage(state, damage, info, hooks),
      onTelegraph: options.onTelegraph,
    }, dt)
    // Terrain collision is separate from AI: draw culling cannot disable it.
    for (const enemy of runtime.enemies) {
      if (enemy.hp <= 0) continue
      const safe = resolveObstacleCollision(state.currentScene, enemy.x, enemy.y, enemy.radius * 0.65)
      enemy.x = safe.x; enemy.y = safe.y
    }
    cleanupFactionEnemies(runtime)
  }

  return {
    get runtime() { return runtime },
    get defeated() { return defeated as Readonly<Partial<Record<FactionKind, number>>> },
    get statuses() { return statuses as Readonly<Partial<Record<StatusKind, StatusEntry>>> },
    get movementMultiplier() { return statuses.freeze ? 0.6 : 1 },
    reset, spawn, spawnRandom, availableSpawnSlots, chooseKind, chooseAffix, tick,
    hitFaction, shotContact, resolveShot, nearestFaction, nearestTarget, factionsInRadius,
  }
}

export type FactionBridge = ReturnType<typeof createFactionBridge>
