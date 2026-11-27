import type { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { AURA_BUDGET, emberPose, perimeterPoint, type AuraMode } from './legendary-aura'

export interface AuraRect { x: number; y: number; w: number; h: number; r: number }
export interface LegendaryAuraHandle { layout(width: number, height: number, cards: readonly AuraRect[], mode: AuraMode): void; release(): void }

type Pixi = typeof import('pixi.js')
type Kind = 'dot' | 'star' | 'rays' | 'ring' | 'pillar' | 'sheen'
interface CardFx {
  root: Container; clip: Container; mask: Graphics; rays: Sprite; sheen: Sprite
  embers: Sprite[]; stars: Sprite[]; comets: Sprite[][]; pillar: Sprite; ring: Sprite; burst: Sprite[]
}
interface Runtime { app: Application; pixi: Pixi; textures: Record<Kind, Texture>; cards: CardFx[]; lost: boolean }

const GOLD = 0xffcf7a, PALE = 0xfff1c8, HOT = 0xffe7a6
const hash = (n: number) => { const x = Math.sin(n * 91.7 + 47.3) * 24634.6345; return x - Math.floor(x) }
const ease = (k: number) => 1 - (1 - k) ** 3

/** Pre-baked once per runtime: soft glow sprites replace per-frame gradients, blur and paths. */
function bakeTextures(pixi: Pixi): Record<Kind, Texture> {
  const make = (w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    paint(canvas.getContext('2d')!)
    return new pixi.Texture({ source: new pixi.CanvasSource({ resource: canvas }) })
  }
  const radial = (c: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r); for (const [at, color] of stops) g.addColorStop(at, color); return g
  }
  return {
    dot: make(64, 64, c => { c.fillStyle = radial(c, 32, 32, 32, [[0, '#fff'], [.22, '#ffffffd0'], [.5, '#ffffff40'], [1, '#fff0']]); c.fillRect(0, 0, 64, 64) }),
    star: make(96, 96, c => {
      c.fillStyle = radial(c, 48, 48, 30, [[0, '#ffffffb0'], [1, '#fff0']]); c.fillRect(0, 0, 96, 96)
      c.fillStyle = '#fff'; c.beginPath()
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 46; c.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r) }
      c.closePath(); c.fill()
    }),
    rays: make(512, 512, c => {
      c.translate(256, 256)
      for (let i = 0; i < 14; i++) {
        c.rotate(Math.PI * 2 / 14)
        const wide = i % 2 ? .07 : .12
        c.fillStyle = radial(c, 0, 0, 256, [[0, '#ffffffc0'], [.35, '#ffffff50'], [1, '#fff0']])
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 256, -wide, wide); c.closePath(); c.fill()
      }
    }),
    ring: make(256, 256, c => {
      c.fillStyle = radial(c, 128, 128, 128, [[0, '#fff0'], [.72, '#fff0'], [.86, '#ffffffe0'], [.9, '#ffffff70'], [1, '#fff0']]); c.fillRect(0, 0, 256, 256)
    }),
    pillar: make(64, 256, c => {
      const g = c.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, '#fff0'); g.addColorStop(.5, '#fff'); g.addColorStop(1, '#fff0')
      c.fillStyle = g; c.fillRect(0, 0, 64, 256)
      c.globalCompositeOperation = 'destination-in'
      const v = c.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, '#fff0'); v.addColorStop(.35, '#fff'); v.addColorStop(.75, '#ffffffa0'); v.addColorStop(1, '#fff0')
      c.fillStyle = v; c.fillRect(0, 0, 64, 256)
    }),
    sheen: make(128, 8, c => {
      const g = c.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, '#fff0'); g.addColorStop(.42, '#ffffff30'); g.addColorStop(.5, '#ffffffb0'); g.addColorStop(.58, '#ffffff30'); g.addColorStop(1, '#fff0')
      c.fillStyle = g; c.fillRect(0, 0, 128, 8)
    }),
  }
}

