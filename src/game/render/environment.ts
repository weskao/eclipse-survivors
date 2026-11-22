import { SCENE, TAU } from '../constants'
import type { Artwork } from '../art'
import { hash } from '../math'
import { currentSceneInfo } from '../state'
import { BIOME_IDS } from '../content/biomes'
import type { WorldRuntimeImages } from './es2/production-world'
import type { GameState } from '../types'
import type { Ctx2D } from './ctx'
import type { BiomeArt } from './biome-art'
import type { Props } from './sprites'
import { biomePalette, hazardPhase, nearbyHazards, nearbyObstacles } from '../world'

const ready = (img: HTMLImageElement): boolean => img.complete && img.naturalWidth > 0

// Procedural particle anchors do not depend on time or viewport size.
// Compute hashes exactly once, then animate the resulting positions.
const STORM_SAMPLES = Array.from({ length: 85 }, (_, i) => [hash(i, 91), hash(i, 37)] as const)
const SNOW_SAMPLES = Array.from({ length: 70 }, (_, i) => [hash(i, 51), hash(i, 18)] as const)
const EMBER_SAMPLES = Array.from({ length: 68 }, (_, i) => [hash(i, 25), hash(i, 65)] as const)
const SUN_SAMPLES = Array.from({ length: 26 }, (_, i) => [hash(i, 72), hash(i, 12)] as const)
const AMBIENT_SAMPLES = Array.from({ length: 37 }, (_, i) => [hash(i, 7), hash(i, 13)] as const)

// Gradients use local coordinates, so equivalent glows can move without
// rebuilding GPU paint objects. Weak context keys and bounded entries avoid
// retaining canvases or unlimited color/radius variants.
const glowGradients = new WeakMap<Ctx2D, Map<string, CanvasGradient>>()

