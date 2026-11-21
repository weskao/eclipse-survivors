import { SCENE, TAU } from '../constants'
import type { Artwork } from '../art'
import { hash } from '../math'
import { currentSceneInfo } from '../state'
import type { GameState } from '../types'
import type { Ctx2D } from './ctx'
import type { Props } from './sprites'

const ready = (img: HTMLImageElement): boolean => img.complete && img.naturalWidth > 0

export function paintEnvironment(ctx: Ctx2D, s: GameState, art: Artwork, props: Props, ox: number, oy: number): void {
  const { W, H } = s
  const tex = art.ground
  if (ready(tex)) {
    const size = 768
    const px = ((ox % size) + size) % size
    const py = ((oy % size) + size) % size
    for (let x = px - size; x < W; x += size) for (let y = py - size; y < H; y += size) ctx.drawImage(tex, x, y, size, size)
  } else {
    ctx.fillStyle = '#333f35'
    ctx.fillRect(0, 0, W, H)
  }
  const map = art.courtyard
  if (ready(map)) ctx.drawImage(map, ox - SCENE.width / 2, oy - SCENE.height / 2, SCENE.width, SCENE.height)
  // Outside the illustrated courtyard: cached 2.5D world props, sparsely scattered.
  const size = 290
  const x0 = Math.floor(-ox / size) - 1
  const x1 = Math.ceil((W - ox) / size) + 1
  const y0 = Math.floor(-oy / size) - 1
  const y1 = Math.ceil((H - oy) / size) + 1
  for (let i = x0; i <= x1; i++) {
    for (let j = y0; j <= y1; j++) {
      const wx = i * size + (hash(i + 91, j) - 0.5) * size * 0.65
      const wy = j * size + (hash(i, j + 52) - 0.5) * size * 0.66
      if (Math.abs(wx) < 1020 && Math.abs(wy) < 565) continue
      const xx = wx + ox
      const yy = wy + oy
      const k = hash(i, j)
      if (k > 0.75) ctx.drawImage(props.tree, xx - 90, yy - 207, 181, 216)
      else if (k > 0.65) ctx.drawImage(props.ruin, xx - 46, yy - 114, 92, 121)
      else if (k > 0.56) ctx.drawImage(props.crystal, xx - 25, yy - 52, 56, 65)
    }
  }
}

export function softGlow(ctx: Ctx2D, x: number, y: number, r: number, col: string, power = 1): void {
  ctx.save()
  ctx.globalAlpha = power
  const g = ctx.createRadialGradient(x, y, 1, x, y, r)
  g.addColorStop(0, col)
  g.addColorStop(1, '#00000000')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function weatherLayer(ctx: Ctx2D, weather: string, W: number, H: number, q: number): void {
  if (weather === 'storm') {
    ctx.fillStyle = 'rgba(18,28,48,.18)'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 85; i++) {
      const x = (hash(i, 91) * W + q * 340 + i * 19) % (W + 80) - 40
      const y = (hash(i, 37) * (H + 180) + q * 610 + i * 11) % (H + 120) - 60
      ctx.strokeStyle = 'rgba(179,220,255,.22)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 24); ctx.stroke()
    }
    if (Math.sin(q * 3.4) > 0.986) softGlow(ctx, W * 0.58, H * 0.2, 180, '#91c6ff66', 0.55)
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(198,225,255,.08)'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 70; i++) {
      const x = (hash(i, 51) * W + q * 30 + i * 7) % (W + 40) - 20
      const y = (hash(i, 18) * (H + 70) + q * (35 + (i % 3) * 14)) % (H + 50) - 25
      const flake = 1 + (i % 5 === 0 ? 2 : 0)
      ctx.fillStyle = 'rgba(245,251,255,.72)'
      ctx.beginPath(); ctx.arc(x + Math.sin(q + i) * 8, y, flake, 0, TAU); ctx.fill()
    }
  } else if (weather === 'embers') {
    ctx.fillStyle = 'rgba(45,12,6,.09)'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 68; i++) {
      const x = hash(i, 25) * W + Math.sin(q * 0.4 + i) * 12
      const y = (hash(i, 65) * (H + 80) - q * (50 + (i % 4) * 10)) % (H + 60)
      ctx.fillStyle = i % 3 ? `rgba(255,145,76,${0.25 + 0.25 * Math.sin(q * 2 + i)})` : `rgba(255,222,166,${0.18 + 0.18 * Math.sin(q * 1.6 + i)})`
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 7 === 0 ? 2 : 0), 0, TAU); ctx.fill()
    }
  } else {
    for (let i = 0; i < 26; i++) {
      const x = hash(i, 72) * W + Math.sin(q * 0.7 + i) * 18
      const y = (hash(i, 12) * (H + 60) + q * (20 + (i % 4) * 7)) % (H + 35) - 18
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
    const x = (hash(i, 7) - 0.5) * 2100 + ox + Math.sin(q * 0.32 + i) * 13
    const y = (hash(i, 13) - 0.5) * 1080 + oy + Math.sin(q * 0.6 + i * 2.1) * 13
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue
    const a = 0.17 + 0.3 * (0.5 + 0.5 * Math.sin(q * 1.6 + i * 6))
    ctx.fillStyle = i % 5 === 0 ? `rgba(238,180,126,${a})` : `rgba(183,227,182,${a * 0.83})`
    ctx.beginPath(); ctx.arc(x, y, i % 6 === 0 ? 2.4 : 1.1, 0, TAU); ctx.fill()
  }
  const moon = Math.max(0, 0.5 + 0.5 * Math.sin(q * 0.45))
  softGlow(ctx, ox + 765, oy - 408, 120, '#6ab6fe77', 0.18 + 0.2 * moon)
  softGlow(ctx, ox - 825, oy - 392, 80, '#ffaf5b7b', 0.3 + moon * 0.25)
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
