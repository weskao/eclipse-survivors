import type {
  BiomeEnvironment, BiomeId, Bounds, Circle, HazardKind, Point, TerrainKind,
} from '../../content/biomes'
import type { Ctx2D } from '../ctx'

const TILE = 192
const TAU = Math.PI * 2
const SYMBOLS: Record<TerrainKind, string> = {
  pillar: '✛', 'broken-pew': '✥', 'ancient-tree': '♣', brambles: '❧',
  tomb: '✟', ossuary: '◇', 'floating-stone': '◆', 'arcane-spire': '✧',
}
const HAZARD_COLORS: Record<HazardKind, string> = {
  ritual: '#ff536e', altar: '#ef5577', poison: '#68dd64', roots: '#e2b954',
  curse: '#b76be9', wraith: '#82c8ec', rift: '#8674ff', surge: '#68ceff',
}
type CanvasFactory = (width: number, height: number) => HTMLCanvasElement

/** The caller controls screen transform: all bounds and draw coordinates are WORLD units. */
export function createBiomeRenderer(makeCanvas: CanvasFactory) {
  // Per-renderer, not global: each Canvas context owns its cached sprites.
  // A renderer is mounted on one scene/context; scene and DPR changes evict everything.
  const cache = new Map<string, HTMLCanvasElement>()
  let active: BiomeId | undefined
  let dpr = 1

  function reset(): void { cache.clear(); active = undefined }
  function setPixelRatio(next: number): void {
    if (!Number.isFinite(next) || next < 1 || next > 3) throw new RangeError('Invalid biome pixel ratio')
    if (next !== dpr) { dpr = next; reset() }
  }
  function scene(env: BiomeEnvironment): void {
    if (active !== env.definition.id) { reset(); active = env.definition.id }
  }
  function validate(view: Bounds): { x: number; y: number; radius: number } {
    const { left, right, top, bottom } = view
    if (![left, right, top, bottom].every(Number.isFinite) ||
      Math.max(Math.abs(left), Math.abs(right), Math.abs(top), Math.abs(bottom)) > 1e9 ||
      right <= left || bottom <= top || right - left > 2600 || bottom - top > 1440) {
      throw new RangeError('Invalid biome viewport')
    }
    const radius = Math.hypot(right - left, bottom - top) / 2 + 70
    if (radius > 1800) throw new RangeError('Biome viewport exceeds query radius')
    return { x: (left + right) / 2, y: (top + bottom) / 2, radius }
  }
  const intersects = (item: Circle, view: Bounds): boolean =>
    item.x + item.r >= view.left && item.x - item.r <= view.right &&
    item.y + item.r >= view.top && item.y - item.r <= view.bottom

  function prepaint(key: string, side: number, paint: (p: Ctx2D) => void): HTMLCanvasElement {
    const cached = cache.get(key)
    if (cached) return cached
    const canvas = makeCanvas(Math.round(side * dpr), Math.round(side * dpr))
    const p = canvas.getContext('2d')
    if (!p) throw new Error('Biome renderer needs a 2D canvas')
    p.save(); p.scale(dpr, dpr)
    paint(p)
    p.restore()
    // Four possible ground tiles plus two props for any one active biome.
    cache.set(key, canvas)
    return canvas
  }

  function tile(env: BiomeEnvironment): HTMLCanvasElement {
    const b = env.definition
    return prepaint(b.id + ':ground', TILE, p => {
      p.fillStyle = b.atmosphere.ground
      p.fillRect(0, 0, TILE, TILE)
      p.strokeStyle = b.atmosphere.fog
      p.lineWidth = 3
      p.strokeRect(1.5, 1.5, TILE - 3, TILE - 3)
      p.lineWidth = 1
      p.strokeRect(12, 12, TILE - 24, TILE - 24)
      // Static glyphwork is rasterized only once, never generated per animation frame.
      p.fillStyle = b.atmosphere.accent
      p.globalAlpha = .22
      p.font = '48px Georgia'
      p.textAlign = 'center'
      p.fillText(b.id === 'blood-moon-cathedral' ? '✛' :
        b.id === 'cursed-forest' ? '❦' : b.id === 'abyssal-necropolis' ? '✟' : '✧', TILE / 2, TILE / 2 + 15)
    })
  }

  function prop(env: BiomeEnvironment, kind: TerrainKind): HTMLCanvasElement {
    const b = env.definition
    return prepaint(b.id + ':' + kind, 96, p => {
      p.fillStyle = b.atmosphere.fog
      p.strokeStyle = b.atmosphere.accent
      p.lineWidth = 3
      p.beginPath(); p.arc(48, 48, 46, 0, TAU); p.fill(); p.stroke()
      p.fillStyle = b.atmosphere.glow
      p.font = 'bold 39px Georgia'
      p.textAlign = 'center'
      p.fillText(SYMBOLS[kind], 48, 61)
    })
  }

  /** Layer 1: cached floor, then accurately scaled hazard circles. Draw BEFORE actors. */
  function drawGround(ctx: Ctx2D, env: BiomeEnvironment, view: Bounds, time: number): void {
    const query = validate(view)
    if (!Number.isFinite(time)) throw new RangeError('Invalid biome simulation time')
    scene(env)
    const ground = tile(env)
    for (let i = Math.floor(view.left / TILE); i < Math.ceil(view.right / TILE); i++) {
      for (let j = Math.floor(view.top / TILE); j < Math.ceil(view.bottom / TILE); j++) {
        ctx.drawImage(ground, i * TILE, j * TILE, TILE, TILE)
      }
    }
    for (const h of env.hazards(query.x, query.y, query.radius)) {
      if (!intersects(h, view)) continue
      const phase = env.isSuppressed(h, time) ? 'idle' : env.phase(h, time)
      ctx.save()
      ctx.fillStyle = phase === 'warning' ? env.definition.atmosphere.telegraph : HAZARD_COLORS[h.kind]
      ctx.strokeStyle = phase === 'warning' ? '#fff3c6' : HAZARD_COLORS[h.kind]
      ctx.globalAlpha = phase === 'idle' ? .13 : phase === 'warning' ? .55 : .75
      ctx.lineWidth = phase === 'warning' ? 4 : 2
      // IMPORTANT: same world-space center and radius as contact(), no flattened ellipse.
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.stroke()
      ctx.restore()
    }
  }

  /** Layer 2: static props and interaction targets. Call BEFORE actors/projectiles. */
  function drawProps(ctx: Ctx2D, env: BiomeEnvironment, view: Bounds): void {
    const query = validate(view)
    scene(env)
    for (const obstacle of env.obstacles(query.x, query.y, query.radius)) {
      if (!intersects(obstacle, view)) continue
      const sprite = prop(env, obstacle.kind)
      ctx.drawImage(sprite, obstacle.x - obstacle.r, obstacle.y - obstacle.r, obstacle.r * 2, obstacle.r * 2)
    }
    // Interaction visibility and activation share the exact generated nodes.
    for (const node of env.interactions(query.x, query.y, query.radius)) {
      if (!intersects(node, view)) continue
      ctx.save()
      ctx.strokeStyle = env.definition.atmosphere.glow
      ctx.fillStyle = env.definition.atmosphere.accent
      ctx.globalAlpha = .68
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, TAU); ctx.stroke()
      ctx.font = 'bold 18px Georgia'
      ctx.textAlign = 'center'
      ctx.fillText('✦', node.x, node.y + 6)
      ctx.restore()
    }
  }

  /** Uses the same live providers used by collision/damage; draws inside a 152x110 canvas. */
  function drawMinimap(ctx: Ctx2D, env: BiomeEnvironment, origin: Point, time: number) {
    if (!Number.isFinite(time)) throw new RangeError('Invalid biome simulation time')
    const data = env.minimap(origin.x, origin.y, 1050)
    ctx.clearRect(0, 0, 152, 110)
    ctx.fillStyle = env.definition.atmosphere.minimap
    ctx.fillRect(0, 0, 152, 110)
    const scale = .078
    for (const o of data.obstacles) {
      const x = 76 + (o.x - origin.x) * scale, y = 55 + (o.y - origin.y) * scale
      if (x < -5 || x > 157 || y < -5 || y > 115) continue
      ctx.fillStyle = '#d2dfd6'
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, o.r * scale), 0, TAU); ctx.fill()
    }
    for (const h of data.hazards) {
      const x = 76 + (h.x - origin.x) * scale, y = 55 + (h.y - origin.y) * scale
      if (x < -5 || x > 157 || y < -5 || y > 115) continue
      ctx.strokeStyle = env.phase(h, time) === 'warning' ? env.definition.atmosphere.telegraph : HAZARD_COLORS[h.kind]
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, h.r * scale), 0, TAU); ctx.stroke()
    }
    ctx.fillStyle = '#fff3be'
    ctx.beginPath(); ctx.arc(76, 55, 3, 0, TAU); ctx.fill()
    return data
  }

  return { drawGround, drawProps, drawMinimap, reset, setPixelRatio, cacheSize: () => cache.size }
}
