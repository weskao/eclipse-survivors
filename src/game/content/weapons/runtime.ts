import type { ContentContext } from '../contracts'
import type { ContentRuntime, ContentVisualFx, GameState, Mob } from '../../types'
import { hit } from '../../combat'

export type WeaponKey =
  | 'shadow-daggers' | 'holy-lance' | 'blood-scythe' | 'arcane-mines'
  | 'bone-spears' | 'poison-cloud' | 'ricochet-blades' | 'spirit-wolves'
  | 'solar-beam' | 'gravity-orbs' | 'spectral-bow' | 'thorn-chain'
export type MissileKind = 'dagger' | 'lance' | 'bone' | 'blade' | 'arrow'
export type ZoneKind = 'mine' | 'poison'
export interface Missile {
  kind: MissileKind
  x: number; y: number; vx: number; vy: number
  life: number; damage: number; radius: number; pierce: number
  jumps: number; target?: Mob
  visited: Set<Mob>
}
export interface Zone {
  kind: ZoneKind
  x: number; y: number; radius: number; damage: number
  life: number; fuse: number; pulse: number
}
export interface Wolf { x: number; y: number; attackIn: number }
export interface Beam {
  x: number; y: number; ux: number; uy: number; width: number
  range: number; life: number
}
export interface Link { from: Mob; to: Mob; life: number }
export interface ArsenalRuntime {
  projectiles: Missile[]
  zones: Zone[]
  wolves: Wolf[]
  beam: Beam | null
  links: Link[]
  timers: Partial<Record<WeaponKey, number>>
  visual?: ContentVisualFx
  charge: number
  volley: number
  volleyInterval: number
  volleyX: number
  volleyY: number
  volleyAngle: number
  orbitHits: WeakMap<Mob, number>
  chainPulse: number
  slashLife: number
  slashAngle: number
  beamAngle: number
}

/** Weak per-run ownership: resetRun replaces GameState.content, releasing all old objects. */
const runs = new WeakMap<ContentRuntime, ArsenalRuntime>()

export const MAX_ARSENAL_PROJECTILES = 64
export const MAX_ARSENAL_ZONES = 12

export function runtimeOf(state: GameState): ArsenalRuntime {
  let r = runs.get(state.content)
  if (!r) {
    r = {
      projectiles: [], zones: [], wolves: [], beam: null, links: [], timers: {},
      charge: 0, volley: 0, volleyInterval: 0, volleyX: 0, volleyY: 0,
      volleyAngle: 0, orbitHits: new WeakMap(), chainPulse: 0,
      slashLife: 0, slashAngle: 0, beamAngle: 0,
    }
    runs.set(state.content, r)
  }
  return r
}

export function resetRuntime(state: GameState): void {
  runs.delete(state.content)
}

export function keepVisual(context: ContentContext, r: ArsenalRuntime): void {
  if (!r.visual || r.visual.life <= 0) {
    if (context.addEffect({ id: 'weapons:arsenal-vfx', x: 0, y: 0, life: 4, max: 4 }))
      r.visual = context.state.content.effects[context.state.content.effects.length - 1]
  }
  if (r.visual) r.visual.life = 4
}

/** Small K insertion selection, O(mobs × limit) at fire time; no full enemy sort. */
export function nearest(state: GameState, x: number, y: number, range: number, limit = 1, exclude?: Set<Mob>): Mob[] {
  const found: Mob[] = []
  const scores: number[] = []
  for (const e of state.mobs) {
    if (e.hp <= 0 || exclude?.has(e)) continue
    const dx = e.x - x, dy = e.y - y
    const d2 = dx * dx + dy * dy
    const reach = range + e.r
    if (d2 > reach * reach) continue
    let at = 0
    while (at < scores.length && scores[at]! <= d2) at++
    if (at >= limit) continue
    found.splice(at, 0, e)
    scores.splice(at, 0, d2)
    if (found.length > limit) { found.pop(); scores.pop() }
  }
  return found
}

export function area(context: ContentContext, x: number, y: number, radius: number, damage: number): number {
  let actual = 0
  for (const e of context.state.mobs) {
    if (e.hp <= 0) continue
    const dx = e.x - x, dy = e.y - y, reach = radius + e.r
    if (dx * dx + dy * dy > reach * reach) continue
    actual += Math.min(e.hp, damage)
    hit(context.state, e, damage, context.hooks)
  }
  return actual
}

export function addMissile(r: ArsenalRuntime, missile: Missile): boolean {
  if (r.projectiles.length >= MAX_ARSENAL_PROJECTILES) return false
  r.projectiles.push(missile)
  return true
}