export function paintEnvironment(ctx: Ctx2D, s: GameState, art: Artwork, props: Props, biomes: BiomeArt[], ox: number, oy: number, world?: WorldRuntimeImages): void {
  const { W, H } = s
  const biome = biomes[s.currentScene] ?? biomes[0]!
  const biomeId = BIOME_IDS[s.currentScene]
  const ground = biomeId && world?.ground[biomeId]
  const authoredGround = !!ground && ground.complete && ground.naturalWidth >= 768 && ground.naturalWidth === ground.naturalHeight
  const tile = authoredGround ? ground : biome.tile
  const decor = biomeId && world?.decor[biomeId]
  const authoredDecor = !!decor && decor.complete && decor.naturalHeight >= 96 && decor.naturalWidth === decor.naturalHeight * 4
  const size = 384
  const px = ((ox % size) + size) % size
  const py = ((oy % size) + size) % size
  for (let x = px - size; x < W; x += size) for (let y = py - size; y < H; y += size) {
    ctx.drawImage(tile, x, y, size, size)
  }
  // Only the sunlit ruins retain the authored courtyard illustration.
  if (s.currentScene === 0 && !authoredGround && ready(art.courtyard)) {
    ctx.drawImage(art.courtyard, ox - SCENE.width / 2, oy - SCENE.height / 2, SCENE.width, SCENE.height)
  }
  const centerX = W / 2 - ox
  const centerY = H / 2 - oy
  const extent = Math.hypot(W, H) / 2 + 180
  for (const h of nearbyHazards(s.currentScene, centerX, centerY, extent)) {
    const x = h.x + ox
    const y = h.y + oy
    const phase = hazardPhase(s.currentScene, h, s.worldClock)
    const palette = biomePalette[s.currentScene] ?? biomePalette[0]!
    ctx.save()
    ctx.globalAlpha = phase === 'idle' ? .24 : phase === 'warning' ? .58 : .78
    ctx.fillStyle = s.currentScene === 3 ? '#ff642d7a' : s.currentScene === 1 ? '#70a6f37a' :
      s.currentScene === 2 ? '#b8f0ff72' : '#a4c37951'
    ctx.beginPath(); ctx.ellipse(x, y, h.r, h.r * .58, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = phase === 'active' ? '#fff2bc' : palette.accent
    ctx.lineWidth = phase === 'warning' ? 4 : 2
    ctx.beginPath(); ctx.ellipse(x, y, h.r + 4, h.r * .6 + 3, 0, 0, TAU); ctx.stroke()
    if (phase === 'warning') {
      ctx.fillStyle = '#fff5d7'; ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('!', x, y + 6)
    }
    ctx.restore()
  }
  for (const o of nearbyObstacles(s.currentScene, centerX, centerY, extent)) {
    const x = o.x + ox
    const y = o.y + oy
    if (x < -110 || x > W + 110 || y < -180 || y > H + 80) continue
    if (authoredDecor && decor) {
      // Decoration is visual only: authoritative collision still uses the original obstacle.
      ctx.save()
      ctx.globalAlpha = 0.76
      const sourceSide = decor.naturalHeight
      ctx.drawImage(decor, (o.variant % 4) * sourceSide, 0, sourceSide, sourceSide, x - 55, y - 105, 110, 110)
      ctx.restore()
    } else if (s.currentScene === 0 && o.variant === 0) ctx.drawImage(props.tree, x - 90, y - 207, 181, 216)
    else if (s.currentScene === 0 && o.variant === 1) ctx.drawImage(props.ruin, x - 46, y - 114, 92, 121)
    else if (s.currentScene === 1 && o.variant === 1) ctx.drawImage(props.crystal, x - 34, y - 90, 68, 95)
    else if (s.currentScene === 2 && o.variant === 2) ctx.drawImage(props.crystal, x - 38, y - 105, 76, 110)
    else ctx.drawImage(biome.landmark, x - 72, y - 156, 144, 176)
  }
}

export function drawWorldMarkers(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  const symbols = { chest: '◆', shrine: '✦', invasion: '⚔', blessing: '✧', bargain: '◈', challenge: '◎' }
  const titles = { chest: '古代寶箱', shrine: '魔法祭壇', invasion: '菁英入侵',
    blessing: '短暫祝福', bargain: '契約 -14HP', challenge: '危險試煉' }
  const colors = { chest: '#ffcc75', shrine: '#b9d9ff', invasion: '#ff8176',
    blessing: '#a8ffc9', bargain: '#d6a9ff', challenge: '#ffc288' }
  for (const e of s.events) {
    const x = e.x + ox
    const y = e.y + oy
    if (x < -45 || x > s.W + 45 || y < -45 || y > s.H + 45) continue
    const glow = colors[e.kind]
    softGlow(ctx, x, y - 11, 46, glow, .43)
    ctx.save()
    ctx.strokeStyle = glow; ctx.lineWidth = 3
    ctx.beginPath(); ctx.ellipse(x, y, 27 + Math.sin(s.worldClock * 3) * 3, 10, 0, 0, TAU); ctx.stroke()
    ctx.textAlign = 'center'; ctx.font = 'bold 25px Georgia'; ctx.fillStyle = '#fff6e2'
    ctx.fillText(symbols[e.kind], x, y - 14)
    ctx.fillStyle = '#101a23db'; ctx.fillRect(x - 49, y + 11, 98, 20)
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = glow
    ctx.fillText(titles[e.kind], x, y + 25)
    ctx.restore()
  }
  if (!s.challengePoint) return
  const x = s.challengePoint.x + ox
  const y = s.challengePoint.y + oy
  ctx.save()
  ctx.strokeStyle = s.time % 3 > 2.15 ? '#ff6c58' : '#e8baff'
  ctx.lineWidth = 7
  ctx.beginPath(); ctx.ellipse(x, y, 130, 76, 0, 0, TAU); ctx.stroke()
  ctx.strokeStyle = '#dfc6ff88'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(x, y, 250, 145, 0, 0, TAU); ctx.stroke()
  ctx.restore()
}

export function softGlow(ctx: Ctx2D, x: number, y: number, r: number, col: string, power = 1): void {
  let gradients = glowGradients.get(ctx)
  if (!gradients) {
    gradients = new Map()
    glowGradients.set(ctx, gradients)
  }
  const key = `${r}:${col}`
  let gradient = gradients.get(key)
  if (!gradient) {
    gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, r)
    gradient.addColorStop(0, col)
    gradient.addColorStop(1, '#00000000')
    if (gradients.size >= 48) {
      const oldest = gradients.keys().next()
      if (!oldest.done) gradients.delete(oldest.value)
    }
    gradients.set(key, gradient)
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = power
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function weatherLayer(ctx: Ctx2D, weather: string, W: number, H: number, q: number): void {
  if (weather === 'storm') {
    ctx.fillStyle = 'rgba(18,28,48,.18)'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 85; i++) {
      const [nx, ny] = STORM_SAMPLES[i]!
      const x = (nx * W + q * 340 + i * 19) % (W + 80) - 40
      const y = (ny * (H + 180) + q * 610 + i * 11) % (H + 120) - 60
      ctx.strokeStyle = 'rgba(179,220,255,.22)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 24); ctx.stroke()
    }
    if (Math.sin(q * 3.4) > 0.986) softGlow(ctx, W * 0.58, H * 0.2, 180, '#91c6ff66', 0.55)
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(198,225,255,.08)'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 70; i++) {
      const [nx, ny] = SNOW_SAMPLES[i]!
      const x = (nx * W + q * 30 + i * 7) % (W + 40) - 20
      const y = (ny * (H + 70) + q * (35 + (i % 3) * 14)) % (H + 50) - 25
      const flake = 1 + (i % 5 === 0 ? 2 : 0)
      ctx.fillStyle = 'rgba(245,251,255,.72)'
      ctx.beginPath(); ctx.arc(x + Math.sin(q + i) * 8, y, flake, 0, TAU); ctx.fill()
    }
  } else if (weather === 'embers') {
    ctx.fillStyle = 'rgba(45,12,6,.09)'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 68; i++) {
      const [nx, ny] = EMBER_SAMPLES[i]!
      const x = nx * W + Math.sin(q * 0.4 + i) * 12
      const y = (ny * (H + 80) - q * (50 + (i % 4) * 10)) % (H + 60)
      ctx.fillStyle = i % 3 ? `rgba(255,145,76,${0.25 + 0.25 * Math.sin(q * 2 + i)})` : `rgba(255,222,166,${0.18 + 0.18 * Math.sin(q * 1.6 + i)})`
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 7 === 0 ? 2 : 0), 0, TAU); ctx.fill()
    }
  } else {
    for (let i = 0; i < 26; i++) {
      const [nx, ny] = SUN_SAMPLES[i]!
      const x = nx * W + Math.sin(q * 0.7 + i) * 18
      const y = (ny * (H + 60) + q * (20 + (i % 4) * 7)) % (H + 35) - 18
      ctx.fillStyle = i % 4 === 0 ? 'rgba(255,223,239,.45)' : 'rgba(255,241,205,.22)'
      ctx.beginPath(); ctx.ellipse(x, y, 4, 2, Math.sin(i), 0, TAU); ctx.fill()
    }
  }
}

