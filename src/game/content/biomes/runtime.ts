import {
  createBiomeSession, CELL_SIZE,
  type BiomeEnvironment, type BiomeId, type HazardContact, type Point,
} from './index'

export interface BiomeStep {
  readonly position: Point
  /** Damage to send through the existing hero invulnerability / damage handler, never directly subtract HP. */
  readonly hazardDamage: number
  readonly contact: HazardContact
}

/**
 * Opt-in scene adapter. Integrators supply a biome ID, use the returned world
 * collision/LOS/minimap providers, and pass hazardDamage to the normal combat
 * damage handler. The four legacy numeric scene IDs are never touched.
 *
 * Only immutable procedural cells are cached by the environment. Phase and
 * damage are evaluated from the simulation clock on every step.
 */
export function createBiomeRuntime(initial: BiomeId, options: { seed?: number; maxCells?: number } = {}) {
  const session = createBiomeSession(initial, options)
  let time = 0
  const validPoint = (p: Point): void => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1e9 || Math.abs(p.y) > 1e9) {
      throw new RangeError('Invalid biome position')
    }
  }
  const validRadius = (r: number): void => {
    if (!Number.isFinite(r) || r < 0 || r > 64) throw new RangeError('Invalid actor radius')
  }

  function move(position: Point, velocity: Point, dt: number, radius: number): Point {
    validPoint(position); validPoint(velocity); validRadius(radius)
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid movement duration')
    const dx = velocity.x * dt, dy = velocity.y * dt
    const distance = Math.hypot(dx, dy)
    // Swept substeps prevent high-speed dashes tunnelling through circular terrain.
    // The maximum covers 1,536 world units in a single update; no unbounded loop.
    const steps = Math.max(1, Math.ceil(distance / 24))
    if (!Number.isFinite(distance) || steps > 64) throw new RangeError('Biome movement exceeds per-step bounds')
    let point = session.current.collide(position, radius)
    for (let i = 0; i < steps; i++) {
      point = session.current.collide({ x: point.x + dx / steps, y: point.y + dy / steps }, radius)
    }
    return point
  }

  function lineOfSight(from: Point, to: Point, radius = 0): boolean {
    validPoint(from); validPoint(to); validRadius(radius)
    const dx = to.x - from.x, dy = to.y - from.y
    const distance = Math.hypot(dx, dy)
    if (!Number.isFinite(distance) || distance > 3000) throw new RangeError('Biome LOS exceeds query bounds')
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    const obstacles = session.current.obstacles(mid.x, mid.y, distance / 2 + radius + 80)
    const length2 = dx * dx + dy * dy
    for (const block of obstacles) {
      const t = length2 ? Math.max(0, Math.min(1, ((block.x - from.x) * dx + (block.y - from.y) * dy) / length2)) : 0
      const ax = from.x + t * dx - block.x
      const ay = from.y + t * dy - block.y
      const reach = block.r + radius
      if (ax * ax + ay * ay < reach * reach) return false
    }
    return true
  }

  /**
   * Connected grid-boundary corridors avoid all center-cell terrain circles.
   * Recompute only on navigation-target changes, never for every mob every tick.
   * The route contains WAYPOINTS after the current position, ending at the target.
   */
  function findPath(from: Point, to: Point, radius = 17): Point[] {
    validPoint(from); validPoint(to); validRadius(radius)
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    if (!Number.isFinite(distance) || distance > 2500) throw new RangeError('Biome navigation exceeds query bounds')
    if (lineOfSight(from, to, radius)) return [to]
    const nearestCorner = (p: Point): Point => {
      const gx = Math.floor(p.x / CELL_SIZE) * CELL_SIZE, gy = Math.floor(p.y / CELL_SIZE) * CELL_SIZE
      const candidates = [
        { x: gx, y: gy }, { x: gx + CELL_SIZE, y: gy },
        { x: gx, y: gy + CELL_SIZE }, { x: gx + CELL_SIZE, y: gy + CELL_SIZE },
      ]
      candidates.sort((a, b) => {
        const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2
        const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2
        return da - db || a.x - b.x || a.y - b.y
      })
      const safe = candidates.find(corner => lineOfSight(p, corner, radius))
      if (!safe) throw new Error('No biome corridor is reachable from this position')
      return safe
    }
    const start = nearestCorner(from)
    const end = nearestCorner(to)
    const route = [start, { x: end.x, y: start.y }, end, to]
    return route.filter((p, i) => (i === 0 ? p.x !== from.x || p.y !== from.y :
      p.x !== route[i - 1]!.x || p.y !== route[i - 1]!.y))
  }

  function advance(dt: number, paused = false): number {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid biome simulation step')
    if (!paused) time += dt
    return time
  }

  function contact(position: Point, radius: number): HazardContact {
    validPoint(position); validRadius(radius)
    return session.current.contact(position, radius, time)
  }

  function step(position: Point, velocity: Point, radius: number, dt: number, paused = false): BiomeStep {
    validPoint(position); validPoint(velocity); validRadius(radius)
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid biome simulation step')
    if (paused || dt === 0) {
      return { position, hazardDamage: 0, contact: contact(position, radius) }
    }
    // Keep hazard status live, including suppression; never memoize per-frame damage.
    const before = contact(position, radius)
    // Cap only the damage/movement integration interval on a long frame.
    // Advance the full deterministic simulation clock so hazard phases stay in sync.
    const interval = Math.min(dt, 0.1)
    const next = move(position, {
      x: velocity.x * before.speedMultiplier + before.push.x,
      y: velocity.y * before.speedMultiplier + before.push.y,
    }, interval, radius)
    advance(dt)
    const after = contact(next, radius)
    return { position: next, contact: after, hazardDamage: after.damagePerSecond * interval }
  }

  return {
    get environment(): BiomeEnvironment { return session.current },
    get time(): number { return time },
    move, lineOfSight, findPath, advance, contact, step,
    minimap: (x: number, y: number, radius: number) => session.current.minimap(x, y, radius),
    interact: (position: Point) => session.current.interact(position, time),
    enter(next: BiomeId): BiomeEnvironment { time = 0; return session.enter(next) },
    reset(): void { time = 0; session.reset() },
  }
}
