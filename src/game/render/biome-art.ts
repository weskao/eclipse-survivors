import { TAU } from '../constants'
import { hash } from '../math'
import { biomePalette } from '../world'
import type { Ctx2D } from './ctx'
import type { MakeCanvas } from './sprites'

export interface BiomeArt { tile: HTMLCanvasElement; landmark: HTMLCanvasElement }

function oval(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill()
}

/** Four distinctive pre-rendered tiles and landmarks, built once rather than per frame. */
export function buildBiomeArt(make: MakeCanvas): BiomeArt[] {
  return biomePalette.map((palette, biome) => {
    const tile = make(384, 384)
    const p = tile.getContext('2d')
    if (p) {
      const base = p.createLinearGradient(0, 0, 384, 384)
      base.addColorStop(0, palette.ground)
      base.addColorStop(1, ['#172f27', '#101e2e', '#304758', '#170e16'][biome]!)
      p.fillStyle = base; p.fillRect(0, 0, 384, 384)
      for (let i = 0; i < 105; i++) {
        const x = hash(i, biome * 13 + 4) * 384
        const y = hash(i + 61, biome * 11 + 27) * 384
        if (biome === 0) {
          oval(p, x, y, 11 + hash(i, 17) * 20, 4 + hash(i, 18) * 9, i % 4 ? '#69806124' : '#b6c28b28')
          p.strokeStyle = '#a8c48b33'; p.lineWidth = 1
          p.beginPath(); p.moveTo(x, y); p.lineTo(x - 5, y - 10); p.stroke()
        } else if (biome === 1) {
          oval(p, x, y, 13 + hash(i, 17) * 19, 3 + hash(i, 18) * 5, '#7cb7c31c')
          p.strokeStyle = '#96bde829'; p.lineWidth = 1
          p.beginPath(); p.ellipse(x, y, 7, 2, 0, 0, TAU); p.stroke()
        } else if (biome === 2) {
          oval(p, x, y, 2 + hash(i, 17) * 3, 1.5, '#d9f4ff81')
          p.strokeStyle = '#c7e6f72e'; p.lineWidth = 2
          p.beginPath(); p.moveTo(x - 9, y); p.lineTo(x + 12, y - 8); p.stroke()
        } else {
          oval(p, x, y, 7 + hash(i, 18) * 16, 3, '#100c13aa')
          p.strokeStyle = i % 4 ? '#d1502a68' : '#ff9c4757'; p.lineWidth = i % 4 ? 2 : 4
          p.beginPath(); p.moveTo(x - 12, y); p.lineTo(x + 2, y + 7); p.lineTo(x + 15, y - 2); p.stroke()
        }
      }
      for (let x = 0; x < 384; x += 96) for (let y = 0; y < 384; y += 96) {
        p.strokeStyle = ['#cab88e19', '#7ea4bd2e', '#cceeff20', '#0a090c60'][biome]!
        p.lineWidth = 2
        p.strokeRect(x + 5, y + 5, 86, 86)
      }
    }

    const landmark = make(144, 176)
    const q = landmark.getContext('2d')
    if (q) {
      oval(q, 72, 157, 59, 11, '#03090d86')
      if (biome === 0) {
        q.fillStyle = '#5d675b'
        q.fillRect(42, 54, 17, 98); q.fillRect(87, 61, 16, 91)
        q.fillStyle = '#c9c0a080'; q.fillRect(40, 52, 21, 8); q.fillRect(84, 58, 23, 8)
        q.strokeStyle = '#8d9d73'; q.lineWidth = 12
        q.beginPath(); q.moveTo(53, 67); q.bezierCurveTo(51, 18, 116, 13, 96, 72); q.stroke()
        for (let n = 0; n < 9; n++) oval(q, 34 + hash(n, 4) * 80, 18 + hash(n, 8) * 66, 20, 13, n % 2 ? '#3c6653' : '#658568')
      } else if (biome === 1) {
        q.fillStyle = '#40576a'
        q.beginPath(); q.moveTo(37, 149); q.lineTo(46, 40); q.lineTo(70, 13); q.lineTo(98, 44); q.lineTo(108, 149); q.closePath(); q.fill()
        q.strokeStyle = '#90d3ee'; q.lineWidth = 3
        q.beginPath(); q.moveTo(70, 18); q.lineTo(61, 78); q.lineTo(82, 90); q.lineTo(66, 139); q.stroke()
        oval(q, 72, 94, 22, 7, '#88d8ff58')
      } else if (biome === 2) {
        const blades: [number, number, number][] = [[37, 140, 24], [75, 149, 45], [105, 146, 28]]
        for (const [x, baseY, width] of blades) {
          q.fillStyle = '#a1d7e6bb'
          q.beginPath(); q.moveTo(x - width / 2, baseY); q.lineTo(x, 24 + (x % 13) * 3)
          q.lineTo(x + width / 2, baseY); q.closePath(); q.fill()
          q.strokeStyle = '#effbffcc'; q.lineWidth = 2; q.stroke()
        }
        oval(q, 72, 143, 44, 9, '#dff5ff55')
      } else {
        q.fillStyle = '#29262c'
        q.beginPath(); q.moveTo(30, 152); q.lineTo(36, 70); q.lineTo(58, 48); q.lineTo(64, 95)
        q.lineTo(85, 20); q.lineTo(111, 83); q.lineTo(108, 152); q.closePath(); q.fill()
        q.strokeStyle = '#ee794a'; q.lineWidth = 3
        q.beginPath(); q.moveTo(85, 24); q.lineTo(72, 97); q.lineTo(93, 138); q.stroke()
        oval(q, 70, 148, 44, 7, '#f65c2f33')
      }
    }
    return { tile, landmark }
  })
}