export function drawAmbient(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  const { W, H } = s
  const q = s.worldClock
  const scene = currentSceneInfo(s)
  for (let i = 0; i < 37; i++) {
    const [nx, ny] = AMBIENT_SAMPLES[i]!
    const x = (nx - 0.5) * 2100 + ox + Math.sin(q * 0.32 + i) * 13
    const y = (ny - 0.5) * 1080 + oy + Math.sin(q * 0.6 + i * 2.1) * 13
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue
    const a = 0.17 + 0.3 * (0.5 + 0.5 * Math.sin(q * 1.6 + i * 6))
    ctx.fillStyle = i % 5 === 0 ? `rgba(238,180,126,${a})` : `rgba(183,227,182,${a * 0.83})`
    ctx.beginPath(); ctx.arc(x, y, i % 6 === 0 ? 2.4 : 1.1, 0, TAU); ctx.fill()
  }
  const pulse = Math.max(0, 0.5 + 0.5 * Math.sin(q * 0.45))
  const colors = ['#f5db9c77', '#70adff77', '#c9f3ff77', '#ff804a77']
  softGlow(ctx, ox + 765, oy - 408, 120, colors[s.currentScene] ?? colors[0]!, 0.18 + 0.2 * pulse)
  softGlow(ctx, ox - 825, oy - 392, 80, colors[s.currentScene] ?? colors[0]!, 0.23 + pulse * 0.2)
  const rx = ox + 875
  const ry = oy + 355
  for (let i = 0; i < 4; i++) {
    ctx.save()
    ctx.globalAlpha = 0.12 * (0.5 + 0.5 * Math.sin(q * 1.4 + i))
    ctx.strokeStyle = '#b6f3ff'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(rx - 70 + i * 35, ry + i * 8, 16 + Math.sin(q + i) * 4, 3.8, 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }
  weatherLayer(ctx, scene.weather, W, H, q)
}
