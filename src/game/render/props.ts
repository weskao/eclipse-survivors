import { TAU } from '../constants'
import { hash } from '../math'
import type { Ctx2D } from './ctx'
import type { MakeCanvas, Props } from './sprites'

function makeProp(make: MakeCanvas, w: number, h: number, fn: (p: Ctx2D) => void): HTMLCanvasElement {
  const c = make(w, h)
  const p = c.getContext('2d')
  if (p) fn(p)
  return c
}

const LEAF = ['#122e2866', '#82935e55', '#c2a56e2b', '#64815a99', '#314936b9']

function paintTree(p: Ctx2D): void {
  p.fillStyle = '#030b0c8c'; p.beginPath(); p.ellipse(112, 249, 88, 20, -0.2, 0, TAU); p.fill()
  const trunk = p.createLinearGradient(90, 120, 145, 270)
  trunk.addColorStop(0, '#201e19'); trunk.addColorStop(0.5, '#68523b'); trunk.addColorStop(1, '#2d241e')
  p.fillStyle = trunk
  p.beginPath(); p.moveTo(103, 255); p.bezierCurveTo(119, 210, 91, 154, 121, 120); p.bezierCurveTo(149, 152, 126, 218, 146, 257); p.closePath(); p.fill()
  p.strokeStyle = '#9f83564c'; p.lineWidth = 3
  for (let i = 0; i < 8; i++) {
    const yy = 152 + i * 11
    p.beginPath(); p.moveTo(116, yy); p.lineTo(119 + (i % 3) * 5, yy + 15); p.stroke()
  }
  const foliage = (cx: number, cy: number, rx: number, ry: number, tint: string): void => {
    const gr = p.createRadialGradient(cx - rx * 0.28, cy - ry * 0.37, 1, cx, cy, rx * 1.15)
    gr.addColorStop(0, tint); gr.addColorStop(0.5, '#273b2b'); gr.addColorStop(1, '#0e251f')
    p.fillStyle = gr; p.beginPath(); p.ellipse(cx, cy, rx, ry, 0, 0, TAU); p.fill()
  }
  foliage(81, 127, 64, 52, '#5a6a42'); foliage(158, 122, 58, 55, '#476442'); foliage(119, 82, 68, 56, '#697b50'); foliage(112, 153, 74, 43, '#334e3a')
  for (let n = 0; n < 1100; n++) {
    const cy = n % 4 === 0 ? 81 : n % 4 === 1 ? 127 : n % 4 === 2 ? 156 : 110
    const cx = n % 4 === 0 ? 119 : n % 4 === 1 ? 81 : n % 4 === 2 ? 154 : 109
    const rx = n % 4 === 0 ? 69 : 58
    const ry = n % 4 === 0 ? 54 : 44
    const angle = hash(n, 4) * TAU
    const rad = Math.sqrt(hash(n, 7))
    const x = cx + Math.cos(angle) * rx * rad
    const y = cy + Math.sin(angle) * ry * rad
    p.fillStyle = LEAF[n % 5]!
    p.beginPath(); p.ellipse(x, y, 1.6 + hash(n, 18) * 4.3, 1 + hash(n, 11) * 2.3, -0.5, 0, TAU); p.fill()
  }
  for (let i = 0; i < 32; i++) {
    const a = hash(i, 14) * TAU
    const x = 112 + Math.cos(a) * hash(i, 2) * 73
    const y = 101 + Math.sin(a) * hash(i, 13) * 45
    p.fillStyle = i % 3 ? '#9d9c6250' : '#a7b47430'
    p.fillRect(x, y, 3 + hash(i, 4) * 5, 2)
  }
}

function paintRuin(p: Ctx2D): void {
  p.fillStyle = '#0307098a'; p.beginPath(); p.ellipse(71, 145, 67, 16, 0, 0, TAU); p.fill()
  const blocks = [[36, 109, 87, 30], [47, 89, 67, 25], [53, 65, 56, 25], [58, 40, 46, 27], [49, 23, 67, 17]] as const
  for (const [x, y, w, h] of blocks) {
    p.fillStyle = '#3c4640'; p.fillRect(x + 7, y + 7, w, h)
    const g = p.createLinearGradient(x, y, x + w, y + h)
    g.addColorStop(0, '#a7ab8d'); g.addColorStop(0.4, '#717b70'); g.addColorStop(1, '#313c37')
    p.fillStyle = g; p.fillRect(x, y, w, h)
    p.strokeStyle = '#202927'; p.lineWidth = 2; p.strokeRect(x, y, w, h)
    p.fillStyle = '#e0c6a827'; p.fillRect(x + 3, y + 3, w - 12, 4)
  }
  for (let z = 0; z < 240; z++) {
    const px = 49 + hash(z, 34) * 67
    const py = 26 + hash(z, 88) * 112
    p.fillStyle = z % 3 ? '#191f1d37' : '#c8bba334'
    p.fillRect(px, py, 1 + hash(z, 27) * 3, 1 + hash(z, 31) * 2)
  }
  p.strokeStyle = '#172d20'; p.lineWidth = 3
  p.beginPath(); p.moveTo(58, 21); p.bezierCurveTo(35, 70, 78, 104, 52, 137); p.stroke()
  p.fillStyle = '#71925d'
  for (let i = 0; i < 11; i++) {
    p.beginPath(); p.ellipse(61 + i * 6, 89 + Math.sin(i) * 30, 4, 2, i, 0, TAU); p.fill()
  }
}

function paintCrystal(p: Ctx2D): void {
  p.shadowColor = '#6af5db'; p.shadowBlur = 18; p.fillStyle = '#81e8df48'
  p.beginPath(); p.ellipse(62, 118, 35, 10, 0, 0, TAU); p.fill(); p.shadowBlur = 0
  const facets = [[37, 113, 50, 46], [66, 117, 66, 26], [80, 112, 89, 61]] as const
  facets.forEach(([x, y, tx, ty], i) => {
    p.fillStyle = i === 1 ? '#377e87' : '#3e8e9c'
    p.beginPath(); p.moveTo(x, y); p.lineTo(tx, ty); p.lineTo(x + 11, y - 5); p.closePath(); p.fill()
    p.fillStyle = '#9cf1e27a'
    p.beginPath(); p.moveTo(x, y); p.lineTo(tx, ty); p.lineTo(x + 4, y - 11); p.closePath(); p.fill()
  })
}

/** Original `props`: detailed world props cached as off-screen sprites (cost paid once on startup). */
export function buildProps(make: MakeCanvas): Props {
  return {
    tree: makeProp(make, 230, 280, paintTree),
    ruin: makeProp(make, 148, 173, paintRuin),
    crystal: makeProp(make, 120, 140, paintCrystal),
  }
}
