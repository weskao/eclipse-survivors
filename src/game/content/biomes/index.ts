import { hash } from '../../math'

/** Integration adapter: does not alter the existing four legacy scenes or world renderer. */
export const BIOME_IDS = ['blood-moon-cathedral', 'cursed-forest', 'abyssal-necropolis', 'celestial-rift'] as const
export type BiomeId = typeof BIOME_IDS[number]
export type HazardPhase = 'idle' | 'warning' | 'active'
export type HazardKind = 'ritual' | 'altar' | 'poison' | 'roots' | 'curse' | 'wraith' | 'rift' | 'surge'
export type TerrainKind = 'pillar' | 'broken-pew' | 'ancient-tree' | 'brambles' | 'tomb' | 'ossuary' | 'floating-stone' | 'arcane-spire'
export type InteractionKind = 'blood-seal' | 'ward-tree' | 'soul-lantern' | 'rift-anchor'
export interface Point { readonly x: number; readonly y: number }
export interface Bounds { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
export interface Circle extends Point { readonly r: number; readonly id: string }
export interface Terrain extends Circle { readonly kind: TerrainKind; readonly variant: number }
export interface Hazard extends Circle {
  readonly kind: HazardKind
  readonly period: number
  readonly offset: number
  readonly quiet: number
  readonly warn: number
  readonly damagePerSecond: number
  readonly speedMultiplier: number
  readonly force: number
}
export interface Decoration extends Circle { readonly sprite: string }
export interface Interaction extends Circle { readonly kind: InteractionKind; readonly disableSeconds: number }
export interface BiomeCell { readonly terrain: readonly Terrain[]; readonly hazards: readonly Hazard[]; readonly decorations: readonly Decoration[]; readonly interactions: readonly Interaction[] }
export interface BiomeAtmosphere {
  readonly ground: string
  readonly accent: string
  readonly glow: string
  readonly fog: string
  readonly lighting: string
  readonly ambient: string
  readonly tiles: string
  readonly landmark: string
  readonly hazardArt: string
  readonly telegraph: string
  readonly minimap: string
}
export interface BiomeDefinition {
  readonly id: BiomeId
  readonly title: string
  readonly description: string
  readonly atmosphere: BiomeAtmosphere
  readonly terrain: readonly [TerrainKind, TerrainKind]
  readonly hazards: readonly [HazardKind, HazardKind]
  readonly interaction: InteractionKind
}

/** Sprite names are art requirements, not missing asset imports. Integration owns rendering. */
export const BIOMES: readonly BiomeDefinition[] = [
  { id: 'blood-moon-cathedral', title: 'Blood Moon Cathedral', description: 'Gothic nave, blood moon, ritual circles and corrupted altars',
    terrain: ['pillar', 'broken-pew'], hazards: ['ritual', 'altar'], interaction: 'blood-seal',
    atmosphere: { ground: '#291c2b', accent: '#df697c', glow: '#f46b8b', fog: '#42142d', lighting: 'blood-moon', ambient: 'red-embers', tiles: 'gothic-floor', landmark: 'gothic-pillar', hazardArt: 'ritual-circle', telegraph: '#ffe0a1', minimap: '#35202f' } },
  { id: 'cursed-forest', title: 'Cursed Forest', description: 'Ancient trees, toxic spores and grasping roots with purifiable groves',
    terrain: ['ancient-tree', 'brambles'], hazards: ['poison', 'roots'], interaction: 'ward-tree',
    atmosphere: { ground: '#172a24', accent: '#9fc669', glow: '#a3efaf', fog: '#183c30', lighting: 'canopy-shadows', ambient: 'spores', tiles: 'moss-roots', landmark: 'ancient-tree', hazardArt: 'poison-root', telegraph: '#f0e18d', minimap: '#1e352c' } },
  { id: 'abyssal-necropolis', title: 'Abyssal Necropolis', description: 'Tombs, spectral fog, cursed ground and wandering wraith lights',
    terrain: ['tomb', 'ossuary'], hazards: ['curse', 'wraith'], interaction: 'soul-lantern',
    atmosphere: { ground: '#242938', accent: '#9cb5d8', glow: '#9fe4ff', fog: '#1a2b45', lighting: 'grave-twilight', ambient: 'ghost-lights', tiles: 'grave-stone', landmark: 'mausoleum', hazardArt: 'cursed-sigil', telegraph: '#fff2a6', minimap: '#293448' } },
  { id: 'celestial-rift', title: 'Celestial Rift', description: 'Floating arcane ruins, unstable rifts and charged celestial currents',
    terrain: ['floating-stone', 'arcane-spire'], hazards: ['rift', 'surge'], interaction: 'rift-anchor',
    atmosphere: { ground: '#20243f', accent: '#b8a1ff', glow: '#8beaff', fog: '#30356b', lighting: 'astral-nebula', ambient: 'stardust', tiles: 'floating-runes', landmark: 'astral-spire', hazardArt: 'rift-vortex', telegraph: '#ffe8a3', minimap: '#283052' } },
] as const

export const CELL_SIZE = 420
export const MAX_BIOME_CACHE_CELLS = 256
const MAX_QUERY_RADIUS = 1800
const SAFE_SPAWN_RADIUS = 280
const INTERACTION_LIMIT = 48
const EPSILON = 1e-9

export interface HazardContact {
  readonly phase: 'none' | 'warning' | 'active'
  readonly damagePerSecond: number
  readonly speedMultiplier: number
  readonly push: Point
  readonly kinds: readonly HazardKind[]
}

export interface BiomeEnvironment {
  readonly definition: BiomeDefinition
  readonly cacheSize: () => number
  readonly activeInteractions: () => number
  cell(i: number, j: number): BiomeCell
  obstacles(x: number, y: number, radius: number): Terrain[]
  hazards(x: number, y: number, radius: number): Hazard[]
  interactions(x: number, y: number, radius: number): Interaction[]
  visibleDecorations(view: Bounds): Decoration[]
  minimap(x: number, y: number, radius: number): { obstacles: readonly Terrain[]; hazards: readonly Hazard[] }
  collide(position: Point, radius: number): Point
  phase(hazard: Hazard, time: number): HazardPhase
  isSuppressed(hazard: Hazard, time: number): boolean
  interactionAvailable(node: Interaction, time: number): boolean
  contact(position: Point, radius: number, time: number): HazardContact
  interact(position: Point, time: number): Interaction | null
  reset(): void
}

const validCoord = (n: number): void => { if (!Number.isFinite(n) || Math.abs(n) > 1e9) throw new RangeError('Invalid world coordinate') }
const validRadius = (r: number): void => { if (!Number.isFinite(r) || r < 0 || r > MAX_QUERY_RADIUS) throw new RangeError('Invalid biome query radius') }
const overlap = (a: Point, b: Point, radius: number): boolean => {
  const dx = a.x - b.x, dy = a.y - b.y
  return dx * dx + dy * dy <= radius * radius
}
const wrapped = (n: number, period: number): number => ((n % period) + period) % period

/** Per-stage bounded cell cache. Only static geometry is stored, never live hazard phases. */
export function createBiomeEnvironment(id: BiomeId, options: { seed?: number; maxCells?: number } = {}): BiomeEnvironment {
  const index = BIOME_IDS.indexOf(id)
  if (index < 0) throw new Error('Unknown biome: ' + id)
  const definition = BIOMES[index]!
  const seed = options.seed ?? 0
  const maxCells = options.maxCells ?? MAX_BIOME_CACHE_CELLS
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(maxCells) || maxCells < 1 || maxCells > 4096) {
    throw new RangeError('Invalid biome generation options')
  }
  const cells = new Map<string, BiomeCell>()
  const suppression = new Map<string, { until: number; x: number; y: number }>()
  const noise = (i: number, j: number, salt: number): number => hash(i * 13 + seed * 17 + index * 101 + salt * 37, j * 19 - seed * 11 + index * 53 + salt * 71)