function cardFx(rt: Runtime): CardFx {
  const { pixi, textures: tx } = rt
  const sprite = (t: Texture, tint: number) => { const s = new pixi.Sprite(t); s.anchor.set(.5); s.blendMode = 'add'; s.tint = tint; s.visible = false; return s }
  const many = (n: number, t: Texture, tint: number) => Array.from({ length: n }, () => sprite(t, tint))
  const root = new pixi.Container(), clip = new pixi.Container(), mask = new pixi.Graphics()
  const fx: CardFx = {
    root, clip, mask, rays: sprite(tx.rays, GOLD), sheen: sprite(tx.sheen, PALE),
    embers: many(AURA_BUDGET.embers, tx.dot, GOLD), stars: many(AURA_BUDGET.stars, tx.star, PALE),
    comets: Array.from({ length: AURA_BUDGET.comets }, () => many(1 + AURA_BUDGET.trail, tx.dot, HOT)),
    pillar: sprite(tx.pillar, HOT), ring: sprite(tx.ring, GOLD), burst: many(AURA_BUDGET.burst, tx.dot, HOT),
  }
  clip.addChild(fx.rays, fx.pillar, fx.sheen, ...fx.embers, ...fx.stars); clip.mask = mask
  // Comets ride the border and the reveal burst spills into the gap, so they stay unclipped.
  root.addChild(clip, mask, ...fx.comets.flat(), fx.ring, ...fx.burst)
  return fx
}

let shared: Promise<Runtime | null> | undefined
/** One lazily created WebGL context for every level-up dialog; the pixi chunk loads only when a legendary is offered. */
function runtime(): Promise<Runtime | null> {
  shared ??= (async () => {
    try {
      const pixi = await import('pixi.js')
      const app = new pixi.Application()
      await app.init({ preference: ['webgl'], backgroundAlpha: 0, antialias: false, autoStart: false, sharedTicker: false,
        resolution: Math.min(2, globalThis.devicePixelRatio || 1), autoDensity: true, width: 1, height: 1, powerPreference: 'low-power' })
      const rt: Runtime = { app, pixi, textures: bakeTextures(pixi), cards: [], lost: false }
      app.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); rt.lost = true; app.ticker.stop(); app.canvas.remove(); shared = undefined })
      return rt
    } catch { shared = undefined; return null } // WebGL unavailable: the CSS foil frame remains the whole effect.
  })()
  return shared
}