export function addZone(r: ArsenalRuntime, zone: Zone): boolean {
  if (r.zones.length >= MAX_ARSENAL_ZONES) return false
  r.zones.push(zone)
  return true
}

/** First swept-circle contact; handles a shot crossing a narrow enemy in a long tick. */
function contact(s: GameState, p: Missile, x0: number, y0: number, x1: number, y1: number):
  { mob: Mob; t: number } | null {
  const dx = x1 - x0, dy = y1 - y0, length2 = dx * dx + dy * dy
  let found: Mob | null = null
  let first = Infinity
  for (const e of s.mobs) {
    if (e.hp <= 0 || p.visited.has(e)) continue
    const reach = e.r + p.radius
    if (e.x < Math.min(x0, x1) - reach || e.x > Math.max(x0, x1) + reach ||
        e.y < Math.min(y0, y1) - reach || e.y > Math.max(y0, y1) + reach) continue
    const ox = x0 - e.x, oy = y0 - e.y
    const c = ox * ox + oy * oy - reach * reach
    let t = 0
    if (c > 0) {
      if (length2 === 0) continue
      const b = ox * dx + oy * dy
      const disc = b * b - length2 * c
      if (disc < 0) continue
      t = (-b - Math.sqrt(disc)) / length2
      if (t < 0 || t > 1) continue
    }
    if (t < first) { found = e; first = t }
  }
  return found ? { mob: found, t: first } : null
}

function advanceOne(context: ContentContext, p: Missile, dt: number): void {
  const { state } = context
  if (p.kind === 'dagger' || p.kind === 'blade') {
    if (!p.target || p.target.hp <= 0 || p.visited.has(p.target)) {
      p.target = nearest(state, p.x, p.y, 520, 1, p.visited)[0]
    }
    if (!p.target) { p.life = 0; return }
    const dx = p.target.x - p.x, dy = p.target.y - p.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const speed = p.kind === 'dagger' ? 470 : 560
    p.vx = dx / d * speed
    p.vy = dy / d * speed
  }

  const travel = Math.min(dt, Math.max(0, p.life))
  const endX = p.x + p.vx * travel, endY = p.y + p.vy * travel
  p.life -= dt
  let x0 = p.x, y0 = p.y
  // Piercing can register multiple distinct contacts in one simulation tick.
  for (let i = 0; i < 8 && p.pierce > 0; i++) {
    const hitAt = contact(state, p, x0, y0, endX, endY)
    if (!hitAt) { p.x = endX; p.y = endY; break }
    p.x = x0 + (endX - x0) * hitAt.t
    p.y = y0 + (endY - y0) * hitAt.t
    p.visited.add(hitAt.mob)
    hit(state, hitAt.mob, p.damage, context.hooks)
    p.pierce--
    if (p.kind === 'blade' && p.jumps > 0) {
      p.jumps--
      p.pierce = 1
      p.target = nearest(state, p.x, p.y, 390, 1, p.visited)[0]
      if (!p.target) p.life = 0
      break // Redirect on next tick, never double-travel in one tick.
    }
    if (p.kind === 'dagger' && p.jumps > 0) {
      p.jumps--
      p.pierce = 1
      p.target = nearest(state, p.x, p.y, 520, 1, p.visited)[0]
      if (!p.target) p.life = 0
      break
    }
    if (p.pierce <= 0) { p.life = 0; break }
    x0 = p.x; y0 = p.y
  }
}

/** Each weapon advances only its own shots. No unbounded map, full sort or tick allocations. */
export function moveMissiles(context: ContentContext, kind: MissileKind, dt: number): void {
  const shots = runtimeOf(context.state).projectiles
  for (let i = 0; i < shots.length;) {
    const p = shots[i]!
    if (p.kind !== kind) { i++; continue }
    advanceOne(context, p, dt)
    if (p.life <= 0) shots.splice(i, 1)
    else i++
  }
}

export function tickZones(context: ContentContext, kind: ZoneKind, dt: number): void {
  const zones = runtimeOf(context.state).zones
  for (let i = 0; i < zones.length;) {
    const z = zones[i]!
    if (z.kind !== kind) { i++; continue }
    z.life -= dt
    z.fuse -= dt
    if (kind === 'mine' && z.fuse <= 0) {
      area(context, z.x, z.y, z.radius, z.damage)
      z.life = 0
    } else if (kind === 'poison' && z.life > 0) {
      z.pulse -= dt
      if (z.pulse <= 0) {
        area(context, z.x, z.y, z.radius, z.damage)
        z.pulse += 0.45
      }
    }
    if (z.life <= 0) zones.splice(i, 1)
    else i++
  }
}