  function generate(i: number, j: number): BiomeCell {
    const x = (i + 0.5) * CELL_SIZE
    const y = (j + 0.5) * CELL_SIZE
    const idBase = `${definition.id}:${seed}:${i}:${j}`
    const terrain: Terrain[] = []
    const hazards: Hazard[] = []
    const decorations: Decoration[] = []
    const interactions: Interaction[] = []
    // Geometry stays near cell centers; connected 120+ unit corridors span every edge.
    if (noise(i, j, 1) > 0.21) {
      const px = x + (noise(i, j, 2) - 0.5) * 140
      const py = y + (noise(i, j, 3) - 0.5) * 140
      const r = 29 + Math.floor(noise(i, j, 4) * 19)
      if (!overlap({ x: px, y: py }, { x: 0, y: 0 }, SAFE_SPAWN_RADIUS + r)) {
        const variant = noise(i, j, 5) > 0.5 ? 1 : 0
        terrain.push(Object.freeze({ id: `${idBase}:terrain`, x: px, y: py, r, kind: definition.terrain[variant]!, variant }))
      }
    }
    if (noise(i, j, 6) > 0.34) {
      const px = x + (noise(i, j, 7) - 0.5) * 175
      const py = y + (noise(i, j, 8) - 0.5) * 175
      const r = 39 + Math.floor(noise(i, j, 9) * 19)
      const safe = !overlap({ x: px, y: py }, { x: 0, y: 0 }, SAFE_SPAWN_RADIUS + r) &&
        terrain.every(t => !overlap(t, { x: px, y: py }, t.r + r + 20))
      if (safe) {
        const kind = definition.hazards[noise(i, j, 10) > 0.5 ? 1 : 0]!
        const spec = hazardParameters(kind)
        hazards.push(Object.freeze({ id: `${idBase}:hazard`, x: px, y: py, r, kind, ...spec, offset: noise(i, j, 11) * spec.period }))
      }
    }
    if (noise(i, j, 12) > 0.3) {
      const px = x + (noise(i, j, 13) - 0.5) * 290
      const py = y + (noise(i, j, 14) - 0.5) * 290
      decorations.push(Object.freeze({ id: `${idBase}:decoration`, x: px, y: py, r: 42, sprite: definition.atmosphere.tiles }))
    }
    if (noise(i, j, 15) > 0.74) {
      // Interactive nodes live near the open perimeter of each cell, never in blockers.
      const px = x - 148, py = y + 148
      if (!overlap({ x: px, y: py }, { x: 0, y: 0 }, SAFE_SPAWN_RADIUS + 35)) {
        interactions.push(Object.freeze({ id: `${idBase}:interaction`, x: px, y: py, r: 42, kind: definition.interaction, disableSeconds: 9 }))
      }
    }
    return Object.freeze({ terrain: Object.freeze(terrain), hazards: Object.freeze(hazards), decorations: Object.freeze(decorations), interactions: Object.freeze(interactions) })
  }