function place(fx: CardFx, c: AuraRect, mode: AuraMode, t: number, stagger: number): void {
  const full = mode === 'full', { w, h } = c
  fx.root.position.set(c.x, c.y)
  // Rays sit behind the art focal point (upper card), slow enough to read as light, not motion.
  const cx = w / 2, cy = h * .3, span = Math.max(w, h) * 1.25
  fx.rays.visible = true; fx.rays.position.set(cx, cy); fx.rays.width = fx.rays.height = span
  fx.rays.rotation = t * (full ? .12 : .05); fx.rays.alpha = (full ? .2 : .12) + Math.sin(t * 1.3) * (full ? .05 : .015)
  // Foil sweep: one diagonal pass every 3.6 s; calm mode keeps it dim and slow.
  const period = full ? 3.6 : 6, k = ((t - stagger) % period + period) % period / period
  fx.sheen.visible = k < .45
  if (fx.sheen.visible) {
    const p = k / .45
    fx.sheen.position.set(-w * .4 + p * w * 1.8, h * .5); fx.sheen.rotation = -.62
    fx.sheen.width = h * 1.6; fx.sheen.height = w * .5; fx.sheen.alpha = (full ? .5 : .22) * Math.sin(p * Math.PI)
  }
  for (let i = 0; i < fx.embers.length; i++) {
    const s = fx.embers[i]!, e = emberPose(i, t, w, h)
    s.visible = e.alpha > .01; s.position.set(e.x, e.y); s.alpha = e.alpha * (full ? 1 : .55); s.scale.set(e.scale * (w / 900 + .12))
  }
  for (let i = 0; i < fx.stars.length; i++) {
    const s = fx.stars[i]!, tw = full ? Math.max(0, Math.sin(t * (1.4 + hash(i) * 1.6) + hash(i + 4) * 6)) ** 3 : .35
    s.visible = tw > .02; s.position.set(w * (.12 + hash(i + 8) * .76), h * (.06 + hash(i + 12) * .4))
    s.alpha = tw * .9; s.scale.set((.12 + hash(i + 2) * .12) * (.7 + tw * .3)); s.rotation = t * .4 + i
  }
  for (let j = 0; j < fx.comets.length; j++) {
    const trail = fx.comets[j]!, u = t / AURA_BUDGET.cometLoop * (full ? 1 : .5) + j / fx.comets.length
    for (let k2 = 0; k2 < trail.length; k2++) {
      const s = trail[k2]!, p = perimeterPoint(w, h, c.r, u - k2 * .006), fade = 1 - k2 / trail.length
      s.visible = true; s.position.set(p.x, p.y); s.alpha = (full ? 1 : .5) * fade ** 1.4; s.scale.set((k2 ? .32 : .6) * (.55 + fade * .45))
    }
  }
  // Reveal: light pillar drops onto the card, a shockwave ring and a gold burst spill out once, then settle.
  const r = (t - stagger) / AURA_BUDGET.revealSeconds, revealing = full && r >= 0 && r < 1
  fx.pillar.visible = fx.ring.visible = revealing
  for (const s of fx.burst) s.visible = revealing
  if (!revealing) return
  fx.pillar.position.set(cx, h * .5); fx.pillar.width = w * (1.1 - r * .7); fx.pillar.height = h * 1.3; fx.pillar.alpha = .85 * (1 - ease(r))
  fx.ring.position.set(cx, cy); fx.ring.width = fx.ring.height = Math.max(w, h) * (.2 + ease(r) * 1.1); fx.ring.alpha = .9 * (1 - r) ** 2
  for (let i = 0; i < fx.burst.length; i++) {
    const s = fx.burst[i]!, a = i / fx.burst.length * Math.PI * 2 + hash(i) * .4, dist = (.25 + hash(i + 30) * .55) * Math.max(w, h) * ease(r)
    s.position.set(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * .85 + r * r * h * .12)
    s.alpha = (1 - r) ** 1.2; s.scale.set((.3 + hash(i + 60) * .35) * (1 - r * .5))
  }
}

/** Attach the shared aura canvas to `host`; release() detaches it, stops the ticker and keeps the context for the next offer. */
export async function acquireLegendaryAura(host: HTMLElement): Promise<LegendaryAuraHandle | null> {
  const rt = await runtime()
  if (!rt || rt.lost || !host.isConnected) return null
  const { app } = rt
  let rects: readonly AuraRect[] = [], mode: AuraMode = 'off', released = false
  const start = performance.now()
  const tick = () => {
    const t = (performance.now() - start) / 1000
    for (let i = 0; i < rt.cards.length; i++) rt.cards[i]!.root.visible = i < rects.length
    for (let i = 0; i < rects.length; i++) place(rt.cards[i]!, rects[i]!, mode, t, i * .08)
    app.render()
  }
  app.canvas.classList.add('es3-legend-aura-canvas'); host.appendChild(app.canvas)
  app.ticker.add(tick)
  return {
    layout(width, height, cards, next) {
      if (released) return
      rects = cards.slice(0, AURA_BUDGET.maxCards); mode = next
      while (rt.cards.length < rects.length) { const fx = cardFx(rt); rt.cards.push(fx); app.stage.addChild(fx.root) }
      rects.forEach((c, i) => { const m = rt.cards[i]!.mask; m.clear(); m.roundRect(0, 0, c.w, c.h, c.r).fill(0xffffff) })
      app.renderer.resize(Math.max(1, width), Math.max(1, height))
      if (mode === 'off' || !rects.length) { app.ticker.stop(); app.stage.visible = false; app.render() } else { app.stage.visible = true; app.ticker.start() }
    },
    release() {
      if (released) return
      released = true; app.ticker.remove(tick); app.ticker.stop()
      app.stage.visible = false; app.render(); app.canvas.remove()
    },
  }
}