  function cell(i: number, j: number): BiomeCell {
    if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j)) throw new RangeError('Invalid biome cell')
    const key = `${definition.id}:${seed}:${i}:${j}`
    const hit = cells.get(key)
    if (hit) { cells.delete(key); cells.set(key, hit); return hit }
    const created = generate(i, j)
    if (cells.size >= maxCells) cells.delete(cells.keys().next().value!)
    cells.set(key, created)
    return created
  }

  function nearby<T extends Circle>(x: number, y: number, radius: number, section: keyof BiomeCell): T[] {
    validCoord(x); validCoord(y); validRadius(radius)
    const result: T[] = []
    const padding = 152
    for (let i = Math.floor((x - radius - padding) / CELL_SIZE); i <= Math.floor((x + radius + padding) / CELL_SIZE); i++) {
      for (let j = Math.floor((y - radius - padding) / CELL_SIZE); j <= Math.floor((y + radius + padding) / CELL_SIZE); j++) {
        for (const item of cell(i, j)[section] as unknown as readonly T[]) {
          if (overlap({ x, y }, item, radius + item.r)) result.push(item)
        }
      }
    }
    return result
  }
  const obstacles = (x: number, y: number, radius: number): Terrain[] => nearby(x, y, radius, 'terrain')
  const hazards = (x: number, y: number, radius: number): Hazard[] => nearby(x, y, radius, 'hazards')
  const interactions = (x: number, y: number, radius: number): Interaction[] => nearby(x, y, radius, 'interactions')

  function visibleDecorations(view: Bounds): Decoration[] {
    for (const n of [view.left, view.top, view.right, view.bottom]) validCoord(n)
    if (view.right < view.left || view.bottom < view.top || view.right - view.left > 3600 || view.bottom - view.top > 3600) {
      throw new RangeError('Invalid viewport')
    }
    const result: Decoration[] = []
    const pad = 46
    for (let i = Math.floor((view.left - pad) / CELL_SIZE); i <= Math.floor((view.right + pad) / CELL_SIZE); i++) {
      for (let j = Math.floor((view.top - pad) / CELL_SIZE); j <= Math.floor((view.bottom + pad) / CELL_SIZE); j++) {
        for (const d of cell(i, j).decorations) {
          if (d.x + d.r >= view.left && d.x - d.r <= view.right && d.y + d.r >= view.top && d.y - d.r <= view.bottom) result.push(d)
        }
      }
    }
    return result
  }

  function collide(position: Point, radius: number): Point {
    validCoord(position.x); validCoord(position.y); validRadius(radius)
    let x = position.x, y = position.y
    // Two narrow-phase passes avoid leaving the actor inside a neighboring circle.
    for (let pass = 0; pass < 2; pass++) {
      for (const o of obstacles(x, y, radius + 50)) {
        const dx = x - o.x, dy = y - o.y, limit = o.r + radius
        const squared = dx * dx + dy * dy
        if (squared >= limit * limit) continue
        const distance = Math.sqrt(squared)
        const scale = limit / Math.max(EPSILON, distance)
        x = o.x + (distance ? dx * scale : limit)
        y = o.y + (distance ? dy * scale : 0)
      }
    }
    return { x, y }
  }

  function phase(hazard: Hazard, time: number): HazardPhase {
    validCoord(time)
    const t = wrapped(time + hazard.offset, hazard.period) / hazard.period
    return t < hazard.quiet ? 'idle' : t < hazard.warn ? 'warning' : 'active'
  }

  function isSuppressed(hazard: Hazard, time: number): boolean {
    validCoord(time)
    for (const ward of suppression.values()) {
      if (ward.until > time && overlap(ward, hazard, 172)) return true
    }
    return false
  }

  function contact(position: Point, radius: number, time: number): HazardContact {
    validCoord(time)
    const kinds: HazardKind[] = []
    let damagePerSecond = 0, speedMultiplier = 1, px = 0, py = 0
    let warning = false
    for (const h of hazards(position.x, position.y, radius)) {
      const current = phase(h, time)
      if (current === 'idle') continue
      if (isSuppressed(h, time)) continue
      if (current === 'warning') { warning = true; continue }
      kinds.push(h.kind)
      damagePerSecond += h.damagePerSecond
      speedMultiplier = Math.min(speedMultiplier, h.speedMultiplier)
      if (h.force) {
        const dx = position.x - h.x, dy = position.y - h.y
        const mag = Math.max(1, Math.hypot(dx, dy))
        px += dx / mag * h.force
        py += dy / mag * h.force
      }
    }
    return { phase: kinds.length ? 'active' : warning ? 'warning' : 'none', damagePerSecond, speedMultiplier, push: { x: px, y: py }, kinds }
  }

  function interactionAvailable(node: Interaction, time: number): boolean {
    validCoord(time)
    return (suppression.get(node.id)?.until ?? -Infinity) <= time
  }

  function interact(position: Point, time: number): Interaction | null {
    validCoord(position.x); validCoord(position.y); validCoord(time)
    for (const [key, value] of suppression) if (value.until <= time) suppression.delete(key)
    for (const node of nearby<Interaction>(position.x, position.y, 22, 'interactions')) {
      if (suppression.has(node.id)) continue
      if (suppression.size >= INTERACTION_LIMIT) suppression.delete(suppression.keys().next().value!)
      suppression.set(node.id, { until: time + node.disableSeconds, x: node.x, y: node.y })
      return node
    }
    return null
  }
  function reset(): void { cells.clear(); suppression.clear() }
  return { definition, cell, obstacles, hazards, interactions, visibleDecorations,
    minimap: (x, y, radius) => ({ obstacles: obstacles(x, y, radius), hazards: hazards(x, y, radius) }),
    collide, phase, isSuppressed, interactionAvailable, contact, interact, reset, cacheSize: () => cells.size, activeInteractions: () => suppression.size }
}

function hazardParameters(kind: HazardKind): Pick<Hazard, 'period' | 'quiet' | 'warn' | 'damagePerSecond' | 'speedMultiplier' | 'force'> {
  switch (kind) {
    case 'ritual': return { period: 4.8, quiet: .42, warn: .76, damagePerSecond: 11, speedMultiplier: 1, force: 0 }
    case 'altar': return { period: 5.2, quiet: .48, warn: .8, damagePerSecond: 8, speedMultiplier: .8, force: 0 }
    case 'poison': return { period: 6, quiet: .3, warn: .65, damagePerSecond: 6, speedMultiplier: .9, force: 0 }
    case 'roots': return { period: 4.5, quiet: .5, warn: .8, damagePerSecond: 1, speedMultiplier: .55, force: 0 }
    case 'curse': return { period: 5.5, quiet: .4, warn: .73, damagePerSecond: 7, speedMultiplier: .82, force: 0 }
    case 'wraith': return { period: 4.2, quiet: .45, warn: .8, damagePerSecond: 5, speedMultiplier: .7, force: 0 }
    case 'rift': return { period: 3.8, quiet: .38, warn: .75, damagePerSecond: 3, speedMultiplier: 1, force: 35 }
    case 'surge': return { period: 3.2, quiet: .4, warn: .7, damagePerSecond: 12, speedMultiplier: 1, force: 0 }
  }
}

/** A scene-change adapter that owns its own cache and clears all active terrain interactions. */
export function createBiomeSession(initial: BiomeId, options: { seed?: number; maxCells?: number } = {}) {
  let current = createBiomeEnvironment(initial, options)
  return {
    get current(): BiomeEnvironment { return current },
    enter(next: BiomeId): BiomeEnvironment { current.reset(); current = createBiomeEnvironment(next, options); return current },
    reset(): void { current.reset() },
  }
}
